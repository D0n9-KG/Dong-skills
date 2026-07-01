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
const installWindows = path.join(root, "scripts", "install-windows.ps1");
const contextBudgetScript = path.join(root, "scripts", "context-budget.mjs");
const statePrune = path.join(root, "scripts", "state-prune.mjs");
const solutions = path.join(root, "scripts", "solutions.mjs");
const health = path.join(root, "scripts", "project-ops-health.mjs");
const assetGovernance = path.join(root, "scripts", "asset-governance.mjs");
const releaseCheck = path.join(root, "scripts", "release-check.mjs");
const workflowState = path.join(root, "scripts", "workflow-state.mjs");
const skillEvolution = path.join(root, "scripts", "skill-evolution.mjs");

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
  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
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
  for (const eventName of ["SessionStart", "UserPromptSubmit", "PostToolUse", "PreCompact", "PostCompact", "Stop"]) {
    hooks[eventName] = [{ hooks: [{ command: "node .codex/hooks/project-ops.mjs" }] }];
  }

  write(path.join(projectRoot, ".codex", "hooks.json"), JSON.stringify({ hooks }, null, 2));
  write(path.join(projectRoot, ".codex", "hooks", "project-ops.mjs"), "console.log('root hook');\n");
  write(path.join(projectRoot, ".codex", "hooks", "launch-project-ops.mjs"), "console.log('launcher');\n");
  write(path.join(projectRoot, ".codex", "scripts", "lib", "core.mjs"), "export const value = 1;\n");
  for (const scriptName of ["instincts.mjs", "asset-governance.mjs", "project-ops-health.mjs", "release-check.mjs", "state-prune.mjs", "workflow-state.mjs", "solutions.mjs", "session-history.mjs", "skill-evolution.mjs"]) {
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
Approved by fixture.

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
Approved by fixture.

## Execution Approval
Approved by user for Traditional task-by-task execution.

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

  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
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
  write(path.join(projectRoot, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: ${phase}
next_skill: ${nextSkill}
auto_next: true
decision_required: none
spec_status: ${phase === "brainstorming" || phase === "spec" ? "living-draft" : "approved"}
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
handoff_hash: null
updated_at: fixture
note: fixture
`);
}

function backdateContextFiles(projectRoot, names) {
  const old = new Date(Date.now() - 20_000);
  for (const name of names) {
    const file = path.join(projectRoot, ".codex-context", name);
    if (fs.existsSync(file)) fs.utimesSync(file, old, old);
  }
}

test("brainstorming skill preserves upstream continuation loop", () => {
  const skill = fs.readFileSync(path.join(root, ".agents", "skills", "brainstorming", "SKILL.md"), "utf8");

  assert.match(skill, /## Continuation Loop/);
  assert.match(skill, /## Truth Hierarchy And Risk Lane/);
  assert.match(skill, /After every user response during brainstorming/);
  assert.match(skill, /ask the next single highest-impact question/);
  assert.match(skill, /Do not end a brainstorming turn by only saying that files were updated/);
  assert.match(skill, /compare 2-3 viable approaches/);
  assert.match(skill, /The spec should lock the What/);
  assert.match(skill, /WHEN \[条件\], THE SYSTEM SHALL \[行为\]/);
  assert.match(skill, /## Final Spec Gate/);
  assert.match(skill, /workflow-state transition spec-living/);
  assert.match(skill, /workflow-state transition spec-ready/);
  assert.match(skill, /workflow-state transition spec-approved/);
  assert.match(skill, /Pending written-spec approval/);
  assert.match(skill, /fresh session could write a plan from the spec file/);
  assert.match(skill, /written-spec approval/);
  assert.match(skill, /working-notes\.md/);
  assert.match(skill, /Do not store hidden chain-of-thought/);
  assert.match(skill, /"可以", "继续"/);
});

test("borrowed workflow skills retain required upstream gates", () => {
  const readSkill = (name) => fs.readFileSync(path.join(root, ".agents", "skills", name, "SKILL.md"), "utf8");

  const writing = readSkill("writing-plans");
  assert.match(writing, /## Scope Check/);
  assert.match(writing, /## Test-First Default/);
  assert.match(writing, /## Simplicity Gate/);
  assert.match(writing, /## Work Class \/ Risk Lane/);
  assert.match(writing, /Can this be avoided/);
  assert.match(writing, /standard library already do it/);
  assert.match(writing, /native platform already do it/);
  assert.match(writing, /Do not add the Ponytail one-line\/minimum-implementation rungs/);
  assert.match(writing, /Lane 0/);
  assert.match(writing, /Lane 3/);
  assert.match(writing, /## 执行备注/);
  assert.match(writing, /2-5 minute steps/);
  assert.match(writing, /## 验收映射/);
  assert.match(writing, /## 执行模式/);
  assert.match(writing, /Traditional task-by-task execution/);
  assert.match(writing, /Codex Goal mode/);
  assert.match(writing, /## Goal 模式目标草案/);
  assert.match(writing, /## 运行约束/);
  assert.match(writing, /## 存档节奏/);
  assert.match(writing, /workflow-state transition plan-ready/);

  const debugging = readSkill("systematic-debugging");
  assert.match(debugging, /Reproduction is the entry ticket to fixing/);
  assert.match(debugging, /reliable automated failing test or command/);
  assert.match(debugging, /manual reproduction and verification gap/);
  assert.doesNotMatch(debugging, /'"'"'/);

  const executing = readSkill("executing-plans");
  assert.match(executing, /Run the Simplicity Gate before adding code/);
  assert.match(executing, /can the approved outcome be reached by avoiding the new thing/);
  assert.match(executing, /does the standard library already do it/);
  assert.match(executing, /does the native platform already do it/);
  assert.match(executing, /dong-debt:/);
  assert.match(executing, /工作类别 \/ 风险等级/);
  assert.match(executing, /legacy English equivalents/);
  assert.match(executing, /Match execution depth to the lane/);
  assert.match(executing, /Run Test Discovery before editing implementation files/);
  assert.match(executing, /For behavior-changing tasks, add\/update the planned test/);
  assert.match(executing, /## Review And Shipping Gate/);
  assert.match(executing, /## Execution Modes/);
  assert.match(executing, /Traditional Task-By-Task Execution/);
  assert.match(executing, /Codex Goal mode/);
  assert.match(executing, /Goal Mode Objective/);
  assert.match(executing, /Runtime Constraints/);
  assert.match(executing, /Checkpoint Cadence/);
  assert.match(executing, /## Stop Conditions/);
  assert.match(executing, /create_goal/);
  assert.match(executing, /Do not simulate Goal mode/);
  assert.match(executing, /workflow-state check execution/);
  assert.match(executing, /workflow-state transition execution-complete/);

  const router = readSkill("using-superpowers");
  assert.match(router, /written spec is approved/);
  assert.match(router, /Workflow State Gate/);
  assert.match(router, /workflow-state next/);
  assert.match(router, /codex-simplicity-review/);
  assert.match(router, /can avoid building, standard library, native platform/);
  assert.match(router, /Use the lowest sufficient work lane/);
  assert.match(router, /truth hierarchy/);
  assert.match(router, /Decision Point Protocol/);
  assert.match(router, /Execution Mode/);
  assert.match(router, /Plan-then-execute without an explicit Goal mode request means Traditional task-by-task execution/);
  assert.match(router, /Codex Goal mode requires an explicit user choice/);
  assert.match(router, /actual goal mechanism/);
  assert.match(router, /working-notes\.md/);
  assert.match(router, /hidden chain-of-thought/);
  assert.match(router, /codex-skill-evolution/);

  const governance = readSkill("codex-project-governance");
  assert.match(governance, /workflow-state\.yaml/);
  assert.match(governance, /workflow-state transition/);
  assert.match(governance, /codex-simplicity-review/);
  assert.match(governance, /Use this truth hierarchy/);
  assert.match(governance, /`spec\.md` is a current-task intent and acceptance record/);
  assert.match(governance, /lowest sufficient lane/);
  assert.match(governance, /Hook output includes a compact status line/);
  assert.match(governance, /discussion-state\.json/);
  assert.match(governance, /working-notes\.md/);
  assert.match(governance, /codex-skill-evolution/);
  assert.match(governance, /SkillOpt-Sleep/);

  const requestingReview = readSkill("requesting-code-review");
  assert.match(requestingReview, /## Mandatory Review Gate/);
  assert.match(requestingReview, /record the low-risk reason/);

  const reviewPanel = readSkill("codex-review-panel");
  assert.match(reviewPanel, /## Mandatory Panel Triggers/);
  assert.match(reviewPanel, /verification gaps, manual-only evidence/);
  assert.match(reviewPanel, /Simplicity: whether the diff should avoid building/);
  assert.match(reviewPanel, /delete`, `stdlib`, `native`, `yagni`, `shrink`, or `dong-debt/);

  const simplicity = readSkill("codex-simplicity-review");
  assert.match(simplicity, /## Simplicity Gate/);
  assert.match(simplicity, /Avoid building/);
  assert.match(simplicity, /Standard library/);
  assert.match(simplicity, /Native platform/);
  assert.match(simplicity, /Do not make one-line\/minimum-implementation checks mandatory/);
  assert.match(simplicity, /dong-debt: <ceiling>; revisit when <trigger>/);

  const worktree = readSkill("codex-worktree-governance");
  assert.match(worktree, /## Branch Finishing Menu/);
  assert.match(worktree, /Merge locally into <base-branch>/);
  assert.match(worktree, /Discard this work/);
  assert.match(worktree, /Never remove a `codex-managed-worktree`/);

  const checkpoint = readSkill("codex-git-checkpoint");
  assert.match(checkpoint, /## Branch Completion Boundary/);
  assert.match(checkpoint, /fixed finishing menu/);

  const evidence = readSkill("codex-evidence-capture");
  assert.match(evidence, /Direct product use can count as product evidence/);
  assert.match(evidence, /shipped CLI/);

  const skillEvolutionText = readSkill("codex-skill-evolution");
  assert.match(skillEvolutionText, /offline, validation-gated SkillOpt-Sleep runs/);
  assert.match(skillEvolutionText, /Do not run SkillOpt-Sleep from `Stop`, `PreCompact`, `PostToolUse`/);
  assert.match(skillEvolutionText, /Do not use `--auto-adopt`/);
  assert.match(skillEvolutionText, /adopt --confirm-reviewed/);

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
          assert.match(decoded, /Get-Command pwsh/);
          assert.match(decoded, /-EncodedCommand/);
          assert.match(decoded, /\}\s*else\s*\{/);
          assert.match(decoded, /git rev-parse --show-toplevel/);
          assert.match(decoded, /Join-Path/);
          assert.match(decoded, /\.codex\/hooks\/launch-project-ops\.mjs/);
        }
      }
    }
  }
});

test("PostToolUse hook matcher covers shell-based file writes", () => {
  const hookJsonFiles = [
    path.join(root, ".codex", "hooks.json"),
    path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks.json")
  ];

  for (const file of hookJsonFiles) {
    const config = readJson(file);
    const matcher = config.hooks.PostToolUse[0].matcher;
    assert.match(matcher, /Edit/);
    assert.match(matcher, /Write/);
    assert.match(matcher, /apply_patch/);
    assert.match(matcher, /Read/);
    assert.match(matcher, /Grep/);
    assert.match(matcher, /Glob/);
    assert.match(matcher, /codegraph/);
    assert.match(matcher, /web/);
    assert.match(matcher, /browser/);
    assert.match(matcher, /shell_command/);
    assert.match(matcher, /Bash/);
    assert.match(matcher, /PowerShell/);
  }
});

test("session-history CLI accepts an explicit project root argument", () => {
  const project = tempProject();
  git(project, ["init"]);

  const out = execFileSync(process.execPath, [hook, "session-history", project, "scan", "--days", "1", "--keywords", "test"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills session history scan/);
  assert.match(out.replace(/\\/g, "/"), new RegExp(`Root: ${escapeRegExp(project.replace(/\\/g, "/"))}`));
});

test("context-budget reports hot warm and cold context paths", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "AGENTS.md"), "# Project Instructions\n\nUse Dong Skills.\n");
  write(path.join(project, ".codex", "scripts", "lib", "core.mjs"), `export const fixture = ${JSON.stringify("runtime ".repeat(600))};\n`);

  const hookOut = execFileSync(process.execPath, [hook, "context-budget", project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const scriptOut = execFileSync(process.execPath, [contextBudgetScript, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  for (const out of [hookOut, scriptOut]) {
    assert.match(out, /Estimated total scanned:/);
    assert.match(out, /Hot recovery path:/);
    assert.match(out, /Warm on-demand path:/);
    assert.match(out, /Cold runtime\/bootstrap path:/);
    assert.match(out, /Hot budget status: ok/);
    assert.match(out, /Workflow next skill: executing-plans/);
    assert.match(out, /Largest hot files:/);
    assert.match(out, /Largest warm\/cold files:/);
    assert.match(out, /AGENTS\.md: .*recovery\/router path/);
    assert.match(out, /\.codex\/scripts\/lib\/core\.mjs: .*runtime\/bootstrap maintenance/);
  }
});

test("deleted project files still preserve freshness after state refresh", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);

  write(path.join(project, "tracked.txt"), "tracked\n");
  git(project, ["add", "tracked.txt"]);
  git(project, ["commit", "-m", "init"]);

  fs.unlinkSync(path.join(project, "tracked.txt"));
  readyState(project, `- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: tracked.txt
- Deferred reason: deletion is part of the current work
- Next checkpoint: commit after fixture completes
`);

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(output, {});
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

test("published Windows hook prefers pwsh but keeps powershell fallback", () => {
  const config = readJson(path.join(root, ".codex", "hooks.json"));
  const command = config.hooks.SessionStart[0].hooks[0].commandWindows;
  const outer = decodePowerShellEncodedCommand(command);
  assert.match(outer, /Get-Command pwsh/);
  assert.match(outer, /& \$pwsh\.Source -NoProfile -EncodedCommand/);
  assert.match(outer, /\} else \{/);
  assert.match(outer, /git rev-parse --show-toplevel/);

  const innerMatch = outer.match(/-EncodedCommand\s+([A-Za-z0-9+/=]+)/);
  assert.ok(innerMatch, "pwsh branch should pass an encoded inner command");
  const inner = Buffer.from(innerMatch[1], "base64").toString("utf16le");
  assert.match(inner, /git rev-parse --show-toplevel/);
  assert.match(inner, /launch-project-ops\.mjs/);
});

test("bootstrap adds raw runtime ignore rules to target .gitignore", () => {
  const project = tempProject();
  write(path.join(project, ".agents", "skills", "local-only-skill", "SKILL.md"), "---\nname: local-only-skill\n---\n");

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
  assert.match(gitignore, /\.codex-context\/discussion-state\.json/);
  assert.match(gitignore, /\.skillopt-sleep\//);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "lib", "core.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "lib", "workflow.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "state-prune.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "workflow-state.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "asset-governance.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "solutions.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "session-history.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "skill-evolution.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "hooks", "launch-project-ops.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "archive", ".gitkeep")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "solution-index.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "worktree-state.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "workflow-state.yaml")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "dong-skills-outbox.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "working-notes.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", ".dong-skill-managed.json")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "brainstorming", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "local-only-skill", "SKILL.md")), true);
  assert.match(fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8"), /next_skill: codex-codebase-onboarding/);
  const spec = fs.readFileSync(path.join(project, ".codex-context", "spec.md"), "utf8");
  assert.match(spec, /## 审批状态/);
  assert.match(spec, /## 事实优先级/);
  assert.match(spec, /## 工作类别 \/ 风险等级/);
  const planProgress = fs.readFileSync(path.join(project, ".codex-context", "plan-progress.md"), "utf8");
  assert.match(planProgress, /## 规格审批/);
  assert.match(planProgress, /## 执行审批/);
  assert.match(planProgress, /## 工作类别 \/ 风险等级/);
  assert.match(planProgress, /## 执行模式/);
  assert.match(planProgress, /## Goal 模式目标/);
  assert.match(planProgress, /当前 Codex session 可用的 goal 机制/);
  assert.match(planProgress, /## 运行约束/);
  assert.match(planProgress, /## 存档节奏/);

  const installedHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  const recovery = execFileSync(process.execPath, [installedHook], {
    cwd: project,
    input: JSON.stringify({ cwd: project, hook_event_name: "SessionStart" }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  const context = JSON.parse(recovery).hookSpecificOutput.additionalContext;
  assert.match(context, /2\. \.codex-context\/worktree-state\.md/);
  assert.match(context, /3\. \.codex-context\/workflow-state\.yaml/);
  assert.match(context, /7\. \.codex-context\/decisions\.md/);
  assert.match(context, /8\. \.codex-context\/open-questions\.md/);
  assert.match(context, /9\. \.codex-context\/working-notes\.md/);
  assert.match(context, /12\. \.codex-context\/solution-index\.md/);
  assert.match(context, /14\. \.codex-context\/dong-skills-outbox\.md only when discussing Dong Skills improvements/);
  assert.match(context, /15\. STRATEGY\.md, CONCEPTS\.md, or relevant docs\/solutions entries only when the task needs them/);
  assert.match(context, /Workflow recovery:/);
});

test("Windows installer preserves existing UTF-8 Chinese AGENTS.md", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const originalChinese = "中文规则：保持原文。";
  write(path.join(project, "AGENTS.md"), `# Project Instructions\n\n${originalChinese}\n`);

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const agents = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.match(agents, new RegExp(escapeRegExp(originalChinese)));
  assert.doesNotMatch(agents, /\uFFFD/);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-project-governance", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, "brainstorming", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, ".dong-skills-source.json")), true);
  const sourceMarker = readJson(path.join(skillsRoot, ".dong-skills-source.json"));
  assert.deepEqual(sourceMarker.global_bootstrap_skills, ["codex-codebase-onboarding", "using-superpowers"]);
  assert.ok(sourceMarker.global_skills.includes("codex-skill-evolution"));
});

test("Windows installer removes only managed Dong global skills and preserves non-Dong local skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");

  write(path.join(skillsRoot, "doc", "SKILL.md"), "---\nname: doc\n---\n\n# User doc skill\n");
  write(path.join(skillsRoot, "codex-project-governance", "SKILL.md"), "---\nname: codex-project-governance\n---\n\n# Codex Project Governance\nDong Skills old global copy.\n");
  write(path.join(skillsRoot, "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n\n# Brainstorming\nDong Skills old global copy.\n");

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.existsSync(path.join(skillsRoot, "doc", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-project-governance", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, "brainstorming", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
});

test("Windows installer preserves same-name non-Dong global skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const userSkill = path.join(skillsRoot, "codex-project-governance", "SKILL.md");
  const userSkillText = "---\nname: codex-project-governance\n---\n\n# User governance helper\nThis is a personal unrelated skill.\n";
  write(userSkill, userSkillText);

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.readFileSync(userSkill, "utf8"), userSkillText);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
});

