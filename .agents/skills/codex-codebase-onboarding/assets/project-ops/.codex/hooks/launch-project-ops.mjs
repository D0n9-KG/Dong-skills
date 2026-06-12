#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parseInput(input) {
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function gitRoot(cwd) {
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return path.resolve(cwd);
  }
}

const input = fs.readFileSync(0, "utf8");
const parsed = parseInput(input);
const cwd = parsed.cwd || process.cwd();
const root = gitRoot(cwd);
const localHook = path.join(path.dirname(fileURLToPath(import.meta.url)), "project-ops.mjs");
const rootHook = path.join(root, ".codex", "hooks", "project-ops.mjs");
const hook = fs.existsSync(rootHook) ? rootHook : localHook;

const result = spawnSync(process.execPath, [hook], {
  cwd: root,
  input,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"]
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 0);
