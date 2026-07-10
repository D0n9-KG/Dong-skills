import * as support from "../project-ops-support.mjs";

const {
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
  installWindows,
  os,
  path,
  readJson,
  readyHealthFixture,
  readyState,
  releaseCheck,
  root,
  runHook,
  setWorkflowPhase,
  skillEvolution,
  sleep,
  solutions,
  spawn,
  statePrune,
  tempProject,
  test,
  workflowState,
  write,
  writeDongProjectSkillsFixture
} = support;

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
  write(path.join(project, ".codex-context", "spec.md"), "# Spec\n\n## Approval Status\nApproved by user.\n\n## Next Step\nResume.\n");
  write(path.join(project, ".codex-context", "working-notes.md"), `# Working Notes

## Current Findings
- Critical recovered investigation finding.

## Next Verification Step
- Re-run the fixture check.
`);
  write(path.join(project, ".codex-context", "plan-progress.md"), "# Plan Progress\n\n## Spec Approval\nApproved by user.\n\n## Execution Approval\nApproved by user for Traditional task-by-task execution.\n\n## Artifact Readiness\nimplementation-ready\n\n## Execution Mode\nTraditional task-by-task execution.\n\n## Current Step\nResume.\n");
  write(path.join(project, ".codex-context", "solution-index.md"), "# Solution Index\n\n## Knowledge Store\n- docs/solutions present: yes\n");
  write(path.join(project, ".codex-context", "learned-instincts.md"), "# Learned Instincts\n\n## Raw Observation Review\n- None.\n");
  write(path.join(project, ".codex-context", "worktree-state.md"), "# Worktree State\n\n## Current Workspace\n- Role: primary-checkout\n");
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
task_id: task-1
task_generation: 1
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

test("context recovery evaluator validates probes and injects active Wayfinder summary", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const recoveryEval = path.join(root, "scripts", "context-recovery-eval.mjs");
  const wayfinderRelative = "docs/codex/wayfinder/platform.md";
  const wayfinderFile = path.join(project, ...wayfinderRelative.split("/"));
  write(wayfinderFile, `# Platform Wayfinder

## Destination
Ship the platform safely.

## Decisions So Far
- Use staged rollout.

## Frontier
WAYFINDER-RECOVERY-PROBE

## Fog
- Unknown migration volume.

## Out Of Scope
- Automatic production deploy.
`);
  const currentFile = path.join(project, ".codex-context", "current-state.md");
  write(
    currentFile,
    `${fs.readFileSync(currentFile, "utf8")}\nActive Wayfinder: ${wayfinderRelative}\n`
  );
  write(path.join(project, ".codex-context", "decisions.md"), "# Decisions\n\n## Accepted\n- Staged rollout.\n");
  write(path.join(project, ".codex-context", "risks.md"), "# Risks\n\n## Technical Risks\n- Migration volume.\n");
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- `node --test`: pass.\n"
  );

  const out = execFileSync(process.execPath, [recoveryEval, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
  assert.match(out, /active-wayfinder: pass/);

  const hookOut = execFileSync(process.execPath, [hook, "context-recovery-eval", project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(hookOut, /Result: pass/);

  const session = runHook(project, { hook_event_name: "SessionStart", source: "startup" });
  const recoveryContext = session.hookSpecificOutput?.additionalContext;
  assert.match(recoveryContext, /Active Wayfinder summary/);
  assert.match(recoveryContext, /WAYFINDER-RECOVERY-PROBE/);

  write(wayfinderFile, "");
  let emptyOutput = "";
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    emptyOutput = String(error.stdout || "");
    return /Result: fail/.test(emptyOutput);
  });
  assert.match(emptyOutput, /active Wayfinder file is empty/);

  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n");
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
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
  assert.match(post.hookSpecificOutput.additionalContext, /marked investigation notes dirty/);
  assert.match(post.hookSpecificOutput.additionalContext, /working-notes\.md/);

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
  assert.match(post.hookSpecificOutput.additionalContext, /marked investigation notes dirty/);
  assert.match(post.hookSpecificOutput.additionalContext, /Required files: working-notes\.md, current-state\.md, handoff-summary\.md/);

  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.equal(marker.source, "PostToolUse");
  assert.equal(marker.tool_name, "functions.shell_command");
  assert.ok(marker.required_files.includes("working-notes.md"));
});

