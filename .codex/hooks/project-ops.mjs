#!/usr/bin/env node
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
import { ensureContext } from "../scripts/lib/templates.mjs";

function parseRootArg(argv, fallback) {
  return argv[3] && !argv[3].startsWith("--") ? argv[3] : fallback;
}

function parseExtraArgs(argv, fallbackRoot) {
  const rootArg = parseRootArg(argv, fallbackRoot);
  return rootArg === fallbackRoot ? argv.slice(3) : argv.slice(4);
}

const cliMode = process.argv[2];

if (cliMode === "context-budget") {
  const root = gitRoot(parseRootArg(process.argv, process.cwd()));
  process.stdout.write(`${contextBudget(root)}\n`);
  process.exit(0);
}

if (cliMode === "learning-status") {
  const root = gitRoot(parseRootArg(process.argv, process.cwd()));
  const ctx = ensureContext(root);
  process.stdout.write(`${learningStatusText(root, ctx)}\n`);
  process.exit(0);
}

if (cliMode && cliMode.startsWith("instinct-")) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd()));
  const command = cliMode.replace(/^instinct-/, "");
  const mapped = command === "promotion" ? "promotion-candidates" : command;
  runInstinctCommand(root, mapped, parseExtraArgs(process.argv, process.cwd()), import.meta.url);
  process.exit(0);
}

if (cliMode && cliMode.startsWith("solution-")) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd()));
  const command = cliMode.replace(/^solution-/, "");
  runProjectOpsScript(root, "solutions.mjs", [command, ...parseExtraArgs(process.argv, process.cwd())], import.meta.url);
  process.exit(0);
}

if (cliMode === "session-history") {
  const root = gitRoot(process.cwd());
  runProjectOpsScript(root, "session-history.mjs", process.argv.slice(3), import.meta.url);
  process.exit(0);
}

const projectOpsScripts = {
  "health-check": "project-ops-health.mjs",
  "release-check": "release-check.mjs",
  "state-prune": "state-prune.mjs"
};

if (Object.hasOwn(projectOpsScripts, cliMode)) {
  const root = gitRoot(parseRootArg(process.argv, process.cwd()));
  runProjectOpsScript(root, projectOpsScripts[cliMode], parseExtraArgs(process.argv, process.cwd()), import.meta.url);
  process.exit(0);
}

const input = readStdinJson();
const cwd = input.cwd || process.cwd();
const root = gitRoot(cwd);
const ctx = ensureContext(root);

switch (input.hook_event_name) {
  case "SessionStart":
    sessionStart(root, ctx);
    break;
  case "UserPromptSubmit":
    userPromptSubmit(input, root, ctx);
    break;
  case "PostToolUse":
    postToolUse(root, ctx);
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