test("bootstrap refuses to overwrite same-name non-Dong project skills", () => {
  const project = tempProject();
  const userSkill = path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md");
  const userSkillText = "---\nname: codex-project-governance\n---\n\n# User project governance helper\nThis is not a Dong-managed skill.\n";
  write(userSkill, userSkillText);

  assert.throws(() => {
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      bootstrap,
      "-TargetProjectRoot",
      project
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  }, /Command failed/);

  assert.equal(fs.readFileSync(userSkill, "utf8"), userSkillText);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")), false);
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

test("workflow-state exposes deterministic transition, next, recover, and hash commands", () => {
  const project = tempProject();
  git(project, ["init"]);

  let out = execFileSync(process.execPath, [workflowState, project, "init"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Initialized workflow state/);

  out = execFileSync(process.execPath, [workflowState, project, "transition", "brainstorming-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /phase: brainstorming/);
  assert.match(out, /next_skill: brainstorming/);

  out = execFileSync(process.execPath, [workflowState, project, "transition", "spec-ready"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /decision_required: written-spec-approval/);

  out = execFileSync(process.execPath, [workflowState, project, "next"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /NEXT: manual/);
  assert.match(out, /SKILL: brainstorming/);
  assert.match(out, /written-spec-approval/);

  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /phase: spec/);
  assert.match(state, /spec_status: pending-approval/);

  out = execFileSync(process.execPath, [workflowState, project, "recover"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow recovery/);
  assert.match(out, /next: manual/);

  out = execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /CONTEXT_HASH: [a-f0-9]{64}/);
  assert.match(fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8"), /handoff_hash: [a-f0-9]{64}/);
});

test("project hook forwards workflow-state commands", () => {
  const project = tempProject();
  git(project, ["init"]);

  let out = execFileSync(process.execPath, [hook, "workflow-state", "init"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Initialized workflow state/);

  out = execFileSync(process.execPath, [hook, "workflow-state", "next"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /NEXT: auto/);
  assert.match(out, /SKILL: codex-codebase-onboarding/);

  out = execFileSync(process.execPath, [hook, "workflow-state", "recover"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow recovery/);
  assert.match(out, /next: auto/);

  out = execFileSync(process.execPath, [hook, "workflow-state", project, "next"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /NEXT: auto/);
});

test("workflow-state checks report missing state without recreating it", () => {
  const project = tempProject();
  git(project, ["init"]);
  const workflowFile = path.join(project, ".codex-context", "workflow-state.yaml");

  let out = execFileSync(process.execPath, [hook, "workflow-state", "next"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /NEXT: manual/);
  assert.match(out, /workflow-state\.yaml needs repair/);
  assert.equal(fs.existsSync(workflowFile), false);

  out = execFileSync(process.execPath, [hook, "workflow-state", "recover"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow recovery/);
  assert.match(out, /workflow-state\.yaml is missing/);
  assert.equal(fs.existsSync(workflowFile), false);

  const stopOutput = runHook(project, { hook_event_name: "Stop" });
  assert.equal(stopOutput.decision, "block");
  assert.equal(Object.hasOwn(stopOutput, "continue"), false);
  assert.equal(Object.hasOwn(stopOutput, "stopReason"), false);
  assert.equal(Object.hasOwn(stopOutput, "systemMessage"), false);
  assert.equal(Object.hasOwn(stopOutput, "hookSpecificOutput"), false);
  assert.match(stopOutput.reason, /workflow-state\.yaml is missing/);
  assert.equal(fs.existsSync(workflowFile), false);

  const compactOutput = runHook(project, { hook_event_name: "PreCompact", trigger: "manual" });
  assert.equal(compactOutput.continue, false);
  assert.match(compactOutput.systemMessage, /workflow-state\.yaml is missing/);
  assert.equal(fs.existsSync(workflowFile), false);
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
    "-----BEGIN PRIVATE KEY----- codex-release-check: allow-secret-fixture",
    "ABCDEF1234567890SECRET",
    "-----END PRIVATE KEY-----",
    "https://user:pass@example.com/path?token=abc#frag" // codex-release-check: allow-secret-fixture
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

test("learning observations redact common PII and platform tokens", () => {
  const project = tempProject();
  const email = ["alice", "private.test"].join("@");
  const phone = ["+1", "(415)", "555-1212"].join(" ");
  const githubToken = ["ghp", "A".repeat(24)].join("_");
  const anthropicKey = ["sk-ant", "B".repeat(28)].join("-");
  const prompt = [
    "remember this rule",
    `C:\\Users\\Alice ${email} ${phone} ${githubToken} ${anthropicKey}`
  ].join(" ");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: prompt
  });

  const obs = fs.readFileSync(path.join(project, ".codex-context", "raw", "observations.jsonl"), "utf8");
  const event = JSON.parse(obs.trim());
  assert.doesNotMatch(event.prompt_excerpt, /Alice/);
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(email)));
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(githubToken)));
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(anthropicKey)));
  assert.ok(event.prompt_excerpt.includes("C:\\Users\\[redacted]"));
  assert.match(event.prompt_excerpt, /\[redacted-email\]/);
  assert.match(event.prompt_excerpt, /\[redacted-phone\]/);
  assert.match(event.prompt_excerpt, /\[redacted-github-token\]/);
  assert.match(event.prompt_excerpt, /\[redacted-anthropic-key\]/);
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

test("skill-evolution collects backlog candidates into reviewed-task draft", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "docs", "improvements", "backlog.md"), `# Backlog

## Items

### 2026-06-30 - Brainstorming should continue one question at a time

Status: accepted
Priority: P0
Affected area: brainstorming / SkillOpt

Signal:
The brainstorming skill sometimes stops after updating files instead of asking the next focused question.
`);
  write(path.join(project, ".agents", "skills", "codex-skill-evolution", "SKILL.md"), "---\nname: codex-skill-evolution\n---\n");
  write(path.join(project, ".agents", "skills", "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n");

  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  const out = execFileSync(process.execPath, [skillEvolution, project, "collect-candidates", "--output", tasksFile], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: project, DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Tasks: 1/);
  const payload = readJson(tasksFile);
  assert.equal(payload.format, "skillopt_sleep.tasks.v1");
  assert.equal(payload.reviewed, false);
  assert.equal(payload.tasks.length, 1);
  assert.match(payload.tasks[0].intent, /Brainstorming should continue/);
  assert.equal(payload.tasks[0].reference_kind, "rule");
  assert.equal(payload.tasks[0].judge.checks.some((check) => check.arg === "ask one focused next question"), true);
});

test("skill-evolution uses Dong Skills source repo when invoked from a business project", () => {
  const source = tempProject();
  const business = tempProject();
  write(path.join(source, "docs", "improvements", "backlog.md"), `# Backlog

### 2026-06-30 - Hook status should explain stale handoff evidence

Status: accepted
Priority: P1
Affected area: hooks / checkpoint
`);
  write(path.join(source, ".agents", "skills", "codex-skill-evolution", "SKILL.md"), "---\nname: codex-skill-evolution\n---\n");
  write(path.join(source, ".agents", "skills", "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n");
  write(path.join(business, ".codex-context", "dong-skills-outbox.md"), `# Dong Skills Outbox

### 2026-06-30 - Brainstorming should ask one next question

Status: pending
Priority: P0
Affected area: brainstorming
`);

  const tasksFile = path.join(source, ".codex-context", "raw", "skill-evolution-tasks.json");
  const out = execFileSync(process.execPath, [skillEvolution, business, "collect-candidates"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: source, DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, new RegExp(`Dong Skills repo: ${escapeRegExp(source)}`));
  assert.match(out, /Repo source: DONG_SKILLS_REPO/);
  assert.match(out, /Tasks: 2/);
  assert.equal(fs.existsSync(tasksFile), true);
  assert.equal(fs.existsSync(path.join(business, ".codex-context", "raw", "skill-evolution-tasks.json")), false);
  const payload = readJson(tasksFile);
  assert.equal(payload.project, source);
  assert.equal(payload.invocation_project, business);
  assert.equal(payload.tasks.length, 2);
  assert.equal(payload.tasks.some((task) => task.source_sessions.some((sourcePath) => sourcePath.includes("dong-skills-outbox.md"))), true);
});

test("skill-evolution safety gates reject unreviewed run and unconfirmed adopt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  write(tasksFile, JSON.stringify({
    format: "skillopt_sleep.tasks.v1",
    project,
    reviewed: false,
    tasks: []
  }, null, 2));

  assert.throws(() => {
    execFileSync(process.execPath, [skillEvolution, project, "run", "--tasks-file", tasksFile, "--backend", "mock"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  assert.throws(() => {
    execFileSync(process.execPath, [skillEvolution, project, "adopt"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("project hook dispatches skill-evolution status", () => {
  const project = tempProject();
  readyHealthFixture(project);

  const out = execFileSync(process.execPath, [hook, "skill-evolution", project, "status"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills SkillOpt-Sleep integration status/);
  assert.match(out, /SkillOpt-Sleep available:/);
  assert.match(out, /Safety:/);
});

test("Stop requires structured Git Checkpoint fields when worktree is dirty", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "dirty\n");

  readyState(project, "- checkpoint noted but not structured\n");
  const vague = runHook(project, { hook_event_name: "Stop" });
  assert.equal(vague.decision, "block");
  assert.equal(Object.hasOwn(vague, "continue"), false);
  assert.equal(Object.hasOwn(vague, "stopReason"), false);
  assert.match(vague.reason, /Git Checkpoint missing field/);

  readyState(project, `- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: test fixture keeps dirty work uncommitted
- Next checkpoint: commit after fixture completes
`);
  const structured = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(structured, {});
});

test("Stop accepts Chinese Git checkpoint field labels", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "dirty\n");

  readyState(project, `- 最新提交: not ready
- 推送状态: not pushed because work is intentionally deferred
- 已包含文件: none
- 有意保留未提交的文件: work.txt
- 暂缓原因: test fixture keeps dirty work uncommitted
- 下次存档: commit after fixture completes
`);
  const structured = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(structured, {});
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
  assert.match(output.reason, /Hook status:/);
  assert.match(output.reason, /Actual Git root:/);
  assert.match(output.reason, /Latest changed file: work\.txt/);
  assert.match(output.reason, /Workflow: phase=execution next_skill=executing-plans/);
  assert.match(output.reason, /handoff-summary\.md is older than changed files/);
  assert.match(output.reason, /latest changed file: work\.txt/);
  assert.match(output.reason, /refresh handoff-summary\.md after verification\/artifact\/current-state updates/);
});

test("Stop freshness does not chase newer governance state files", () => {
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

  write(path.join(project, ".codex-context", "artifact-index.md"), "# Artifact Index\n\n## Modified\n- work.txt\n");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- fixture verification.\n");
  write(path.join(project, ".codex-context", "handoff-summary.md"), `# Handoff Summary

## Objective
Fixture.

## Latest User Instruction
Fixture.

## Approved Scope / Spec
Fixture.

## Plan Status
Fixture.

## Files Modified
- work.txt

## Decisions Made
- Fixture.

## Verification Evidence
- fixture verification.

## Git Checkpoint
- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: test fixture keeps dirty work uncommitted
- Next checkpoint: commit after fixture completes

## Next Action
Continue.

## Files To Re-read First
- work.txt
`);
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nContinue.\n");

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(output, {});
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
    assert.match(String(error.stdout), /spec\.md missing section: Approval Status or 审批状态/);
    assert.match(String(error.stdout), /spec\.md missing section: Truth Hierarchy or 事实优先级/);
    assert.match(String(error.stdout), /spec\.md missing section: Work Class \/ Risk Lane or 工作类别 \/ 风险等级/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Spec Approval or 规格审批/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Execution Approval or 执行审批/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Work Class \/ Risk Lane or 工作类别 \/ 风险等级/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Execution Mode or 执行模式/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Goal Mode Objective or Goal 模式目标/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Runtime Constraints or 运行约束/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Checkpoint Cadence or 存档节奏/);
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

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check accepts Chinese state document headings", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");

  write(path.join(ctx, "spec.md"), `# 规格

## 问题
Fixture.

## 目标
- Fixture.

## 审批状态
Approved by fixture.

## 事实优先级
- Fixture hierarchy.

## 工作类别 / 风险等级
- Lane 1 fixture.

## 已批准范围
- Fixture.

## 验收标准
- Fixture passes.

## 开放问题
- 无。

## 下一步
Continue.
`);

  write(path.join(ctx, "plan-progress.md"), `# 计划进度

## 当前计划
Fixture.

## 规格审批
Approved by fixture.

## 执行审批
Approved by user for Traditional task-by-task execution.

## 执行模式
Traditional task-by-task execution.

## 工作类别 / 风险等级
Lane 1 fixture.

## Goal 模式目标
未选择。

## 运行约束
- Follow the fixture plan.

## 存档节奏
- Checkpoint after verified fixture work.

## 任务
- [x] Fixture task.

## 当前步骤
无。

## 验证
- Fixture check.

## 范围外
- 无。
`);

  write(path.join(ctx, "working-notes.md"), `# 工作笔记

## 用途
Fixture investigation notes.

## 当前发现
- Fixture finding.

## 当前假设
- Fixture hypothesis.

## 已排除路径
- 无。

## 开放调查问题
- 无。

## 下一步验证
- Fixture verification.

## 提升记录
- 无。
`);

  write(path.join(ctx, "worktree-state.md"), `# Worktree 状态

## 当前工作区
- Role: primary-checkout

## 主检出区
- Path: fixture

## 分支状态
- Branch: fixture

## 所有权与清理
- Cleanup owner: none

## Hook 根目录记录
- Actual Git root: fixture

## 恢复指令
- Re-detect before cleanup.
`);

  write(path.join(ctx, "handoff-summary.md"), `# Handoff 摘要

## 目标
Test.

## 最新用户指令
Test.

## 已批准范围 / 规格
Test.

## 计划状态
Test.

## 已修改文件
None.

## 已做决策
None.

## 验证证据
Fixture.

## Git 存档
- 最新提交: fixture
- 推送状态: not pushed
- 已包含文件: none
- 有意保留未提交的文件: none
- 暂缓原因: none
- 下次存档: none

## 下一步动作
Continue.

## 优先重读文件
- .codex-context/handoff-summary.md
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("Stop does not require verification or checkpoint for docs-only discussion changes", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");
  git(project, ["add", "."]);
  git(project, ["commit", "-m", "baseline"]);
  backdateContextFiles(project, ["verification.md", "handoff-summary.md"]);

  write(path.join(project, "docs", "notes.md"), "docs-only discussion change\n");
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nRefresh docs state.\n");
  write(path.join(project, ".codex-context", "artifact-index.md"), "# Artifact Index\n\n## Modified\n- docs/notes.md: docs-only discussion change.\n");
  const refreshed = new Date();
  for (const name of ["current-state.md", "artifact-index.md"]) {
    const file = path.join(project, ".codex-context", name);
    fs.utimesSync(file, refreshed, refreshed);
  }

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(output, {});
});

test("Stop still requires verification and checkpoint for code changes during discussion phases", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");
  git(project, ["add", "."]);
  git(project, ["commit", "-m", "baseline"]);
  backdateContextFiles(project, ["verification.md", "handoff-summary.md"]);

  write(path.join(project, "src", "runtime.mjs"), "export const value = 1;\n");
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nRefresh code state.\n");
  write(path.join(project, ".codex-context", "artifact-index.md"), "# Artifact Index\n\n## Modified\n- src/runtime.mjs: code change.\n");
  const refreshed = new Date();
  for (const name of ["current-state.md", "artifact-index.md"]) {
    const file = path.join(project, ".codex-context", name);
    fs.utimesSync(file, refreshed, refreshed);
  }

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /verification\.md is older than changed files/);
  assert.match(output.reason, /verification\.md has neither command evidence nor explicit unverified gaps/);
  assert.match(output.reason, /Git checkpoint needs review:/);
});

test("health check accepts codex-simplicity-review as workflow next skill", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: review
next_skill: codex-simplicity-review
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pass
review_status: pending
checkpoint_status: pending
handoff_hash: null
updated_at: fixture
note: fixture
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check rejects invalid workflow state", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: flying
next_skill: freestyle-agent
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: improvise
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
`);

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /workflow-state\.yaml invalid phase: flying/);
    assert.match(String(error.stdout), /workflow-state\.yaml invalid next_skill: freestyle-agent/);
    assert.match(String(error.stdout), /workflow-state\.yaml invalid execution_mode: improvise/);
  }
  assert.equal(failed, true);
});

test("health check requires project-level Dong Skills marker", () => {
  const project = tempProject();
  readyHealthFixture(project);
  fs.rmSync(path.join(project, ".agents", "skills", ".dong-skills-project.json"));

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /Missing project-level Dong Skills marker/);
  }
  assert.equal(failed, true);
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

test("bootstrapped project hook release-check resolves .codex helper scripts", () => {
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

  const installedHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  const out = execFileSync(process.execPath, [installedHook, "release-check"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /PASS health-check/);
  assert.match(out, /PASS context budget scan/);
  assert.match(out, /Result: pass/);
});

test("release check fails when hot context budget exceeds fail threshold", () => {
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

  fs.appendFileSync(path.join(project, "AGENTS.md"), `\n\n## Oversized Fixture\n\n${"context ".repeat(36_000)}\n`, "utf8");

  const installedHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  let failed = false;
  try {
    execFileSync(process.execPath, [installedHook, "release-check"], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL context budget scan/);
    assert.match(String(error.stdout), /Hot budget status: fail/);
  }
  assert.equal(failed, true);
});

test("release check scans tests for secrets", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const fakeToken = ["ghp", "A".repeat(24)].join("_");
  write(path.join(project, "tests", "secret.test.mjs"), `// ${fakeToken}\n`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL privacy scan/);
    assert.match(String(error.stdout), /tests\/secret\.test\.mjs:1: GitHub token/);
  }
  assert.equal(failed, true);
});

test("release check rejects oversized text assets", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "docs", "huge.md"), `# Huge\n\n${"x".repeat(513 * 1024)}\n`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL large file scan/);
    assert.match(String(error.stdout), /docs\/huge\.md:/);
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
  write(path.join(project, ".codex-context", "working-notes.md"), `# Working Notes

## Current Findings
- Critical recovered investigation finding.

## Next Verification Step
- Re-run the fixture check.
`);
  write(path.join(project, ".codex-context", "plan-progress.md"), "# Plan Progress\n\n## Current Step\nResume.\n");
  write(path.join(project, ".codex-context", "solution-index.md"), "# Solution Index\n\n## Knowledge Store\n- docs/solutions present: yes\n");
  write(path.join(project, ".codex-context", "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- None.\n");
  write(path.join(project, ".codex-context", "worktree-state.md"), "# Worktree State\n\n## Current Workspace\n- Role: primary-checkout\n");
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: delivery
next_skill: verification-before-completion
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pass
review_status: done
checkpoint_status: done
handoff_hash: null
updated_at: fixture
note: fixture
`);

  const output = runHook(project, { hook_event_name: "SessionStart" });
  const context = output.hookSpecificOutput.additionalContext;
  assert.match(context, /Hook status:/);
  assert.match(context, /Actual Git root:/);
  assert.match(context, /Workflow: phase=delivery next_skill=verification-before-completion decision_required=none issues=0/);
  assert.match(context, /Assets: ok/);
  assert.match(context, /2\. \.codex-context\/worktree-state\.md/);
  assert.match(context, /3\. \.codex-context\/workflow-state\.yaml/);
  assert.match(context, /7\. \.codex-context\/decisions\.md/);
  assert.match(context, /8\. \.codex-context\/open-questions\.md/);
  assert.match(context, /9\. \.codex-context\/working-notes\.md/);
  assert.match(context, /12\. \.codex-context\/solution-index\.md/);
  assert.match(context, /14\. \.codex-context\/dong-skills-outbox\.md only when discussing Dong Skills improvements/);
  assert.match(context, /15\. STRATEGY\.md, CONCEPTS\.md, or relevant docs\/solutions entries only when the task needs them/);
  assert.match(context, /Worktree: role=unknown/);
  assert.match(context, /Workflow recovery:/);
  assert.match(context, /phase: delivery/);
  assert.match(context, /## Git Checkpoint/);
  assert.match(context, /## Next Action\nResume final task\./);
  assert.match(context, /## Files To Re-read First\n- important\.md/);
  assert.match(context, /Solution index excerpt:/);
  assert.match(context, /docs\/solutions present: yes/);
  assert.match(context, /Working notes excerpt:/);
  assert.match(context, /Critical recovered investigation finding/);
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
  assert.match(output.reason, /Hook status:/);
  assert.match(output.reason, /Actual Git root:/);
  assert.match(output.reason, /Latest changed file: work\.txt/);
  assert.match(output.reason, /work\.txt/);
});

test("UserPromptSubmit marks discussion state during active brainstorming", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");

  const output = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "确认采用 dedicated working-notes.md，token=secretfixture1234567890" // codex-release-check: allow-secret-fixture
  });

  assert.match(output.hookSpecificOutput.additionalContext, /marked discussion state dirty/);
  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.equal(marker.status, "dirty");
  assert.equal(marker.source, "UserPromptSubmit");
  assert.equal(marker.phase, "brainstorming");
  assert.ok(marker.required_files.includes("spec.md"));
  assert.ok(marker.required_files.includes("current-state.md"));
  assert.ok(marker.required_files.includes("decisions.md"));
  assert.ok(marker.required_files.includes("open-questions.md"));
  assert.ok(marker.required_files.includes("handoff-summary.md"));
  assert.doesNotMatch(marker.prompt_excerpt, /secretfixture1234567890/);
  assert.match(marker.prompt_excerpt, /\[redacted\]/);
});

test("Stop blocks stale discussion state even when no project files changed", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "我们确认这个设计边界，需要继续讨论下一步。"
  });
  backdateContextFiles(project, ["spec.md", "current-state.md", "decisions.md", "open-questions.md", "handoff-summary.md"]);

  const blocked = runHook(project, { hook_event_name: "Stop" });
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /No non-context files changed/);
  assert.match(blocked.reason, /spec\.md is older than latest discussion or investigation marker/);
  assert.match(blocked.reason, /decisions\.md is older than latest discussion or investigation marker/);
  assert.match(blocked.reason, /Discussion: needs-state-refresh/);

  write(path.join(project, ".codex-context", "spec.md"), "# Spec\n\n## Approval Status\nLiving Draft / Not Approved.\n\n## Open Questions\n- Continue discussion.\n");
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nAsk the next discussion question.\n");
  write(path.join(project, ".codex-context", "decisions.md"), "# Decisions\n\n## Accepted\n- Design boundary recorded.\n\n## Rejected\n- None.\n");
  write(path.join(project, ".codex-context", "open-questions.md"), "# Open Questions\n\n- Continue discussion.\n");
  write(path.join(project, ".codex-context", "handoff-summary.md"), `# Handoff Summary

## Objective
Discussion fixture.

## Latest User Instruction
Continue discussion.

## Approved Scope / Spec
Living draft.

## Plan Status
Brainstorming.

## Files Modified
None.

## Decisions Made
- Design boundary recorded.

## Verification Evidence
Not applicable.

## Git Checkpoint
- Latest commit: fixture
- Push state: no remote
- Files included: none
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Ask the next question.

## Files To Re-read First
- .codex-context/spec.md
`);

  const allowed = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(allowed, {});
});

test("PostToolUse exploration requires working notes before stopping", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "execution", "executing-plans");

  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_input: { path: "src/runtime.mjs" }
  });
  assert.deepEqual(post, {});

  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.equal(marker.source, "PostToolUse");
  assert.ok(marker.required_files.includes("working-notes.md"));
  backdateContextFiles(project, ["working-notes.md", "current-state.md", "handoff-summary.md"]);

  const blocked = runHook(project, { hook_event_name: "Stop" });
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /working-notes\.md is older than latest discussion or investigation marker/);

  write(path.join(project, ".codex-context", "working-notes.md"), `# Working Notes

## Purpose
Fixture.

## Current Findings
- Read src/runtime.mjs and found the relevant hook path.

## Current Hypothesis
- Working notes should unblock Stop.

## Rejected Paths
- None.

## Open Investigation Questions
- None.

## Next Verification Step
- Run Stop hook again.

## Promotion Notes
- Promote if durable.
`);
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nContinue execution.\n");
  write(path.join(project, ".codex-context", "handoff-summary.md"), `# Handoff Summary

## Objective
Working notes fixture.

## Latest User Instruction
Continue execution.

## Approved Scope / Spec
Approved.

## Plan Status
Execution.

## Files Modified
None.

## Decisions Made
- Working notes refreshed.

## Verification Evidence
Stop hook fixture.

## Git Checkpoint
- Latest commit: fixture
- Push state: no remote
- Files included: none
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Continue.

## Files To Re-read First
- .codex-context/working-notes.md
`);

  const allowed = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(allowed, {});
});

test("PostToolUse shell exploration commands require working notes before stopping", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "execution", "executing-plans");

  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "functions.shell_command",
    tool_input: { command: "Get-ChildItem -Force" }
  });
  assert.deepEqual(post, {});

  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.equal(marker.source, "PostToolUse");
  assert.equal(marker.tool_name, "functions.shell_command");
  assert.ok(marker.required_files.includes("working-notes.md"));
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

test("PreCompact automatic compaction captures stale discussion and working-notes state", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "压缩前要保留当前讨论和探索结论。"
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_input: { path: ".codex/scripts/lib/events.mjs" }
  });
  backdateContextFiles(project, ["spec.md", "current-state.md", "decisions.md", "open-questions.md", "handoff-summary.md", "working-notes.md"]);

  const output = runHook(project, { hook_event_name: "PreCompact", trigger: "auto" });
  assert.equal(output.continue, true);
  assert.match(output.systemMessage, /allowed automatic compaction/);
  assert.match(output.systemMessage, /working-notes\.md is older than latest discussion or investigation marker/);

  const handoff = fs.readFileSync(path.join(project, ".codex-context", "handoff-summary.md"), "utf8");
  assert.match(handoff, /## PreCompact Emergency Notice/);
  assert.match(handoff, /\.codex-context\/working-notes\.md/);
  assert.match(handoff, /\.codex-context\/discussion-state\.json/);

  const rawFile = fs.readdirSync(path.join(project, ".codex-context", "raw"))
    .find((name) => /^precompact-auto-.*\.md$/.test(name));
  assert.ok(rawFile);
  const raw = fs.readFileSync(path.join(project, ".codex-context", "raw", rawFile), "utf8");
  assert.match(raw, /## Discussion Marker/);
  assert.match(raw, /## Working Notes/);
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
  assert.match(handoff, /自动压缩前的应急恢复快照/);
  assert.match(handoff, /自动压缩即将运行/);
  assert.match(handoff, /## PreCompact Issues/);
  assert.match(handoff, /## Git 存档/);
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
  assert.match(verification, /## 已归档证据/);
  assert.match(verification, /verification-\d{4}-\d{2}-\d{2}-test-bloat\.md/);

  const archives = fs.readdirSync(path.join(ctx, "archive")).filter((name) => name.startsWith("verification-"));
  assert.equal(archives.length, 1);
  assert.match(archives[0], /test-bloat/);
  const archive = fs.readFileSync(path.join(ctx, "archive", archives[0]), "utf8");
  assert.match(archive, /command 1/);
  assert.match(archive, /command 2/);
});

test("state-prune accepts Chinese verification headings", () => {
  const project = tempProject();
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "verification.md"), `# 验证

## 已运行命令
- command 1
  - Result: pass
- command 2
  - Result: pass
- command 3
  - Result: pass
- command 4
  - Result: pass

## 尚未验证
- UI trust prompt.
`);

  const out = execFileSync(process.execPath, [statePrune, project, "--verification", "--archive", "--keep-latest", "2", "--reason", "test-bloat", "--apply"], {
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
  assert.match(verification, /## 已归档证据/);
  assert.match(verification, /已将 2 条较旧命令记录归档/);
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

test("asset-governance reports dong-debt markers and missing revisit triggers", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "src", "shortcut.mjs"), `export function fastPath(value) {
  // dong-debt: global cache shared by every tenant; revisit when tenant-specific throughput matters
  return value;
}

export function naivePath(value) {
  // dong-debt: naive scan for now
  return value;
}
`);

  const out = execFileSync(process.execPath, [assetGovernance, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong debt markers: 2/);
  assert.match(out, /Dong debt markers without trigger: 1/);
  assert.match(out, /src\/shortcut\.mjs:2: triggered/);
  assert.match(out, /src\/shortcut\.mjs:7: no-trigger/);
  assert.match(out, /review with codex-simplicity-review/);
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
