#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

function gitRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return path.resolve(cwd);
  }
}

function parseArgs(argv) {
  const maybeRoot = argv[0] && !argv[0].startsWith("--") ? argv[0] : process.cwd();
  const root = gitRoot(maybeRoot);
  const rest = argv[0] && !argv[0].startsWith("--") ? argv.slice(1) : argv;
  return { root, command: rest[0] || "status", args: rest.slice(1) };
}

async function loadWorkflowLib() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(scriptDir, "lib", "workflow.mjs"),
    path.resolve(scriptDir, "..", ".codex", "scripts", "lib", "workflow.mjs")
  ];
  const lib = candidates.find((file) => fs.existsSync(file));
  if (!lib) throw new Error("Cannot find Dong Skills workflow runtime library. Reinstall project ops assets.");
  return import(pathToFileURL(lib).href);
}

function usage() {
  return [
    "Usage: workflow-state.mjs <root> <command> [args]",
    "",
    "Commands:",
    "  init",
    "  status",
    "  get <field>",
    "  set <field> <value>",
    "  transition <event>",
    "  check [phase]",
    "  next",
    "  recover",
    "  hash [--write]"
  ].join("\n");
}

function printNext(next) {
  console.log(`NEXT: ${next.next}`);
  if (next.skill && next.skill !== "none") console.log(`SKILL: ${next.skill}`);
  if (next.hint) console.log(`HINT: ${next.hint}`);
}

const { root, command, args } = parseArgs(process.argv.slice(2));
const ctx = path.join(root, ".codex-context");
const workflow = await loadWorkflowLib();

try {
  switch (command) {
    case "init": {
      const file = workflow.ensureWorkflowState(root, ctx);
      console.log(`Initialized workflow state: ${path.relative(root, file).replace(/\\/g, "/")}`);
      break;
    }
    case "status": {
      const status = workflow.workflowStatus(root, ctx);
      console.log(status.summary);
      process.exitCode = status.ok ? 0 : 1;
      break;
    }
    case "get": {
      const field = args[0];
      if (!field) throw new Error("get requires a field name");
      const state = workflow.loadWorkflowState(root, ctx);
      console.log(state[field] || "");
      break;
    }
    case "set": {
      const [field, value] = args;
      if (!field || value === undefined) throw new Error("set requires <field> <value>");
      const state = workflow.loadWorkflowState(root, ctx);
      const next = { ...state, [field]: value, note: `Manually set ${field}` };
      const validation = workflow.validateWorkflowState(next);
      if (!validation.ok) throw new Error(validation.issues.join("; "));
      workflow.saveWorkflowState(root, ctx, next);
      console.log(`[SET] ${field}=${value}`);
      break;
    }
    case "transition": {
      const event = args[0];
      if (!event) throw new Error("transition requires an event name");
      const state = workflow.transitionWorkflowState(root, ctx, event);
      console.log(`[TRANSITION] ${event}`);
      console.log(`phase: ${state.phase}`);
      console.log(`next_skill: ${state.next_skill}`);
      console.log(`decision_required: ${state.decision_required}`);
      break;
    }
    case "check": {
      const phase = args[0];
      const result = workflow.checkWorkflowEntry(root, ctx, phase);
      console.log(result.text);
      process.exitCode = result.ok ? 0 : 1;
      break;
    }
    case "next": {
      printNext(workflow.nextWorkflowStep(root, ctx));
      break;
    }
    case "recover": {
      console.log(workflow.recoverWorkflowContext(root, ctx));
      break;
    }
    case "hash": {
      const write = args.includes("--write");
      const result = workflow.workflowContextHash(root, ctx, write);
      console.log(`CONTEXT_HASH: ${result.combined}`);
      for (const entry of result.entries) console.log(`${entry.name}: ${entry.hash}`);
      if (write) console.log("Updated workflow-state.yaml handoff_hash.");
      break;
    }
    case "help":
    case "--help":
    case "-h":
      console.log(usage());
      break;
    default:
      throw new Error(`Unknown workflow-state command: ${command}\n${usage()}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
