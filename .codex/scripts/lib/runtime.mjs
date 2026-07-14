import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { writeTextAtomic } from "./core.mjs";

const RUNTIME_DIR = path.join("raw", "project-ops-runtime");
const DEFAULT_LIVENESS_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RUNTIME_LOCK_TIMEOUT_MS = 2_000;
const RUNTIME_LOCK_STALE_MS = 30_000;
const RUNTIME_LOCK_RETRY_MS = 10;
const RUNTIME_LOCK_CLEANUP_TIMEOUT_MS = 500;
const RUNTIME_HASH_ENTRY_FILES = [
  ".codex/hooks.json",
  ".codex/hooks/project-ops.mjs",
  ".codex/hooks/launch-project-ops.mjs"
];

function runtimeDirectory(ctx) {
  return path.join(ctx, RUNTIME_DIR);
}

function receiptPath(ctx, name) {
  if (!/^[a-z0-9-]+$/i.test(name)) {
    throw new Error(`Invalid runtime receipt name: ${name}`);
  }
  return path.join(runtimeDirectory(ctx), `${name}.json`);
}

function readRuntimeReceiptFile(file) {
  if (!fs.existsSync(file)) {
    return { ok: true, exists: false, file, value: null, error: "" };
  }
  try {
    return {
      ok: true,
      exists: true,
      file,
      value: JSON.parse(fs.readFileSync(file, "utf8")),
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      exists: true,
      file,
      value: null,
      error: error.message
    };
  }
}

function waitForRuntimeLock() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RUNTIME_LOCK_RETRY_MS);
}

