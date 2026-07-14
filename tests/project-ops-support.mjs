import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hook = path.join(root, ".codex", "hooks", "project-ops.mjs");
const bootstrap = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "scripts", "bootstrap-project-ops.ps1");
const installWindows = path.join(root, "scripts", "install-windows.ps1");
const contextBudgetScript = path.join(root, "scripts", "context-budget.mjs");
const statePrune = path.join(root, "scripts", "state-prune.mjs");
const solutions = path.join(root, "scripts", "solutions.mjs");
const health = path.join(root, "scripts", "project-ops-health.mjs");
const assetGovernance = path.join(root, "scripts", "asset-governance.mjs");
const releaseCheck = path.join(root, "scripts", "release-check.mjs");
const workflowState = path.join(root, "scripts", "workflow-state.mjs");
const skillEvolution = path.join(root, "scripts", "skill-evolution.mjs");
const skillForwardEval = path.join(root, "scripts", "skill-forward-eval.mjs");

function decodePowerShellEncodedCommand(command) {
  const match = String(command).match(/(?:^|\s)-EncodedCommand\s+([A-Za-z0-9+/=]+)/i);
  assert.ok(match, "commandWindows should use -EncodedCommand");
  return Buffer.from(match[1], "base64").toString("utf16le");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dong-skills-test-"));
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function stopProcessTree(pid) {
  try {
    execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: ["ignore", "ignore", "ignore"]
    });
  } catch {}
}

function readFileAfterUnlock(filePath, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (error) {
      if (error.code !== "EBUSY" && error.code !== "EPERM") throw error;
      lastError = error;
      sleep(25);
    }
  }
  throw lastError;
}

function installLockPath(resourcePath) {
  const normalized = path.resolve(resourcePath).replace(/\\/g, "/").toLowerCase();
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
  return path.join(os.tmpdir(), "dong-skills-install-locks", `${digest}.lock`);
}

function installTransactionJournalPath(resourcePaths) {
  const normalized = resourcePaths
    .map((resourcePath) => path.resolve(resourcePath).replace(/\\/g, "/").toLowerCase())
    .sort()
    .join("\n");
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
  return path.join(os.tmpdir(), "dong-skills-install-transactions", `${digest}.json`);
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

function writeDongProjectSkillsFixture(projectRoot) {
  const names = [
    "brainstorming",
    "writing-plans",
    "executing-plans",
    "systematic-debugging",
    "verification-before-completion",
    "requesting-code-review",
    "receiving-code-review",
    "codex-project-governance",
    "codex-verification-loop",
    "codex-learning-memory",
    "codex-context-budget",
    "codex-worktree-governance",
    "codex-git-checkpoint",
    "codex-architecture-governance",
    "codex-docs-stewardship",
    "codex-asset-governance",
    "codex-simplicity-review",
    "codex-review-panel",
    "codex-solution-memory",
    "codex-session-history",
    "codex-strategy-anchor",
    "codex-evidence-capture",
    "codex-skill-evolution"
  ];

  const skillsRoot = path.join(projectRoot, ".agents", "skills");
  write(path.join(skillsRoot, ".dong-skills-project.json"), JSON.stringify({
    schema: "dong-skills.project-install.v1",
    managed_by: "Dong Skills",
    installed_at: "fixture",
    installed_skills: names,
    global_entry_skills_required: ["codex-codebase-onboarding", "using-superpowers", "codex-skill-evolution"],
    global_bootstrap_skills_required: ["codex-codebase-onboarding", "using-superpowers"]
  }, null, 2));

  for (const name of names) {
    write(path.join(skillsRoot, name, "SKILL.md"), `---\nname: ${name}\n---\n\n# ${name}\n`);
    write(path.join(skillsRoot, name, ".dong-skill-managed.json"), JSON.stringify({
      schema: "dong-skills.skill-install.v1",
      managed_by: "Dong Skills",
      name,
      scope: "project",
      installed_at: "fixture"
    }, null, 2));
  }
}

function readyState(projectRoot, checkpoint) {
  const ctx = path.join(projectRoot, ".codex-context");
  write(path.join(ctx, "current-state.md"), "# Current State\n\n## Next Action\nContinue.\n");
  write(path.join(ctx, "spec.md"), "# Spec\n\n## Approval Status\nApproved by user.\n\n## Next Step\nContinue.\n");
  write(path.join(ctx, "plan-progress.md"), "# Plan Progress\n\n## Spec Approval\nApproved by user.\n\n## Execution Approval\nApproved by user for Traditional task-by-task execution.\n\n## Artifact Readiness\nimplementation-ready\n\n## Execution Mode\nTraditional task-by-task execution.\n\n## Current Step\nContinue.\n");
  write(path.join(ctx, "artifact-index.md"), "# Artifact Index\n\n## Modified\n- `work.txt`: test change.\n");
  write(path.join(ctx, "verification.md"), "# Verification\n\n## Commands Run\n- Test fixture.\n\n## Not Yet Verified\n- None.\n");
  write(path.join(ctx, "working-notes.md"), `# Working Notes

## Purpose
Fixture investigation notes.

## Current Findings
- Fixture finding.

## Current Hypothesis
- Fixture hypothesis.

## Rejected Paths
- None.

## Open Investigation Questions
- None.

## Next Verification Step
- Fixture verification.

## Promotion Notes
- None.
`);
  write(path.join(ctx, "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- Last reviewed raw observations: now.\n");
  const approvedSpecHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "spec.md")))
    .digest("hex");
  const approvedPlanHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "plan-progress.md")))
    .digest("hex");
  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