test("workflow-state detects spec and plan approval mismatches", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: pending-approval
plan_status: approved
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

  let out = "";
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  }, (error) => {
    out = String(error.stdout || "");
    return /Workflow state needs review/.test(out);
  });
  assert.match(out, /state mismatch: phase=execution requires approved\/skipped\/mechanical spec_status/);
});

test("workflow-state detects plan document approval conflicts", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
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
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);
  write(path.join(project, ".codex-context", "plan-progress.md"), `# Plan Progress

## Current Plan
- Fixture plan.

## Spec Approval
Approved by user.

## Execution Approval
尚未批准。

## Execution Mode
Traditional task-by-task execution.
`);

  let out = "";
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  }, (error) => {
    out = String(error.stdout || "");
    return /Workflow state needs review/.test(out);
  });
  assert.match(out, /plan-progress\.md execution approval is pending/);
});

test("workflow-state ignores template examples when reading plan approval", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
task_id: task-1
task_generation: 1
phase: planning
next_skill: writing-plans
auto_next: true
decision_required: execution-approval
spec_status: approved
plan_status: drafted
execution_mode: pending
execution_approval: pending
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);
  write(path.join(project, ".codex-context", "plan-progress.md"), `# 计划进度

## 当前计划
- Fixture plan.

## 规格审批
Approved by user.

## 执行审批
尚未批准。实现前记录 “Approved by user for Traditional task-by-task execution on [日期/时间]”、“Approved by user for Codex Goal mode on [日期/时间]”，或 “plan-then-execute requested; Traditional task-by-task execution”。

## 执行模式
等待用户选择。可选值：Traditional task-by-task execution；Codex Goal mode。不要从“继续”、“执行”或 plan-then-execute 推断为 Codex Goal mode。

## 工作类别 / 风险等级
Lane 1 fixture.

## Goal 模式目标
未选择。

## 运行约束
- Follow the fixture plan.

## 存档节奏
- Checkpoint after verified fixture work.

## 任务
- [ ] Fixture task.

## 当前步骤
None.

## 验证
- Fixture check.

## 范围外
- None.
`);

  const out = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow state ok/);

  const healthOut = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.doesNotMatch(healthOut, /execution_approval=.*plan-progress\.md/);
  assert.doesNotMatch(healthOut, /execution mode=.*plan-progress\.md/);
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

test("Stop detects stale evidence for Git-quoted Unicode paths", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  git(project, ["config", "core.quotePath", "true"]);
  write(path.join(project, "src", "测试.js"), "console.log(1);\n");
  readyHealthFixture(project);
  readyState(project, `- Latest commit: baseline
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: src/测试.js
- Deferred reason: fixture keeps one file dirty
- Next checkpoint: after fixture
`);
  git(project, ["add", "--all"]);
  git(project, ["commit", "-m", "baseline"]);
  const stateMtime = fs.statSync(path.join(project, ".codex-context", "verification.md")).mtimeMs;
  const directoryMtime = fs.statSync(path.join(project, "src")).mtimeMs;
  assert.ok(stateMtime > directoryMtime, "fixture requires state files newer than the source directory");
  const changedFile = path.join(project, "src", "测试.js");
  write(changedFile, "console.log(2);\n");
  const future = new Date(Date.now() + 5_000);
  fs.utimesSync(changedFile, future, future);

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /verification\.md is older than changed/);
});

test("workflow-state rejects commented-out approval headings", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "spec.md"), fs.readFileSync(path.join(ctx, "spec.md"), "utf8")
    .replace("## Approval Status", "<!-- ## Approval Status -->"));
  write(path.join(ctx, "plan-progress.md"), fs.readFileSync(path.join(ctx, "plan-progress.md"), "utf8")
    .replace("## Execution Approval", "<!-- ## Execution Approval -->")
    .replace("## Execution Mode", "<!-- ## Execution Mode -->"));

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("workflow-state detects a stale handoff hash", () => {
  const project = tempProject();
  readyHealthFixture(project);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nChanged after hash.\n");
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});
