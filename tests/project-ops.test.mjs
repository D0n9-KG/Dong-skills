import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hook = path.join(root, ".codex", "hooks", "project-ops.mjs");
const bootstrap = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "scripts", "bootstrap-project-ops.ps1");
const statePrune = path.join(root, "scripts", "state-prune.mjs");
const solutions = path.join(root, "scripts", "solutions.mjs");

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dong-skills-test-"));
}

function runHook(projectRoot, input) {
  const out = execFileSync(process.execPath, [hook], {
    cwd: projectRoot,
    input: JSON.stringify({ cwd: projectRoot, ...input }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  return out ? JSON.parse(out) : {};
}

function git(projectRoot, args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function readyState(projectRoot, checkpoint) {
  const ctx = path.join(projectRoot, ".codex-context");
  write(path.join(ctx, "current-state.md"), "# Current State\n\n## Next Action\nContinue.\n");
  write(path.join(ctx, "artifact-index.md"), "# Artifact Index\n\n## Modified\n- `work.txt`: test change.\n");
  write(path.join(ctx, "verification.md"), "# Verification\n\n## Commands Run\n- Test fixture.\n\n## Not Yet Verified\n- None.\n");
  write(path.join(ctx, "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- Last reviewed raw observations: now.\n");
  write(path.join(ctx, "handoff-summary.md"), `# Handoff Summary

## Objective
Test checkpoint gate.

## Latest User Instruction
Run checkpoint gate test.

## Approved Scope / Spec
Dirty worktree should need structured checkpoint notes.

## Plan Status
Testing.

## Files Modified
- work.txt

## Files Read But Not Changed
- None.

## Decisions Made
- Keep dirty work deferred.

## Open Questions And Assumptions
- None.

## Risks
- None.

## Verification Evidence
- Test fixture.

## Git Checkpoint
${checkpoint}

## Learned Instincts To Preserve
- None.

## Next Action
Continue test.

## Files To Re-read First
- work.txt
`);
}

test("bootstrap adds raw runtime ignore rules to target .gitignore", () => {
  const project = tempProject();
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    bootstrap,
    "-TargetProjectRoot",
    project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const gitignore = fs.readFileSync(path.join(project, ".gitignore"), "utf8");
  assert.match(gitignore, /\.codex-context\/raw\/\*/);
  assert.match(gitignore, /!\.codex-context\/raw\/\.gitkeep/);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "lib", "core.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "state-prune.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "solutions.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "session-history.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "archive", ".gitkeep")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "solution-index.md")), true);
});

test("learning observations redact private key bodies and URL userinfo", () => {
  const project = tempProject();
  const prompt = [
    "remember this rule",
    "-----BEGIN PRIVATE KEY-----",
    "ABCDEF1234567890SECRET",
    "-----END PRIVATE KEY-----",
    "https://user:pass@example.com/path?token=abc#frag"
  ].join("\n");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: prompt
  });

  const obs = fs.readFileSync(path.join(project, ".codex-context", "raw", "observations.jsonl"), "utf8");
  assert.doesNotMatch(obs, /ABCDEF1234567890SECRET/);
  assert.doesNotMatch(obs, /user:pass@example\.com/);
  assert.match(obs, /\[redacted-private-key\]/);
  assert.match(obs, /example\.com/);
});

test("Stop requires structured Git Checkpoint fields when worktree is dirty", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "dirty\n");

  readyState(project, "- checkpoint noted but not structured\n");
  const vague = runHook(project, { hook_event_name: "Stop" });
  assert.equal(vague.decision, "block");
  assert.match(vague.reason, /Git Checkpoint missing field/);

  readyState(project, `- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: test fixture keeps dirty work uncommitted
- Next checkpoint: commit after fixture completes
`);
  const structured = runHook(project, { hook_event_name: "Stop" });
  assert.equal(structured.continue, true);
});

