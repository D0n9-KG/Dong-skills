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
  ".codex/hooks/launch-project-ops.mjs",
  "scripts/context-recovery-eval.mjs"
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

export function hookSessionKey(input = {}) {
  for (const key of [
    "session_id",
    "sessionId",
    "thread_id",
    "threadId",
    "conversation_id",
    "conversationId",
    "transcript_path",
    "transcriptPath"
  ]) {
    const value = String(input?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export function scopedRuntimeReceiptName(base, scope = "") {
  return scope
    ? `${base}-${stableFingerprint(String(scope)).slice(0, 16)}`
    : base;
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

export function writeRuntimeReceipt(ctx, name, value) {
  return withRuntimeReceiptLock(ctx, name, (file) => {
    writeTextAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
    return file;
  });
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

export function removeRuntimeReceipt(ctx, name, options = {}) {
  try {
    withRuntimeReceiptLock(ctx, name, (file) => {
      fs.rmSync(file, { force: true });
    });
    return { ok: true, error: "" };
  } catch (error) {
    if (options.required) throw error;
    return { ok: false, error: error.message };
  }
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

export function writeRecoveryReceipt(root, ctx, state, sessionKey = "") {
  return writeRuntimeReceipt(ctx, scopedRuntimeReceiptName("recovery", sessionKey), {
    schema: "dong-skills.recovery-receipt.v1",
    task_id: state.task_id,
    task_generation: String(state.task_generation),
    handoff_hash: state.handoff_hash,
    runtime_hash: hookRuntimeHash(root),
    session_key_hash: sessionKey ? stableFingerprint(String(sessionKey)) : "",
    acknowledged_at: new Date().toISOString()
  });
}

export function removeRecoveryReceipt(ctx, sessionKey = "", options = {}) {
  return removeRuntimeReceipt(ctx, scopedRuntimeReceiptName("recovery", sessionKey), options);
}

function hasScopedRecoveryReceipt(ctx) {
  const dir = runtimeDirectory(ctx);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((name) => /^recovery-[a-f0-9]{16}\.json$/i.test(name));
}

export function recoveryReceiptStatus(root, ctx, state, sessionKey = "") {
  let receipt = readRuntimeReceipt(ctx, scopedRuntimeReceiptName("recovery", sessionKey));
  let fallbackToUnscoped = false;
  if (!receipt.ok) {
    return {
      ok: false,
      reason: `context recovery receipt is invalid: ${receipt.error}`
    };
  }
  if (!receipt.exists) {
    const unscoped = sessionKey ? readRuntimeReceipt(ctx, scopedRuntimeReceiptName("recovery", "")) : receipt;
    if (!sessionKey || !unscoped.ok || !unscoped.exists || hasScopedRecoveryReceipt(ctx)) {
      return {
        ok: false,
        reason: "context recovery has not been acknowledged in this session"
      };
    }
    receipt = unscoped;
    fallbackToUnscoped = true;
  }

  const value = receipt.value || {};
  if (value.task_id !== state.task_id ||
      String(value.task_generation) !== String(state.task_generation)) {
    return {
      ok: false,
      reason: "context recovery receipt task identity does not match the active task"
    };
  }
  if (sessionKey && value.session_key_hash !== stableFingerprint(String(sessionKey))) {
    if (!fallbackToUnscoped || value.session_key_hash) {
      return {
        ok: false,
        reason: "context recovery receipt belongs to a different session"
      };
    }
  }
  if (!state.handoff_hash || state.handoff_hash === "null" || value.handoff_hash !== state.handoff_hash) {
    return {
      ok: false,
      reason: "context recovery receipt handoff hash is stale"
    };
  }
  if (value.runtime_hash !== hookRuntimeHash(root)) {
    return {
      ok: false,
      reason: "context recovery receipt runtime hash is stale"
    };
  }
  return { ok: true, reason: "" };
}

export function writeDecisionReceipt(root, ctx, state, sessionKey, decision, allowedEvents, evidenceHash) {
  return writeRuntimeReceipt(ctx, scopedRuntimeReceiptName("decision", sessionKey), {
    schema: "dong-skills.user-decision-receipt.v1",
    task_id: state.task_id,
    task_generation: String(state.task_generation),
    decision,
    allowed_events: [...new Set((allowedEvents || []).map(String).filter(Boolean))].sort(),
    evidence_hash: evidenceHash,
    runtime_hash: hookRuntimeHash(root),
    session_key_hash: sessionKey ? stableFingerprint(String(sessionKey)) : "",
    acknowledged_at: new Date().toISOString()
  });
}

export function removeDecisionReceipt(ctx, sessionKey = "", options = {}) {
  return removeRuntimeReceipt(ctx, scopedRuntimeReceiptName("decision", sessionKey), options);
}

export function decisionReceiptStatus(root, ctx, state, sessionKey, decision, event, evidenceHash) {
  const receipt = readRuntimeReceipt(ctx, scopedRuntimeReceiptName("decision", sessionKey));
  if (!receipt.ok) {
    return { ok: false, reason: `user decision receipt is invalid: ${receipt.error}` };
  }
  if (!receipt.exists) {
    return { ok: false, reason: "user decision receipt is missing for this session" };
  }
  const value = receipt.value || {};
  if (value.schema !== "dong-skills.user-decision-receipt.v1") {
    return { ok: false, reason: "user decision receipt schema is unsupported" };
  }
  if (value.task_id !== state.task_id ||
      String(value.task_generation) !== String(state.task_generation)) {
    return { ok: false, reason: "user decision receipt belongs to a different task" };
  }
  if (value.decision !== decision) {
    return { ok: false, reason: `user decision receipt is for ${value.decision || "unknown"}, not ${decision}` };
  }
  if (!Array.isArray(value.allowed_events) || !value.allowed_events.includes(event)) {
    return { ok: false, reason: `user decision receipt does not authorize transition ${event}` };
  }
  if (value.evidence_hash !== evidenceHash) {
    return { ok: false, reason: "user decision receipt evidence changed after approval" };
  }
  if (sessionKey && value.session_key_hash !== stableFingerprint(String(sessionKey))) {
    return { ok: false, reason: "user decision receipt belongs to a different session" };
  }
  if (value.runtime_hash !== hookRuntimeHash(root)) {
    return { ok: false, reason: "user decision receipt runtime hash is stale" };
  }
  return { ok: true, reason: "" };
}

export function writeAdvanceDecisionReceipt(root, ctx, state, decision, allowedEvents) {
  const currentGeneration = Number(state.task_generation);
  if (!Number.isSafeInteger(currentGeneration) || currentGeneration < 1) {
    throw new Error("Cannot record advance decision receipt without a valid task generation");
  }
  const pendingNewTask = state.phase === "complete";
  return writeRuntimeReceipt(ctx, scopedRuntimeReceiptName("advance-decision", decision), {
    schema: "dong-skills.advance-decision-receipt.v1",
    task_id: pendingNewTask ? "" : state.task_id,
    task_generation: String(pendingNewTask ? currentGeneration + 1 : currentGeneration),
    decision,
    allowed_events: [...new Set((allowedEvents || []).map(String).filter(Boolean))].sort(),
    runtime_hash: hookRuntimeHash(root),
    acknowledged_at: new Date().toISOString()
  });
}

export function removeAdvanceDecisionReceipt(ctx, decision, options = {}) {
  return removeRuntimeReceipt(ctx, scopedRuntimeReceiptName("advance-decision", decision), options);
}

export function advanceDecisionReceiptStatus(root, ctx, state, decision, event) {
  const receipt = readRuntimeReceipt(ctx, scopedRuntimeReceiptName("advance-decision", decision));
  if (!receipt.ok) {
    return { ok: false, reason: `advance user decision receipt is invalid: ${receipt.error}` };
  }
  if (!receipt.exists) {
    return { ok: false, reason: "advance user decision receipt is missing" };
  }
  const value = receipt.value || {};
  if (value.schema !== "dong-skills.advance-decision-receipt.v1") {
    return { ok: false, reason: "advance user decision receipt schema is unsupported" };
  }
  if (String(value.task_generation) !== String(state.task_generation) ||
      (value.task_id && value.task_id !== state.task_id)) {
    return { ok: false, reason: "advance user decision receipt belongs to a different task" };
  }
  if (value.decision !== decision) {
    return { ok: false, reason: `advance user decision receipt is for ${value.decision || "unknown"}, not ${decision}` };
  }
  if (!Array.isArray(value.allowed_events) || !value.allowed_events.includes(event)) {
    return { ok: false, reason: `advance user decision receipt does not authorize transition ${event}` };
  }
  if (value.runtime_hash !== hookRuntimeHash(root)) {
    return { ok: false, reason: "advance user decision receipt runtime hash is stale" };
  }
  return { ok: true, reason: "" };
}

export function writeHookLiveness(root, ctx, eventName) {
  return updateRuntimeReceipt(ctx, "liveness", (previous) => {
    const runtimeHash = hookRuntimeHash(root);
    const value = previous.ok &&
      previous.value &&
      previous.value.runtime_hash === runtimeHash
      ? previous.value
      : {};
    const now = new Date().toISOString();
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
