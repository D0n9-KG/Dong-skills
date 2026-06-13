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
const health = path.join(root, "scripts", "project-ops-health.mjs");
const assetGovernance = path.join(root, "scripts", "asset-governance.mjs");
const releaseCheck = path.join(root, "scripts", "release-check.mjs");

function decodePowerShellEncodedCommand(command) {
  const match = String(command).match(/(?:^|\s)-EncodedCommand\s+([A-Za-z0-9+/=]+)/i);
  assert.ok(match, "commandWindows should use -EncodedCommand");
  return Buffer.from(match[1], "base64").toString("utf16le");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

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

function readyHealthFixture(projectRoot) {
  const ctx = path.join(projectRoot, ".codex-context");
  const hooks = {};
  for (const eventName of ["SessionStart", "UserPromptSubmit", "PostToolUse", "PreCompact", "PostCompact", "Stop"]) {
    hooks[eventName] = [{ hooks: [{ command: "node .codex/hooks/project-ops.mjs" }] }];
  }

  write(path.join(projectRoot, ".codex", "hooks.json"), JSON.stringify({ hooks }, null, 2));
  write(path.join(projectRoot, ".codex", "hooks", "project-ops.mjs"), "console.log('root hook');\n");
  write(path.join(projectRoot, ".codex", "hooks", "launch-project-ops.mjs"), "console.log('launcher');\n");
  write(path.join(projectRoot, ".codex", "scripts", "lib", "core.mjs"), "export const value = 1;\n");
  for (const scriptName of ["instincts.mjs", "asset-governance.mjs", "project-ops-health.mjs", "release-check.mjs", "state-prune.mjs", "solutions.mjs", "session-history.mjs"]) {
    write(path.join(projectRoot, "scripts", scriptName), "#!/usr/bin/env node\n");
  }
  write(path.join(projectRoot, ".gitignore"), ".codex-context/raw/*\n!.codex-context/raw/.gitkeep\n");

  for (const name of [
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
    "dong-skills-outbox.md",
    "solution-index.md"
  ]) {
    write(path.join(ctx, name), `# ${name}\n`);
  }

  write(path.join(ctx, "spec.md"), `# Spec

## Problem
Fixture.

## Goals
- Fixture.

## Approval Status
Approved by fixture.

## Approved Scope
- Fixture.

## Acceptance Criteria
- Fixture passes.

## Open Questions
- None.

## Next Step
Continue.
`);

  write(path.join(ctx, "plan-progress.md"), `# Plan Progress

## Active Plan
Fixture.

## Execution Approval
Approved by fixture.

## Tasks
- [x] Fixture task.

## Current Step
None.

## Out Of Scope
- None.
`);

  write(path.join(ctx, "worktree-state.md"), `# Worktree State

## Current Workspace
- Role: primary-checkout

## Primary Checkout
- Path: fixture

## Branch State
- Branch: fixture

## Ownership And Cleanup
- Cleanup owner: none

## Hook Root Notes
- Actual Git root: fixture

## Resume Instructions
- Re-detect before cleanup.
`);

  write(path.join(ctx, "handoff-summary.md"), `# Handoff Summary

## Objective
Test.

## Latest User Instruction
Test.

## Approved Scope / Spec
Test.

## Plan Status
Test.

## Files Modified
None.

## Decisions Made
None.

## Verification Evidence
Fixture.

## Git Checkpoint
- Latest commit: fixture
- Push state: not pushed
- Files included: none
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Continue.

## Files To Re-read First
- .codex-context/handoff-summary.md
`);
}

test("brainstorming skill preserves upstream continuation loop", () => {
  const skill = fs.readFileSync(path.join(root, ".agents", "skills", "brainstorming", "SKILL.md"), "utf8");

  assert.match(skill, /## Continuation Loop/);
  assert.match(skill, /After every user response during brainstorming/);
  assert.match(skill, /ask the next single highest-impact question/);
  assert.match(skill, /Do not end a brainstorming turn by only saying that files were updated/);
  assert.match(skill, /compare 2-3 viable approaches/);
  assert.match(skill, /"可以", "继续"/);
});

test("borrowed workflow skills retain required upstream gates", () => {
  const readSkill = (name) => fs.readFileSync(path.join(root, ".agents", "skills", name, "SKILL.md"), "utf8");

  const writing = readSkill("writing-plans");
  assert.match(writing, /## Scope Check/);
  assert.match(writing, /## Test-First Default/);
  assert.match(writing, /## Execution Note/);
  assert.match(writing, /2-5 minute steps/);
  assert.match(writing, /## Acceptance Mapping/);

  const debugging = readSkill("systematic-debugging");
  assert.match(debugging, /Reproduction is the entry ticket to fixing/);
  assert.match(debugging, /reliable automated failing test or command/);
  assert.match(debugging, /manual reproduction and verification gap/);

  const executing = readSkill("executing-plans");
  assert.match(executing, /Run Test Discovery before editing implementation files/);
  assert.match(executing, /For behavior-changing tasks, add\/update the planned test/);
  assert.match(executing, /## Review And Shipping Gate/);

  const requestingReview = readSkill("requesting-code-review");
  assert.match(requestingReview, /## Mandatory Review Gate/);
  assert.match(requestingReview, /record the low-risk reason/);

  const reviewPanel = readSkill("codex-review-panel");
  assert.match(reviewPanel, /## Mandatory Panel Triggers/);
  assert.match(reviewPanel, /verification gaps, manual-only evidence/);

  const worktree = readSkill("codex-worktree-governance");
  assert.match(worktree, /## Branch Finishing Menu/);
  assert.match(worktree, /Merge locally into <base-branch>/);
  assert.match(worktree, /Discard this work/);
  assert.match(worktree, /Never remove a `codex-managed-worktree`/);

  const checkpoint = readSkill("codex-git-checkpoint");
  assert.match(checkpoint, /## Branch Completion Boundary/);
  assert.match(checkpoint, /fixed finishing menu/);

  const solutionMemory = readSkill("codex-solution-memory");
  assert.match(solutionMemory, /## Evaluation Gate/);
  assert.match(solutionMemory, /After any verified non-trivial fix/);
  assert.match(solutionMemory, /Do not let "maybe later" be the implicit outcome/);
});

test("published Windows hook commands are encoded project hook invocations", () => {
  const hookJsonFiles = [
    path.join(root, ".codex", "hooks.json"),
    path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks.json")
  ];

  for (const file of hookJsonFiles) {
    const config = readJson(file);
    for (const groups of Object.values(config.hooks)) {
      for (const group of groups) {
        for (const hookConfig of group.hooks || []) {
          const command = hookConfig.commandWindows || hookConfig.command_windows;
          assert.ok(command, `${file} hook should define commandWindows`);
          assert.doesNotMatch(command, /\$root|2>\$null/);
          const decoded = decodePowerShellEncodedCommand(command);
          assert.match(decoded, /git rev-parse --show-toplevel/);
          assert.match(decoded, /Join-Path/);
          assert.match(decoded, /\.codex\/hooks\/launch-project-ops\.mjs/);
        }
      }
    }
  }
});

test("Windows hook command survives outer PowerShell invocation", () => {
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

  const config = readJson(path.join(project, ".codex", "hooks.json"));
  const command = config.hooks.SessionStart[0].hooks[0].commandWindows;
  const out = execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    command
  ], {
    cwd: project,
    input: JSON.stringify({ cwd: project, hook_event_name: "SessionStart" }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();

  const parsed = JSON.parse(out);
  assert.match(parsed.hookSpecificOutput.additionalContext, /Codex Project Ops hooks are active/);
});

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
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "asset-governance.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "solutions.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "session-history.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "hooks", "launch-project-ops.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "archive", ".gitkeep")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "solution-index.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "worktree-state.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "dong-skills-outbox.md")), true);
  assert.match(fs.readFileSync(path.join(project, ".codex-context", "spec.md"), "utf8"), /## Approval Status/);
  assert.match(fs.readFileSync(path.join(project, ".codex-context", "plan-progress.md"), "utf8"), /## Execution Approval/);

  const installedHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  const recovery = execFileSync(process.execPath, [installedHook], {
    cwd: project,
    input: JSON.stringify({ cwd: project, hook_event_name: "SessionStart" }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  const context = JSON.parse(recovery).hookSpecificOutput.additionalContext;
  assert.match(context, /2\. \.codex-context\/worktree-state\.md/);
  assert.match(context, /8\. \.codex-context\/solution-index\.md/);
  assert.match(context, /10\. \.codex-context\/dong-skills-outbox\.md only when discussing Dong Skills improvements/);
  assert.match(context, /11\. STRATEGY\.md, CONCEPTS\.md, or relevant docs\/solutions entries only when the task needs them/);
});

test("hook launcher dispatches using hook input cwd rather than launcher cwd", () => {
  const source = tempProject();
  const target = tempProject();
  git(source, ["init"]);
  git(target, ["init"]);
  write(path.join(source, ".codex", "hooks", "project-ops.mjs"), "console.log(JSON.stringify({ root: 'source' }));\n");
  write(path.join(target, ".codex", "hooks", "project-ops.mjs"), "console.log(JSON.stringify({ root: 'target' }));\n");

  const launcher = path.join(root, ".codex", "hooks", "launch-project-ops.mjs");
  const out = execFileSync(process.execPath, [launcher], {
    cwd: source,
    input: JSON.stringify({ cwd: target, hook_event_name: "SessionStart" }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();

  assert.deepEqual(JSON.parse(out), { root: "target" });
});

test("health check reports linked worktree diagnostics without failing", () => {
  const project = tempProject();
  const worktree = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "README.md"), "# fixture\n");
  git(project, ["add", "README.md"]);
  git(project, ["commit", "-m", "init"]);

  try {
    git(project, ["worktree", "add", worktree, "-b", "feature/test"]);
    readyHealthFixture(worktree);

    const out = execFileSync(process.execPath, [health, worktree], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    assert.match(out, /Worktree:/);
    assert.match(out, /Role: manual-worktree/);
    assert.match(out, /Linked worktree: yes/);
    assert.match(out, /Branch: feature\/test/);
    assert.match(out, /Result: pass/);
  } finally {
    try {
      git(project, ["worktree", "remove", worktree, "--force"]);
    } catch {}
  }
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

test("learning observations preserve Chinese UTF-8 and dedupe status follow-ups by topic", () => {
  const project = tempProject();

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "记住：Dong Skills 优化沉淀应该写到真实源仓库，不要写进安装副本。"
  });
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "确认一下，刚才这个 Dong Skills 优化沉淀放到哪里了？"
  });

  const obsFile = path.join(project, ".codex-context", "raw", "observations.jsonl");
  const lines = fs.readFileSync(obsFile, "utf8").trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  const event = JSON.parse(lines[0]);
  assert.equal(event.topic, "dong-skills-meta-learning");
  assert.match(event.prompt_excerpt, /优化沉淀/);
  const mojibakeMarkerPattern = new RegExp(["\\u93b8", "\\u5a0c", "\\u7a69"].join("|"), "u");
  assert.doesNotMatch(event.prompt_excerpt, mojibakeMarkerPattern);

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Grouped pending observations:/);
  assert.match(out, /topic: dong-skills-meta-learning, observations: 1/);
});

test("learning-status reports Dong Skills fallback outbox", () => {
  const project = tempProject();
  write(path.join(project, ".codex-context", "dong-skills-outbox.md"), `# Dong Skills Improvement Outbox

## Pending Improvements

### 2026-06-13 - Route skill improvements

Status: pending
Signal: test
`);

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: "", DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills meta-learning:/);
  assert.match(out, /Target: not found; use fallback outbox/);
  assert.match(out, /Fallback outbox: \.codex-context\/dong-skills-outbox\.md/);
  assert.match(out, /Pending outbox items: 1/);
  assert.match(out, /Installed skill copies are not treated as the Dong Skills source repo/);
});

test("learning-status locates Dong Skills source repo from environment", () => {
  const project = tempProject();
  const source = tempProject();
  write(path.join(source, "docs", "improvements", "backlog.md"), "# Dong Skills Improvement Backlog\n");
  write(path.join(source, ".agents", "skills", "codex-learning-memory", "SKILL.md"), "---\nname: codex-learning-memory\n---\n");

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: source, DONG_SKILLS_HOME: "" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills meta-learning:/);
  assert.match(out, /Target source: DONG_SKILLS_REPO/);
  assert.match(out, /docs[\\/]improvements[\\/]backlog\.md/);
  assert.match(out, /Pending outbox items: 0/);
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

test("Stop explains stale Git Checkpoint handoff evidence", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "dirty\n");

  readyState(project, `- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: test fixture keeps dirty work uncommitted
- Next checkpoint: commit after fixture completes
`);
  const handoffFile = path.join(project, ".codex-context", "handoff-summary.md");
  const old = new Date(Date.now() - 20_000);
  fs.utimesSync(handoffFile, old, old);

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /handoff-summary\.md is older than changed files/);
  assert.match(output.reason, /latest changed file: work\.txt/);
  assert.match(output.reason, /refresh handoff-summary\.md after verification\/artifact\/current-state updates/);
});

test("health check requires state files to preserve approval gates", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "spec.md"), "# Spec\n\n## Problem\nFixture.\n");
  write(path.join(project, ".codex-context", "plan-progress.md"), "# Plan Progress\n\n## Active Plan\nFixture.\n");

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /spec\.md missing section: Approval Status/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Execution Approval/);
  }
  assert.equal(failed, true);
});

test("health check accepts singular Goal section in spec", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "spec.md"), `# Spec

## Problem
Fixture.

## Goal
- Fixture.

## Approval Status
Approved by fixture.

## Approved Scope
- Fixture.

## Acceptance Criteria
- Fixture passes.

## Open Questions
- None.

## Next Step
Continue.
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("release check reports text readability mojibake markers", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const marker = String.fromCodePoint(0x93b8);
  write(path.join(project, "README.md"), `# Fixture

This line contains ${marker}
`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL text readability scan/);
    assert.match(String(error.stdout), /README\.md:3: Chinese mojibake marker/);
  }
  assert.equal(failed, true);
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
  write(path.join(project, ".codex-context", "solution-index.md"), "# Solution Index\n\n## Knowledge Store\n- docs/solutions present: yes\n");
  write(path.join(project, ".codex-context", "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- None.\n");
  write(path.join(project, ".codex-context", "worktree-state.md"), "# Worktree State\n\n## Current Workspace\n- Role: primary-checkout\n");

  const output = runHook(project, { hook_event_name: "SessionStart" });
  const context = output.hookSpecificOutput.additionalContext;
  assert.match(context, /2\. \.codex-context\/worktree-state\.md/);
  assert.match(context, /8\. \.codex-context\/solution-index\.md/);
  assert.match(context, /10\. \.codex-context\/dong-skills-outbox\.md only when discussing Dong Skills improvements/);
  assert.match(context, /11\. STRATEGY\.md, CONCEPTS\.md, or relevant docs\/solutions entries only when the task needs them/);
  assert.match(context, /Worktree: role=unknown/);
  assert.match(context, /## Git Checkpoint/);
  assert.match(context, /## Next Action\nResume final task\./);
  assert.match(context, /## Files To Re-read First\n- important\.md/);
  assert.match(context, /Solution index excerpt:/);
  assert.match(context, /docs\/solutions present: yes/);
  assert.match(context, /Worktree state excerpt:/);
});

test("PostCompact emits only common hook output fields", () => {
  const project = tempProject();
  const output = runHook(project, { hook_event_name: "PostCompact", trigger: "auto" });
  assert.deepEqual(output, { continue: true });
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

  const output = runHook(project, { hook_event_name: "PreCompact", trigger: "manual" });
  assert.equal(output.continue, false);
  assert.equal(output.stopReason, "codex-project-ops-handoff-not-ready");
  assert.match(output.systemMessage, /handoff-summary\.md/);
});

test("PreCompact writes emergency handoff and allows automatic compaction", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "changed\n");

  const output = runHook(project, { hook_event_name: "PreCompact", trigger: "auto" });
  assert.equal(output.continue, true);
  assert.match(output.systemMessage, /allowed automatic compaction/);
  assert.equal(Object.hasOwn(output, "hookSpecificOutput"), false);

  const handoff = fs.readFileSync(path.join(project, ".codex-context", "handoff-summary.md"), "utf8");
  assert.match(handoff, /Emergency recovery snapshot before automatic compaction/);
  assert.match(handoff, /Automatic compaction was about to run/);
  assert.match(handoff, /## PreCompact Issues/);
  assert.match(handoff, /work\.txt/);

  const rawFiles = fs.readdirSync(path.join(project, ".codex-context", "raw"));
  assert.equal(rawFiles.some((name) => /^precompact-auto-.*\.md$/.test(name)), true);
});

test("PreCompact preserves existing handoff below emergency notice", () => {
  const project = tempProject();
  git(project, ["init"]);
  const handoffFile = path.join(project, ".codex-context", "handoff-summary.md");
  write(handoffFile, `# Handoff Summary

## Objective
Preserve the original objective.

## Latest User Instruction
Continue the original task.

## Approved Scope / Spec
Original scope.

## Plan Status
Original plan status.

## Files Modified
- original.txt

## Decisions Made
- Original decision.

## Verification Evidence
- Original evidence.

## Git Checkpoint
- Latest commit: abc123
- Push state: pushed
- Files included: original.txt
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: later

## Next Action
Continue original next action.

## Files To Re-read First
- original.txt
`);
  const old = new Date(Date.now() - 20_000);
  fs.utimesSync(handoffFile, old, old);
  write(path.join(project, "work.txt"), "changed\n");

  const output = runHook(project, { hook_event_name: "PreCompact", trigger: "auto" });
  assert.equal(output.continue, true);
  assert.match(output.systemMessage, /preserving the existing handoff/);

  const handoff = fs.readFileSync(path.join(project, ".codex-context", "handoff-summary.md"), "utf8");
  assert.match(handoff, /## PreCompact Emergency Notice/);
  assert.match(handoff, /## PreCompact Issues/);
  assert.match(handoff, /## Objective\nPreserve the original objective\./);
  assert.ok(handoff.indexOf("## PreCompact Emergency Notice") < handoff.indexOf("## Objective\nPreserve the original objective."));
  assert.doesNotMatch(handoff, /## Objective\nEmergency recovery snapshot before automatic compaction\./);

  const rawFile = fs.readdirSync(path.join(project, ".codex-context", "raw"))
    .find((name) => /^precompact-auto-.*\.md$/.test(name));
  assert.ok(rawFile);
  const raw = fs.readFileSync(path.join(project, ".codex-context", "raw", rawFile), "utf8");
  assert.match(raw, /## Previous Handoff/);
  assert.match(raw, /Preserve the original objective/);
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

  const out = execFileSync(process.execPath, [statePrune, project, "--verification", "--archive", "--keep-latest", "2", "--reason", "test-bloat", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Archive: 2 item/);
  assert.match(out, /Active file update: \.codex-context\/verification\.md includes an Archived Evidence pointer/);

  const verification = fs.readFileSync(path.join(ctx, "verification.md"), "utf8");
  assert.doesNotMatch(verification, /command 1/);
  assert.doesNotMatch(verification, /command 2/);
  assert.match(verification, /command 3/);
  assert.match(verification, /command 4/);
  assert.match(verification, /UI trust prompt/);
  assert.match(verification, /## Archived Evidence/);
  assert.match(verification, /verification-\d{4}-\d{2}-\d{2}-test-bloat\.md/);

  const archives = fs.readdirSync(path.join(ctx, "archive")).filter((name) => name.startsWith("verification-"));
  assert.equal(archives.length, 1);
  assert.match(archives[0], /test-bloat/);
  const archive = fs.readFileSync(path.join(ctx, "archive", archives[0]), "utf8");
  assert.match(archive, /command 1/);
  assert.match(archive, /command 2/);
});

test("asset-governance prunes only excess precompact raw snapshots", () => {
  const project = tempProject();
  const raw = path.join(project, ".codex-context", "raw");
  fs.mkdirSync(raw, { recursive: true });
  write(path.join(raw, "observations.jsonl"), "{\"status\":\"unreviewed\"}\n");

  for (let index = 0; index < 7; index += 1) {
    const file = path.join(raw, `precompact-auto-2026-06-12T00-00-0${index}-000Z.md`);
    write(file, `snapshot ${index}\n`);
    const time = new Date(Date.now() - index * 10_000);
    fs.utimesSync(file, time, time);
  }

  const out = execFileSync(process.execPath, [assetGovernance, project, "--keep-precompact", "3", "--raw-days", "999", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Deleted 4 snapshot/);

  const remaining = fs.readdirSync(raw);
  assert.equal(remaining.filter((name) => /^precompact-auto-/.test(name)).length, 3);
  assert.equal(remaining.includes("observations.jsonl"), true);
});

test("Stop blocks severe asset governance bloat", () => {
  const project = tempProject();
  git(project, ["init"]);
  readyState(project, `- Latest commit: not needed
- Push state: no remote
- Files included: none
- Files intentionally left uncommitted: .codex-context state files
- Deferred reason: fixture state is intentionally uncommitted
- Next checkpoint: none
`);

  const commands = Array.from({ length: 41 }, (_, index) => `- command ${index + 1}\n  - Result: pass`).join("\n");
  write(path.join(project, ".codex-context", "verification.md"), `# Verification

## Commands Run
${commands}

## Product Evidence
- None.

## Not Yet Verified
- None.
`);

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /verification\.md has 41 command entries/);
});

test("health check fails when bootstrap assets drift from root files", () => {
  const project = tempProject();
  readyHealthFixture(project);

  const assetRoot = path.join(project, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops");
  write(path.join(assetRoot, ".codex", "hooks", "project-ops.mjs"), "console.log('different asset hook');\n");
  write(path.join(assetRoot, ".codex", "scripts", "lib", "core.mjs"), "export const value = 1;\n");

  assert.throws(() => {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("health check rejects Windows encoded commands that do not invoke project hook", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const hooksFile = path.join(project, ".codex", "hooks.json");
  const config = readJson(hooksFile);
  const badCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${Buffer.from("Write-Output 'not a project hook'", "utf16le").toString("base64")}`;

  for (const groups of Object.values(config.hooks)) {
    for (const group of groups) {
      for (const hookConfig of group.hooks || []) {
        hookConfig.commandWindows = badCommand;
      }
    }
  }
  write(hooksFile, JSON.stringify(config, null, 2));

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /encoded command does not invoke Dong Skills hook launcher/);
  }
  assert.equal(failed, true);
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