test("SessionStart recovery includes tail handoff sections", () => {
  const project = tempProject();
  const longBody = Array.from({ length: 80 }, (_, index) => `- file-${index}.txt`).join("\n");
  write(path.join(project, ".codex-context", "handoff-summary.md"), `# Handoff Summary

## Objective
Recover project.

## Latest User Instruction
Resume after compaction.

## Approved Scope / Spec
Scope.

## Plan Status
${longBody}

## Files Modified
${longBody}

## Decisions Made
Decision.

## Verification Evidence
Evidence.

## Git Checkpoint
- Latest commit: abc123
- Push state: pushed
- Files included: files
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Resume final task.

## Files To Re-read First
- important.md
`);
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nResume final task.\n");
  write(path.join(project, ".codex-context", "plan-progress.md"), "# Plan Progress\n\n## Current Step\nResume.\n");
  write(path.join(project, ".codex-context", "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- None.\n");

  const output = runHook(project, { hook_event_name: "SessionStart" });
  const context = output.hookSpecificOutput.additionalContext;
  assert.match(context, /## Git Checkpoint/);
  assert.match(context, /## Next Action\nResume final task\./);
  assert.match(context, /## Files To Re-read First\n- important\.md/);
});

test("PostToolUse blocks when artifact index is stale after project file changes", () => {
  const project = tempProject();
  git(project, ["init"]);
  const ctx = path.join(project, ".codex-context");
  const artifactIndex = path.join(ctx, "artifact-index.md");
  write(artifactIndex, "# Artifact Index\n\n## Modified\n- None yet.\n");
  const old = new Date(Date.now() - 20_000);
  fs.utimesSync(artifactIndex, old, old);
  write(path.join(project, "work.txt"), "changed\n");

  const output = runHook(project, { hook_event_name: "PostToolUse" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /artifact-index\.md is not fresh/);
  assert.match(output.reason, /work\.txt/);
});

test("PreCompact blocks when handoff is missing or stale", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "changed\n");

  const output = runHook(project, { hook_event_name: "PreCompact" });
  assert.equal(output.continue, false);
  assert.equal(output.stopReason, "codex-project-ops-handoff-not-ready");
  assert.match(output.systemMessage, /handoff-summary\.md/);
});

test("state-prune archives old verification commands and keeps recent evidence", () => {
  const project = tempProject();
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "verification.md"), `# Verification

## Commands Run
- command 1
  - Result: pass
- command 2
  - Result: pass
- command 3
  - Result: pass
- command 4
  - Result: pass

## Not Yet Verified
- UI trust prompt.
`);

  const out = execFileSync(process.execPath, [statePrune, project, "--keep", "2", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Archive: 2 item/);

  const verification = fs.readFileSync(path.join(ctx, "verification.md"), "utf8");
  assert.doesNotMatch(verification, /command 1/);
  assert.doesNotMatch(verification, /command 2/);
  assert.match(verification, /command 3/);
  assert.match(verification, /command 4/);
  assert.match(verification, /UI trust prompt/);

  const archives = fs.readdirSync(path.join(ctx, "archive")).filter((name) => name.startsWith("verification-"));
  assert.equal(archives.length, 1);
  const archive = fs.readFileSync(path.join(ctx, "archive", archives[0]), "utf8");
  assert.match(archive, /command 1/);
  assert.match(archive, /command 2/);
});

test("solutions validator accepts structured docs and rejects missing frontmatter", () => {
  const project = tempProject();
  write(path.join(project, "docs", "solutions", "runtime-errors", "good.md"), `---
title: "Good runtime fix"
date: 2026-06-09
track: bug
category: runtime-errors
problem_type: runtime-fix
status: active
scope: worker
tags: [worker, runtime]
verified_by: "node --test worker"
---

# Good runtime fix

## Problem

Verified fix.
`);
  write(path.join(project, "docs", "solutions", "runtime-errors", "bad.md"), "# Missing frontmatter\n");

  assert.throws(() => {
    execFileSync(process.execPath, [solutions, project, "validate"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  fs.rmSync(path.join(project, "docs", "solutions", "runtime-errors", "bad.md"));
  const out = execFileSync(process.execPath, [solutions, project, "validate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});