work_lane: lane-1
task_id: task-1
task_generation: 1
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
approved_spec_hash: ${approvedSpecHash}
approved_plan_hash: ${approvedPlanHash}
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);
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
  writeDongProjectSkillsFixture(projectRoot);
  const hooks = {};
  for (const eventName of ["SessionStart", "PreToolUse", "PreCompact", "Stop"]) {
    hooks[eventName] = [{ hooks: [{ command: "node .codex/hooks/project-ops.mjs" }] }];
  }

  write(path.join(projectRoot, ".codex", "hooks.json"), JSON.stringify({ hooks }, null, 2));
  write(path.join(projectRoot, ".codex", "hooks", "project-ops.mjs"), "console.log('root hook');\n");
  write(path.join(projectRoot, ".codex", "hooks", "launch-project-ops.mjs"), "console.log('launcher');\n");
  write(path.join(projectRoot, ".codex", "scripts", "lib", "core.mjs"), "export const value = 1;\n");
  for (const scriptName of ["instincts.mjs", "asset-governance.mjs", "context-recovery-eval.mjs", "project-ops-health.mjs", "release-check.mjs", "skill-forward-eval.mjs", "state-prune.mjs", "workflow-state.mjs", "solutions.mjs", "session-history.mjs", "skill-evolution.mjs"]) {
    write(path.join(projectRoot, "scripts", scriptName), "#!/usr/bin/env node\n");
  }
  write(path.join(projectRoot, ".gitignore"), ".codex-context/raw/*\n!.codex-context/raw/.gitkeep\n.codex-context/discussion-state.json\n.skillopt-sleep/\n");

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
    "working-notes.md",
    "learned-instincts.md",
    "dong-skills-outbox.md",
    "solution-index.md",
    "workflow-state.yaml"
  ]) {
    write(path.join(ctx, name), `# ${name}\n`);
  }

  write(path.join(ctx, "spec.md"), `# Spec

## Problem
Fixture.

## Goals
- Fixture.

## Approval Status
Approved by user.

## Truth Hierarchy
- Fixture hierarchy.

## Work Class / Risk Lane
- Lane 1 fixture.

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

## Spec Approval
Approved by user.

## Execution Approval
Approved by user for Traditional task-by-task execution.

## Artifact Readiness
implementation-ready

## Execution Mode
Traditional task-by-task execution.

## Work Class / Risk Lane
Lane 1 fixture.

## Goal Mode Objective
Not selected.

## Runtime Constraints
- Follow the fixture plan.

## Checkpoint Cadence
- Checkpoint after verified fixture work.

## Tasks
- [x] Fixture task.

## Current Step
None.

## Verification
- Fixture check.

## Out Of Scope
- None.
`);

  write(path.join(ctx, "working-notes.md"), `# Working Notes

## Purpose
Fixture investigation notes.

## Current Findings
- Fixture finding.

## Current Hypothesis
- Fixture hypothesis.

## Rejected Paths
- None.

## Open Investigation Questions
- None.

## Next Verification Step
- Fixture verification.

## Promotion Notes
- None.
`);

  write(path.join(ctx, "decisions.md"), `# Decisions

## Active Decisions
- Use the fixture workflow state as the source of truth for this test.
`);

  write(path.join(ctx, "risks.md"), `# Risks

## Active Risks
- Keep fixture mutations isolated to the temporary project.
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

  const approvedSpecHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "spec.md")))
    .digest("hex");
  const approvedPlanHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "plan-progress.md")))
    .digest("hex");
  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
work_lane: lane-1
task_id: task-1
task_generation: 1
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
approved_spec_hash: ${approvedSpecHash}
approved_plan_hash: ${approvedPlanHash}
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
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

function setWorkflowPhase(projectRoot, phase, nextSkill = "brainstorming") {
  const ctx = path.join(projectRoot, ".codex-context");
  const specStatus = phase === "brainstorming" || phase === "spec" ? "living-draft" : "approved";
  const approvedSpecHash = specStatus === "approved"
    ? createHash("sha256").update(fs.readFileSync(path.join(ctx, "spec.md"))).digest("hex")
    : "none";
  const approvedPlanHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "plan-progress.md")))
    .digest("hex");
  write(path.join(projectRoot, ".codex-context", "workflow-state.yaml"), `workflow: standard
work_lane: lane-1
task_id: task-1
task_generation: 1
phase: ${phase}
next_skill: ${nextSkill}
auto_next: true
decision_required: none
spec_status: ${specStatus}
plan_status: approved
approved_spec_hash: ${approvedSpecHash}
approved_plan_hash: ${approvedPlanHash}
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);
  const specFile = path.join(projectRoot, ".codex-context", "spec.md");
  if (fs.existsSync(specFile)) {
    const approval = phase === "brainstorming" || phase === "spec"
      ? "Living Draft / Not Approved."
      : "Approved by user.";
    const spec = fs.readFileSync(specFile, "utf8").replace(
      /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
      `$1${approval}`
    );
    write(specFile, spec);
  }
}

