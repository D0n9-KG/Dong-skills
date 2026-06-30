#!/usr/bin/env node
import path from "node:path";
import { contextBudget } from "../scripts/lib/budget.mjs";
import { runInstinctCommand, runProjectOpsScript } from "../scripts/lib/cli.mjs";
import { gitRoot, readStdinJson } from "../scripts/lib/core.mjs";
import {
  postCompact,
  postToolUse,
  preCompact,
  sessionStart,
  stop,
  userPromptSubmit
} from "../scripts/lib/events.mjs";
import { learningStatusText } from "../scripts/lib/learning.mjs";

const ROOTLESS_FIRST_ARGS = {
  "session-history": new Set(["scan", "help", "--help", "-h"]),
  "skill-evolution": new Set(["status", "collect-candidates", "dry-run", "run", "inspect-stage", "adopt", "help", "--help", "-h"]),
  "workflow-state": new Set([
    "init",
    "status",
    "get",
    "set",
    "transition",
    "check",
    "next",
    "recover",
    "hash",
    "help",
    "--help",
    "-h"
  ])
};

function parseCliArgs(argv, fallback, mode) {
  const candidate = argv[3];
  const rootless = !candidate ||
    candidate.startsWith("--") ||
    Boolean(ROOTLESS_FIRST_ARGS[mode]?.has(candidate));

  return rootless
    ? { rootArg: fallback, extraArgs: argv.slice(3) }
    : { rootArg: candidate, extraArgs: argv.slice(4) };
}

function parseRootArg(argv, fallback, mode) {
  return parseCliArgs(argv, fallback, mode).rootArg;
}

function parseExtraArgs(argv, fallbackRoot, mode) {
  return parseCliArgs(argv, fallbackRoot, mode).extraArgs;
}

const cliMode = process.argv[2];

if (cliMode === "context-budget") {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  process.stdout.write(`${contextBudget(root)}\n`);
  process.exit(0);
}

if (cliMode === "learning-status") {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  const ctx = path.join(root, ".codex-context");
  process.stdout.write(`${learningStatusText(root, ctx)}\n`);
  process.exit(0);
}

if (cliMode && cliMode.startsWith("instinct-")) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  const command = cliMode.replace(/^instinct-/, "");
  const mapped = command === "promotion" ? "promotion-candidates" : command;
  runInstinctCommand(root, mapped, parseExtraArgs(process.argv, process.cwd(), cliMode), import.meta.url);
  process.exit(0);
}

if (cliMode && cliMode.startsWith("solution-")) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  const command = cliMode.replace(/^solution-/, "");
  runProjectOpsScript(root, "solutions.mjs", [command, ...parseExtraArgs(process.argv, process.cwd(), cliMode)], import.meta.url);
  process.exit(0);
}

if (cliMode === "session-history") {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  runProjectOpsScript(root, "session-history.mjs", parseExtraArgs(process.argv, process.cwd(), cliMode), import.meta.url);
  process.exit(0);
}

const projectOpsScripts = {
  "asset-governance": "asset-governance.mjs",
  "health-check": "project-ops-health.mjs",
  "release-check": "release-check.mjs",
  "skill-evolution": "skill-evolution.mjs",
  "state-prune": "state-prune.mjs",
  "workflow-state": "workflow-state.mjs"
};

if (Object.hasOwn(projectOpsScripts, cliMode)) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd(), cliMode));
  runProjectOpsScript(root, projectOpsScripts[cliMode], parseExtraArgs(process.argv, process.cwd(), cliMode), import.meta.url);
  process.exit(0);
}

const input = readStdinJson();
const cwd = input.cwd || process.cwd();
const root = gitRoot(cwd);
const ctx = path.join(root, ".codex-context");

switch (input.hook_event_name) {
  case "SessionStart":
    sessionStart(root, ctx);
    break;
  case "UserPromptSubmit":
    userPromptSubmit(input, root, ctx);
    break;
  case "PostToolUse":
    postToolUse(input, root, ctx);
    break;
  case "PreCompact":
    preCompact(input, root, ctx);
    break;
  case "PostCompact":
    postCompact(root, ctx);
    break;
  case "Stop":
    stop(input, root, ctx);
    break;
  default:
    break;
}
