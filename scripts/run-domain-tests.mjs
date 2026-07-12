#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domainsDir = path.join(root, "tests", "domains");
const files = fs.existsSync(domainsDir)
  ? fs.readdirSync(domainsDir)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join(domainsDir, name))
  : [];

if (files.length === 0) {
  throw new Error("No domain test files found under tests/domains.");
}

const owners = new Map();
for (const file of files) {
  const names = [...fs.readFileSync(file, "utf8").matchAll(/^test\("([^"]+)"/gm)]
    .map((match) => match[1]);
  if (names.length === 0) {
    throw new Error(`Domain test file contains no tests: ${path.relative(root, file)}`);
  }
  for (const name of names) {
    if (owners.has(name)) {
      throw new Error(`Test belongs to multiple domains: ${name} (${owners.get(name)}, ${path.basename(file)})`);
    }
    owners.set(name, path.basename(file));
  }
}

const requestedConcurrency = Number.parseInt(process.env.DONG_TEST_CONCURRENCY || "", 10);
const concurrency = Math.max(
  1,
  Math.min(
    files.length,
    Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
      ? requestedConcurrency
      : Math.min(4, os.availableParallelism())
  )
);

const requestedTimeoutMs = Number.parseInt(process.env.DONG_DOMAIN_TEST_TIMEOUT_MS || "", 10);
const domainTimeoutMs = Number.isFinite(requestedTimeoutMs) && requestedTimeoutMs > 0
  ? requestedTimeoutMs
  : 300_000;

function labelFor(file) {
  return path.basename(file, ".test.mjs");
}

function runDomain(file) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const label = labelFor(file);
    process.stdout.write(`[domain-test] start ${label}\n`);
    const child = spawn(process.execPath, ["--test", file], {
      cwd: root,
      env: { ...process.env, TMPDIR: os.tmpdir(), DONG_DOMAIN_TEST_ACTIVE: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let resolved = false;
    let timedOut = false;
    let forceCloseTimer = null;

    function finish(result) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      if (forceCloseTimer) clearTimeout(forceCloseTimer);
      process.stdout.write(
        `[domain-test] done ${label} status=${result.status} duration=${(result.durationMs / 1000).toFixed(1)}s\n`
      );
      resolve(result);
    }

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      stderr += `\nDomain test timed out after ${domainTimeoutMs}ms.\n`;
      process.stderr.write(`[domain-test] timeout ${label} after ${(domainTimeoutMs / 1000).toFixed(1)}s; terminating\n`);
      child.kill();
      forceCloseTimer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({
          file,
          status: 1,
          signal: "timeout",
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          timedOut
        });
      }, 5_000);
      forceCloseTimer.unref?.();
    }, domainTimeoutMs);
    timeoutTimer.unref?.();

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      stderr += `\nFailed to start domain test: ${error.message}\n`;
      finish({
        file,
        status: 1,
        signal: "error",
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut
      });
    });
    child.on("close", (status, signal) => {
      finish({
        file,
        status: timedOut ? 1 : status ?? 1,
        signal: timedOut ? "timeout" : signal,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut
      });
    });
  });
}

const results = [];
let nextIndex = 0;

async function worker() {
  while (nextIndex < files.length) {
    const index = nextIndex;
    nextIndex += 1;
    results[index] = await runDomain(files[index]);
  }
}

const startedAt = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));

for (const result of results) {
  const label = labelFor(result.file);
  process.stdout.write(`\n=== ${label} (${(result.durationMs / 1000).toFixed(1)}s) ===\n`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.signal) process.stderr.write(`Terminated by signal ${result.signal}\n`);
}

const failed = results.filter((result) => result.status !== 0);
process.stdout.write(
  `\nDomain test summary: ${owners.size} tests across ${files.length} domains, concurrency ${concurrency}, ` +
  `per-domain timeout ${(domainTimeoutMs / 1000).toFixed(1)}s, ${((Date.now() - startedAt) / 1000).toFixed(1)}s elapsed.\n`
);
if (failed.length > 0) {
  process.stderr.write(`Failed domains: ${failed.map((result) => path.basename(result.file)).join(", ")}\n`);
  process.exitCode = 1;
}