function syncApprovalHashes(projectRoot) {
  const ctx = path.join(projectRoot, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  let state = fs.readFileSync(stateFile, "utf8");
  const specStatus = state.match(/^spec_status:\s*(.+)$/m)?.[1]?.trim() || "not-started";
  const planStatus = state.match(/^plan_status:\s*(.+)$/m)?.[1]?.trim() || "not-started";
  const executionApproval = state.match(/^execution_approval:\s*(.+)$/m)?.[1]?.trim() || "pending";
  const normalizedHash = (file) => createHash("sha256")
    .update(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"), "utf8")
    .digest("hex");
  const specHash = specStatus === "approved"
    ? normalizedHash(path.join(ctx, "spec.md"))
    : "none";
  const planHash = planStatus === "approved" &&
      ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(executionApproval)
    ? normalizedHash(path.join(ctx, "plan-progress.md"))
    : "none";

  for (const [field, value] of [
    ["document_hash_mode", "normalized-v1"],
    ["approved_spec_hash", specHash],
    ["approved_plan_hash", planHash]
  ]) {
    const pattern = new RegExp(`^${field}:.*$`, "m");
    state = pattern.test(state)
      ? state.replace(pattern, `${field}: ${value}`)
      : state.replace(/^plan_status:.*$/m, (line) => `${line}\n${field}: ${value}`);
  }
  write(stateFile, state);
}

function backdateContextFiles(projectRoot, names) {
  const old = new Date(Date.now() - 20_000);
  for (const name of names) {
    const file = path.join(projectRoot, ".codex-context", name);
    if (fs.existsSync(file)) fs.utimesSync(file, old, old);
  }
}

export {
  assert,
  assetGovernance,
  backdateContextFiles,
  bootstrap,
  contextBudgetScript,
  createHash,
  decodePowerShellEncodedCommand,
  escapeRegExp,
  execFileSync,
  fileURLToPath,
  fs,
  git,
  health,
  hook,
  installLockPath,
  installTransactionJournalPath,
  installWindows,
  os,
  path,
  readJson,
  readyHealthFixture,
  readyState,
  readFileAfterUnlock,
  releaseCheck,
  root,
  runHook,
  setWorkflowPhase,
  syncApprovalHashes,
  skillForwardEval,
  skillEvolution,
  sleep,
  solutions,
  spawn,
  statePrune,
  stopProcessTree,
  tempProject,
  test,
  workflowState,
  write,
  writeDongProjectSkillsFixture
};