function transientRuntimeLockError(error) {
  return ["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(error?.code);
}

function removeRuntimeLockFile(lockFile) {
  const deadline = Date.now() + RUNTIME_LOCK_CLEANUP_TIMEOUT_MS;
  while (true) {
    try {
      fs.rmSync(lockFile, { force: true });
      return;
    } catch (error) {
      if (error.code === "ENOENT") return;
      if (!transientRuntimeLockError(error) || Date.now() >= deadline) throw error;
      waitForRuntimeLock();
    }
  }
}

function withRuntimeReceiptLock(ctx, name, operation) {
  const file = receiptPath(ctx, name);
  const lockFile = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + RUNTIME_LOCK_TIMEOUT_MS;
  let handle = null;

  while (handle === null) {
    try {
      handle = fs.openSync(lockFile, "wx");
      fs.writeFileSync(handle, `${process.pid} ${new Date().toISOString()}\n`, "utf8");
    } catch (error) {
      if (handle !== null) {
        try {
          fs.closeSync(handle);
        } finally {
          handle = null;
          removeRuntimeLockFile(lockFile);
        }
        throw error;
      }
      if (!transientRuntimeLockError(error)) throw error;
      try {
        const ageMs = Date.now() - fs.statSync(lockFile).mtimeMs;
        if (ageMs > RUNTIME_LOCK_STALE_MS) {
          removeRuntimeLockFile(lockFile);
          continue;
        }
      } catch (statError) {
        if (statError.code === "ENOENT") {
          if (Date.now() >= deadline) {
            throw new Error(`Timed out waiting for runtime receipt lock: ${name}`);
          }
          waitForRuntimeLock();
          continue;
        }
        if (transientRuntimeLockError(statError)) {
          if (Date.now() >= deadline) {
            throw new Error(`Timed out waiting for runtime receipt lock: ${name}`);
          }
          waitForRuntimeLock();
          continue;
        }
        throw statError;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for runtime receipt lock: ${name}`);
      }
      waitForRuntimeLock();
    }
  }

  try {
    return operation(file);
  } finally {
    try {
      fs.closeSync(handle);
    } finally {
      removeRuntimeLockFile(lockFile);
    }
  }
}

export function withRuntimeLock(ctx, name, operation) {
  if (typeof operation !== "function") {
    throw new Error("Runtime lock requires a function");
  }
  return withRuntimeReceiptLock(ctx, name, () => operation());
}

export function readRuntimeReceipt(ctx, name) {
  return readRuntimeReceiptFile(receiptPath(ctx, name));
}

export function updateRuntimeReceipt(ctx, name, update) {
  if (typeof update !== "function") {
    throw new Error("Runtime receipt update requires a function");
  }
  return withRuntimeReceiptLock(ctx, name, (file) => {
    const nextValue = update(readRuntimeReceiptFile(file));
    writeTextAtomic(file, `${JSON.stringify(nextValue, null, 2)}\n`);
    return nextValue;
  });
}

export function stableFingerprint(value) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function runtimeHashFiles(root) {
  const libraryRoot = path.join(root, ".codex", "scripts", "lib");
  const libraryFiles = fs.existsSync(libraryRoot)
    ? fs.readdirSync(libraryRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
      .map((entry) => `.codex/scripts/lib/${entry.name}`)
    : [];
  return [...new Set([...RUNTIME_HASH_ENTRY_FILES, ...libraryFiles])].sort();
}

export function hookRuntimeHash(root) {
  const entries = runtimeHashFiles(root).map((name) => {
    const file = path.join(root, name);
    return {
      name,
      hash: fs.existsSync(file)
        ? createHash("sha256").update(fs.readFileSync(file)).digest("hex")
        : "missing"
    };
  });
  return stableFingerprint(entries);
}

export function writeHookLiveness(root, ctx, eventName, options = {}) {
  return updateRuntimeReceipt(ctx, "liveness", (previous) => {
    const runtimeHash = hookRuntimeHash(root);
    const value = previous.ok &&
      previous.value &&
      previous.value.runtime_hash === runtimeHash
      ? previous.value
      : {};
    const now = new Date().toISOString();
    const previousEventAt = Date.parse(value.events?.[String(eventName || "unknown")] || "");
    const minIntervalMs = Number(options.minIntervalMs || 0);
    if (minIntervalMs > 0 && Number.isFinite(previousEventAt) && Date.now() - previousEventAt < minIntervalMs) {
      return value;
    }
    const events = {
      ...(value.events && typeof value.events === "object" ? value.events : {}),
      [String(eventName || "unknown")]: now
    };
    return {
      schema: "dong-skills.hook-liveness.v1",
      runtime_hash: runtimeHash,
      last_event: String(eventName || "unknown"),
      last_seen_at: now,
      events
    };
  });
}

export function hookLivenessStatus(root, ctx, options = {}) {
  const requiredEvents = Array.isArray(options.requiredEvents)
    ? options.requiredEvents.map((event) => String(event)).filter(Boolean)
    : [];
  const receipt = readRuntimeReceipt(ctx, "liveness");
  if (!receipt.ok) {
    return {
      status: "invalid",
      recent: false,
      lastEvent: "unknown",
      lastSeenAt: "",
      events: {},
      missingEvents: requiredEvents,
      detail: receipt.error
    };
  }
  if (!receipt.exists) {
    return {
      status: "missing",
      recent: false,
      lastEvent: "none",
      lastSeenAt: "",
      events: {},
      missingEvents: requiredEvents,
      detail: "no hook execution receipt found"
    };
  }

  const value = receipt.value || {};
  if (value.runtime_hash !== hookRuntimeHash(root)) {
    return {
      status: "runtime-mismatch",
      recent: false,
      lastEvent: value.last_event || "unknown",
      lastSeenAt: value.last_seen_at || "",
      events: value.events && typeof value.events === "object" ? value.events : {},
      missingEvents: requiredEvents,
      detail: "liveness receipt belongs to a different hook runtime"
    };
  }

  const timestamp = Date.parse(value.last_seen_at || "");
  const maxAgeMs = Number(options.maxAgeMs || DEFAULT_LIVENESS_MAX_AGE_MS);
  const now = Date.now();
  const ageMs = Number.isFinite(timestamp) ? now - timestamp : Number.POSITIVE_INFINITY;
  const events = value.events && typeof value.events === "object" ? value.events : {};
  const missingEvents = requiredEvents.filter((event) => {
    const eventTimestamp = Date.parse(events[event] || "");
    if (!Number.isFinite(eventTimestamp)) return true;
    return now - eventTimestamp > maxAgeMs;
  });
  return {
    status: ageMs <= maxAgeMs ? "recent" : "stale",
    recent: ageMs <= maxAgeMs,
    lastEvent: value.last_event || "unknown",
    lastSeenAt: value.last_seen_at || "",
    events,
    missingEvents,
    detail: Number.isFinite(ageMs) ? `age_ms=${Math.max(0, ageMs)}` : "invalid timestamp"
  };
}
