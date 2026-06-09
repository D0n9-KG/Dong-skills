#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const REQUIRED_CONTEXT_FILES = [
  "current-state.md",
  "project-map.md",
  "spec.md",
  "plan-progress.md",
  "artifact-index.md",
  "decisions.md",
  "open-questions.md",
  "risks.md",
  "verification.md",
  "learned-instincts.md",
  "solution-index.md",
  "handoff-summary.md"
];

const REQUIRED_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop"
];

const REQUIRED_HANDOFF_SECTIONS = [
  "Objective",
  "Latest User Instruction",
  "Approved Scope / Spec",
  "Plan Status",
  "Files Modified",
  "Decisions Made",
  "Verification Evidence",
  "Git Checkpoint",
  "Next Action",
  "Files To Re-read First"
];

const REQUIRED_CHECKPOINT_FIELDS = [
  ["Latest commit", "Latest functional commit"],
  ["Push state"],
  ["Files included"],
  ["Files intentionally left uncommitted"],
  ["Deferred reason"],
  ["Next checkpoint"]
];

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

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function sha256(file) {
  return createHash("sha256").update(readText(file), "utf8").digest("hex");
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function sectionContent(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function hookCommandMentionsProjectOps(group) {
  for (const hook of group.hooks || []) {
    for (const field of ["command", "commandWindows", "command_windows"]) {
      if (String(hook[field] || "").includes("project-ops.mjs")) return true;
    }
  }
  return false;
}

function checkHooksJson(root, issues) {
  const file = path.join(root, ".codex", "hooks.json");
  if (!fs.existsSync(file)) {
    issues.push("Missing .codex/hooks.json");
    return;
  }

  let config;
  try {
    config = JSON.parse(readText(file));
  } catch (error) {
    issues.push(`Invalid .codex/hooks.json: ${error.message}`);
    return;
  }

  for (const eventName of REQUIRED_HOOK_EVENTS) {
    const groups = Array.isArray(config.hooks?.[eventName]) ? config.hooks[eventName] : [];
    if (!groups.some(hookCommandMentionsProjectOps)) {
      issues.push(`.codex/hooks.json is missing Dong Skills hook for ${eventName}`);
    }
  }
}

function checkRuntimeGitignore(root, issues) {
  const file = path.join(root, ".gitignore");
  const text = readText(file);
  if (!text.includes(".codex-context/raw/*")) {
    issues.push(".gitignore does not ignore .codex-context/raw/*");
  }
  if (!text.includes("!.codex-context/raw/.gitkeep")) {
    issues.push(".gitignore does not keep .codex-context/raw/.gitkeep trackable");
  }
}

function checkTrackedRaw(root, issues) {
  try {
    const out = execFileSync("git", ["ls-files", ".codex-context/raw"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const tracked = out.split(/\r?\n/).filter(Boolean);
    const unsafe = tracked.filter((file) => !file.endsWith("/.gitkeep") && !file.endsWith("\\.gitkeep"));
    if (unsafe.length) {
      issues.push(`Tracked raw runtime file(s): ${unsafe.join(", ")}`);
    }
  } catch {
    // Non-git projects are allowed; hooks still work with filesystem state.
  }
}

function checkContext(root, issues) {
  const ctx = path.join(root, ".codex-context");
  for (const name of REQUIRED_CONTEXT_FILES) {
    if (!fs.existsSync(path.join(ctx, name))) issues.push(`Missing .codex-context/${name}`);
  }

  const handoff = readText(path.join(ctx, "handoff-summary.md"));
  for (const heading of REQUIRED_HANDOFF_SECTIONS) {
    if (!handoff.includes(`## ${heading}`)) {
      issues.push(`handoff-summary.md missing section: ${heading}`);
    }
  }

  const checkpoint = sectionContent(handoff, "Git Checkpoint");
  for (const labels of REQUIRED_CHECKPOINT_FIELDS) {
    if (!labels.some((field) => checkpoint.includes(`${field}:`))) {
      issues.push(`handoff-summary.md Git Checkpoint missing field label: ${labels.join(" or ")}`);
    }
  }
}

function checkAssetParity(root, issues) {
  const assetRoot = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops");
  if (!fs.existsSync(assetRoot)) return;

  const pairs = [
    [
      path.join(root, ".codex", "hooks", "project-ops.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks", "project-ops.mjs")
    ],
    [
      path.join(root, "AGENTS.project-ops.snippet.md"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "AGENTS.project-ops.snippet.md")
    ],
    [
      path.join(root, "scripts", "instincts.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "instincts.mjs")
    ],
    [
      path.join(root, "scripts", "project-ops-health.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "project-ops-health.mjs")
    ],
    [
      path.join(root, "scripts", "release-check.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "release-check.mjs")
    ],
    [
      path.join(root, "scripts", "state-prune.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "state-prune.mjs")
    ],
    [
      path.join(root, "scripts", "solutions.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "solutions.mjs")
    ],
    [
      path.join(root, "scripts", "session-history.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "session-history.mjs")
    ]
  ];

  for (const [rootFile, assetFile] of pairs) {
    if (!fs.existsSync(rootFile) || !fs.existsSync(assetFile)) continue;
    if (sha256(rootFile) !== sha256(assetFile)) {
      issues.push(`Bootstrap asset differs from root file: ${path.relative(root, assetFile).replace(/\\/g, "/")}`);
    }
  }

  const rootLib = path.join(root, ".codex", "scripts", "lib");
  const assetLib = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "scripts", "lib");
  if (!fs.existsSync(rootLib) || !fs.existsSync(assetLib)) {
    issues.push("Bootstrap asset is missing .codex/scripts/lib parity tree");
    return;
  }

  const rootFiles = walkFiles(rootLib)
    .map((file) => path.relative(rootLib, file).replace(/\\/g, "/"))
    .sort();
  const assetFiles = walkFiles(assetLib)
    .map((file) => path.relative(assetLib, file).replace(/\\/g, "/"))
    .sort();
  const allFiles = new Set([...rootFiles, ...assetFiles]);
  for (const relFile of allFiles) {
    const rootFile = path.join(rootLib, relFile);
    const assetFile = path.join(assetLib, relFile);
    if (!fs.existsSync(rootFile) || !fs.existsSync(assetFile)) {
      issues.push(`Bootstrap asset lib file mismatch: ${relFile}`);
    } else if (sha256(rootFile) !== sha256(assetFile)) {
      issues.push(`Bootstrap asset differs from root lib file: .codex/scripts/lib/${relFile}`);
    }
  }
}

function run(root) {
  const issues = [];

  if (!fs.existsSync(path.join(root, ".codex", "hooks", "project-ops.mjs"))) {
    issues.push("Missing .codex/hooks/project-ops.mjs");
  }
  if (!fs.existsSync(path.join(root, ".codex", "scripts", "instincts.mjs")) &&
      !fs.existsSync(path.join(root, "scripts", "instincts.mjs"))) {
    issues.push("Missing project ops instincts script");
  }
  if (!fs.existsSync(path.join(root, ".codex", "scripts", "lib", "core.mjs"))) {
    issues.push("Missing .codex/scripts/lib/core.mjs required by split project hook");
  }
  for (const scriptName of ["project-ops-health.mjs", "release-check.mjs", "state-prune.mjs", "solutions.mjs", "session-history.mjs"]) {
    if (!fs.existsSync(path.join(root, ".codex", "scripts", scriptName)) &&
        !fs.existsSync(path.join(root, "scripts", scriptName))) {
      issues.push(`Missing project ops helper script: ${scriptName}`);
    }
  }

  checkHooksJson(root, issues);
  checkRuntimeGitignore(root, issues);
  checkTrackedRaw(root, issues);
  checkContext(root, issues);
  checkAssetParity(root, issues);

  const lines = [
    "Dong Skills health check",
    `Root: ${root}`,
    ""
  ];

  if (issues.length) {
    lines.push("Issues:");
    for (const issue of issues) lines.push(`- ${issue}`);
  } else {
    lines.push("Issues: none");
  }

  lines.push("", issues.length ? "Result: fail" : "Result: pass");
  return { ok: issues.length === 0, text: lines.join("\n") };
}

const root = gitRoot(process.argv[2] || process.cwd());
const result = run(root);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
