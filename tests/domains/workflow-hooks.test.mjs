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
  syncApprovalHashes,
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

function acknowledgeSessionRecovery(project, sessionId, toolUseId = `recovery-${sessionId}`) {
  const command = "node .codex/hooks/project-ops.mjs context-recovery-eval";
  const toolInput = { command };
  const pre = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: toolUseId,
    tool_input: toolInput
  });
  assert.notEqual(pre.hookSpecificOutput?.permissionDecision, "deny");
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: toolUseId,
    tool_input: toolInput,
    tool_response: { is_error: false, exit_code: 0 }
  });
}

function runHookProcess(project, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hook], {
      cwd: project,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `hook exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
    child.stdin.end(JSON.stringify({ cwd: project, ...input }));
  });
}

function bindWorkflowEvidenceHashes(project) {
  const ctx = path.join(project, ".codex-context");
  const verificationFile = path.join(ctx, "verification.md");
  const evidenceHash = createHash("sha256")
    .update(fs.readFileSync(verificationFile))
    .digest("hex");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  let state = fs.readFileSync(stateFile, "utf8");
  for (const field of ["verification_evidence_hash", "review_evidence_hash"]) {
    const pattern = new RegExp(`^${field}:.*$`, "m");
    state = pattern.test(state)
      ? state.replace(pattern, `${field}: ${evidenceHash}`)
      : `${state.trimEnd()}\n${field}: ${evidenceHash}\n`;
  }
  write(stateFile, state);
  syncApprovalHashes(project);
}

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
  assert.match(out, /TRANSITIONS: spec-approved, spec-skipped/);

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
  const workflowFile = path.join(project, ".codex-context", "workflow-state.yaml");
  assert.match(fs.readFileSync(workflowFile, "utf8"), /handoff_hash: [a-f0-9]{64}/);
  const firstHashMtime = fs.statSync(workflowFile).mtimeMs;
  sleep(1200);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(fs.statSync(workflowFile).mtimeMs, firstHashMtime);
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

  readyState(project, `- 最新提交：not ready
- 推送状态：not pushed because work is intentionally deferred
- 已包含文件：none
- 有意保留未提交的文件：work.txt
- 暂缓原因：test fixture keeps dirty work uncommitted
- 下次存档：commit after fixture completes
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

test("Stop requires verification for agent control-plane changes", () => {
  const cases = [
    [".agents/skills/brainstorming/SKILL.md", "\nChanged brainstorming behavior.\n"],
    [".codex/hooks/project-ops.mjs", "\n// Changed hook behavior.\n"],
    ["AGENTS.md", "\nChanged project agent instructions.\n"]
  ];

  for (const [relativePath, addition] of cases) {
    const project = tempProject();
    git(project, ["init"]);
    git(project, ["config", "user.email", "test@example.com"]);
    git(project, ["config", "user.name", "Test User"]);
    readyHealthFixture(project);
    setWorkflowPhase(project, "brainstorming", "brainstorming");
    write(path.join(project, "AGENTS.md"), "# Project Instructions\n");
    git(project, ["add", "."]);
    git(project, ["commit", "-m", "baseline"]);
    backdateContextFiles(project, ["verification.md", "handoff-summary.md"]);

    fs.appendFileSync(path.join(project, ...relativePath.split("/")), addition, "utf8");
    write(path.join(project, ".codex-context", "current-state.md"), `# Current State\n\n## Next Action\nValidate ${relativePath}.\n`);
    write(path.join(project, ".codex-context", "artifact-index.md"), `# Artifact Index\n\n## Modified\n- ${relativePath}: agent control-plane change.\n`);

    const output = runHook(project, { hook_event_name: "Stop" });
    assert.equal(output.decision, "block", relativePath);
    assert.match(output.reason, /verification\.md is older than changed files/, relativePath);
    assert.match(output.reason, /Git checkpoint needs review:/, relativePath);
  }
});

test("Stop requires verification for non-document project files without known extensions", () => {
  const cases = [
    ["src/App.vue", "<template><main>Changed UI</main></template>\n"],
    ["Dockerfile", "FROM node:22-alpine\n"],
    ["schemas/events.proto", "syntax = \"proto3\";\n"],
    ["docs/site/app.js", "document.body.textContent = 'changed';\n"]
  ];

  for (const [relativePath, content] of cases) {
    const project = tempProject();
    git(project, ["init"]);
    git(project, ["config", "user.email", "test@example.com"]);
    git(project, ["config", "user.name", "Test User"]);
    readyHealthFixture(project);
    setWorkflowPhase(project, "brainstorming", "brainstorming");
    git(project, ["add", "."]);
    git(project, ["commit", "-m", "baseline"]);
    backdateContextFiles(project, ["verification.md", "handoff-summary.md"]);

    write(path.join(project, ...relativePath.split("/")), content);
    write(path.join(project, ".codex-context", "current-state.md"), `# Current State\n\n## Next Action\nValidate ${relativePath}.\n`);
    write(path.join(project, ".codex-context", "artifact-index.md"), `# Artifact Index\n\n## Modified\n- ${relativePath}: project behavior change.\n`);

    const output = runHook(project, { hook_event_name: "Stop" });
    assert.equal(output.decision, "block", relativePath);
    assert.match(output.reason, /verification\.md is older than changed files/, relativePath);
  }
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
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture passed.\n\n## Review Evidence\n- Review completed with no blocking findings.\n");
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
  bindWorkflowEvidenceHashes(project);

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

test("context recovery requires a fresh hash bound to the active task identity", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const recoveryEval = path.join(root, "scripts", "context-recovery-eval.mjs");
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "decisions.md"), "# Decisions\n\n## Accepted\n- Use the fixture plan.\n");
  write(path.join(ctx, "risks.md"), "# Risks\n\n## Technical Risks\n- Fixture risk.\n");
  write(path.join(ctx, "verification.md"), "# Verification\n\n## Commands Run\n- Fixture command passed.\n");

  let missingHashOutput = "";
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    missingHashOutput = String(error.stdout || "");
    return /Result: fail/.test(missingHashOutput);
  });
  assert.match(missingHashOutput, /context-freshness: fail/i);
  assert.match(missingHashOutput, /handoff hash/i);

  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const valid = execFileSync(process.execPath, [recoveryEval, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(valid, /context-freshness: pass/i);

  const stateFile = path.join(ctx, "workflow-state.yaml");
  let state = fs.readFileSync(stateFile, "utf8");
  if (/^handoff_task_id:/m.test(state)) {
    state = state.replace(/^handoff_task_id:.*$/m, "handoff_task_id: stale-task");
  } else {
    state += "handoff_task_id: stale-task\n";
  }
  if (/^handoff_task_generation:/m.test(state)) {
    state = state.replace(/^handoff_task_generation:.*$/m, "handoff_task_generation: 999");
  } else {
    state += "handoff_task_generation: 999\n";
  }
  write(stateFile, state);

  let staleIdentityOutput = "";
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    staleIdentityOutput = String(error.stdout || "");
    return /Result: fail/.test(staleIdentityOutput);
  });
  assert.match(staleIdentityOutput, /task identity/i);
});

test("context recovery accepts a completed workflow with next_skill none", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const recoveryEval = path.join(root, "scripts", "context-recovery-eval.mjs");
  const ctx = path.join(project, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: complete")
      .replace(/^next_skill:.*$/m, "next_skill: none")
      .replace(/^verify_result:.*$/m, "verify_result: pass")
      .replace(/^review_status:.*$/m, "review_status: done")
      .replace(/^checkpoint_status:.*$/m, "checkpoint_status: done")
  );
  write(path.join(ctx, "decisions.md"), "# Decisions\n\n## Accepted\n- Completed fixture.\n");
  write(
    path.join(ctx, "risks.md"),
    "# Risks\n\n## Technical Risks\n- Keep completed-workflow recovery isolated to the temporary fixture.\n"
  );
  write(path.join(ctx, "verification.md"), "# Verification\n\n## Commands Run\n- Fixture passed.\n\n## Review Evidence\n- Review completed with no blocking findings.\n");
  bindWorkflowEvidenceHashes(project);

  const out = execFileSync(process.execPath, [recoveryEval, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /workflow-state: pass - phase=complete; next=none/i);
  assert.match(out, /context-freshness: pass/i);
  assert.match(out, /Result: pass/);
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
    `${fs.readFileSync(currentFile, "utf8")}\n当前 Wayfinder: [Platform route](${wayfinderRelative})\n`
  );
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: wayfinding")
      .replace(/^next_skill:.*$/m, "next_skill: codex-wayfinder")
      .replace(/^spec_status:.*$/m, "spec_status: living-draft")
      .replace(/^plan_status:.*$/m, "plan_status: not-started")
      .replace(/^execution_mode:.*$/m, "execution_mode: pending")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );
  const specFile = path.join(project, ".codex-context", "spec.md");
  write(
    specFile,
    fs.readFileSync(specFile, "utf8").replace(
      /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
      "$1Living Draft / Not Approved."
    )
  );
  write(path.join(project, ".codex-context", "plan-progress.md"), `# Plan Progress

## Spec Approval
Pending written-spec approval.

## Execution Approval
Pending user choice.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Resolve the active Wayfinder ticket.
`);
  write(path.join(project, ".codex-context", "decisions.md"), "# Decisions\n\n## Accepted\n- Staged rollout.\n");
  write(path.join(project, ".codex-context", "risks.md"), "# Risks\n\n## Technical Risks\n- Migration volume.\n");
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Not Yet Verified\n- Wayfinding only; implementation verification is not expected yet.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

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

  write(
    wayfinderFile,
    fs.readFileSync(wayfinderFile, "utf8").replace(
      "Use staged rollout.",
      "Use staged rollout with a mandatory canary."
    )
  );
  const staleAfterMapChange = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "wayfinder-map-changed",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
    }
  });
  assert.equal(staleAfterMapChange.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(
    staleAfterMapChange.hookSpecificOutput.permissionDecisionReason,
    /context recovery|saved handoff_hash|workflow state is not valid/i
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [hook, "context-recovery-eval", project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  execFileSync(process.execPath, [workflowState, project, "transition", "wayfinder-complete"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(
    currentFile,
    fs.readFileSync(currentFile, "utf8")
      .replace(/当前 Wayfinder:.*$/m, "当前 Wayfinder: 无")
  );
  write(wayfinderFile, "");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const inactiveOutput = execFileSync(process.execPath, [recoveryEval, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(inactiveOutput, /active-wayfinder: pass - not active/);

  execFileSync(process.execPath, [workflowState, project, "transition", "wayfinder-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(
    currentFile,
    fs.readFileSync(currentFile, "utf8")
      .replace(/当前 Wayfinder:.*$/m, `当前 Wayfinder: [Platform route](${wayfinderRelative})`)
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
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

  write(wayfinderFile, `# Platform Wayfinder

## Destination

## Decisions So Far

## Frontier

## Fog

## Out Of Scope
`);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  let emptySectionsOutput = "";
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    emptySectionsOutput = String(error.stdout || "");
    return /Result: fail/.test(emptySectionsOutput);
  });
  assert.match(emptySectionsOutput, /Destination|Frontier|Fog/i);

  write(wayfinderFile, `# Platform Wayfinder

## Destination
Ship the platform safely.

## Decisions So Far
- Use staged rollout with a mandatory canary.

## Frontier
WAYFINDER-RECOVERY-PROBE

## Fog
- Unknown migration volume.

## Out Of Scope
- Automatic production deploy.
`);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n");
  assert.throws(() => {
    execFileSync(process.execPath, [recoveryEval, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("context recovery rejects an active Wayfinder outside the wayfinding phase", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const wayfinderRelative = "docs/codex/wayfinder/mismatched.md";
  write(path.join(project, ...wayfinderRelative.split("/")), `# Mismatched Wayfinder

## Destination
Resolve the route.

## Decisions So Far
- None yet.

## Frontier
- Inspect the current system.

## Fog
- None yet.

## Out Of Scope
- Product implementation.
`);
  const currentFile = path.join(project, ".codex-context", "current-state.md");
  write(
    currentFile,
    `${fs.readFileSync(currentFile, "utf8")}\n当前 Wayfinder: [Mismatched](${wayfinderRelative})\n`
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Baseline verification fixture.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  assert.throws(() => {
    execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    output = String(error.stdout || "");
    return /Result: fail/.test(output);
  });
  assert.match(output, /Wayfinder.*wayfinding|wayfinding.*Wayfinder/i);
});

test("PostCompact emits only common hook output fields", () => {
  const project = tempProject();
  const output = runHook(project, { hook_event_name: "PostCompact", trigger: "auto" });
  assert.deepEqual(output, { continue: true });
});

test("PostCompact fails closed when recovery receipts cannot be invalidated", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const runtimeDir = path.join(project, ".codex-context", "raw", "project-ops-runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  write(path.join(runtimeDir, "recovery.json"), JSON.stringify({ schema: "fixture" }));
  write(path.join(runtimeDir, "recovery.json.lock"), "held");

  assert.throws(() => {
    runHook(project, { hook_event_name: "PostCompact", trigger: "auto" });
  }, /Command failed/);
});

test("liveness write failures do not replace the core hook result", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const runtimeDir = path.join(project, ".codex-context", "raw", "project-ops-runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  write(path.join(runtimeDir, "liveness.json.lock"), "held");

  const output = runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "liveness-lock-session",
    source: "resume"
  });
  assert.match(output.hookSpecificOutput?.additionalContext || "", /Codex Project Ops hooks are active/);
});

test("PostToolUse reminds when artifact index is stale after project file changes", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const artifactIndex = path.join(ctx, "artifact-index.md");
  write(artifactIndex, "# Artifact Index\n\n## Modified\n- None yet.\n");
  write(path.join(project, "work.txt"), "baseline\n");
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  const old = new Date(Date.now() - 20_000);
  fs.utimesSync(artifactIndex, old, old);
  const tool = {
    tool_name: "mcp__filesystem__operate",
    tool_use_id: "artifact-reminder-write",
    tool_input: { path: "work.txt", content: "changed" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...tool });
  write(path.join(project, "work.txt"), "changed\n");

  const output = runHook(project, {
    hook_event_name: "PostToolUse",
    ...tool,
    tool_response: { status: "success" }
  });
  assert.notEqual(output.decision, "block");
  assert.match(output.systemMessage, /artifact-index\.md is not fresh/);
  assert.match(output.systemMessage, /Hook status:/);
  assert.match(output.systemMessage, /Actual Git root:/);
  assert.match(output.systemMessage, /Latest changed file: work\.txt/);
  assert.match(output.systemMessage, /work\.txt/);
});

test("PostToolUse uses change receipts when code and artifact mtimes are identical", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "work.txt"), "baseline\n");
  readyState(project, `- Latest commit: fixture
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: work.txt
- Deferred reason: fixture
- Next checkpoint: after verification
`);
  write(path.join(project, ".codex-context", "decisions.md"), "# Decisions\n\n- Use content hashes for the fixture.\n");
  write(path.join(project, ".codex-context", "risks.md"), "# Risks\n\n- Same-mtime writes must remain detectable.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const sameTime = new Date(Date.now() - 2_000);
  const artifactFile = path.join(project, ".codex-context", "artifact-index.md");
  write(artifactFile, "# Artifact Index\n\n## Modified\n- Baseline only.\n");
  fs.utimesSync(artifactFile, sameTime, sameTime);
  const codeInput = {
    tool_name: "apply_patch",
    tool_use_id: "tool-identical-code",
    tool_input: { patch: "*** Update File: work.txt" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...codeInput });
  write(path.join(project, "work.txt"), "changed\n");
  fs.utimesSync(path.join(project, "work.txt"), sameTime, sameTime);

  const blocked = runHook(project, {
    hook_event_name: "PostToolUse",
    ...codeInput,
    tool_response: { is_error: false }
  });
  assert.notEqual(blocked.decision, "block");
  assert.match(blocked.systemMessage, /artifact-index\.md is not fresh/i);

  const artifactInput = {
    tool_name: "apply_patch",
    tool_use_id: "tool-identical-artifact",
    tool_input: {
      patch: "*** Update File: .codex-context/artifact-index.md\n@@\n+- `work.txt`: changed by fixture."
    }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...artifactInput });
  write(artifactFile, "# Artifact Index\n\n## Modified\n- `work.txt`: changed by fixture.\n");
  fs.utimesSync(artifactFile, sameTime, sameTime);
  const refreshed = runHook(project, {
    hook_event_name: "PostToolUse",
    ...artifactInput,
    tool_response: { is_error: false }
  });
  assert.notEqual(refreshed.decision, "block");

  for (const name of ["current-state.md", "verification.md", "handoff-summary.md"]) {
    fs.utimesSync(path.join(project, ".codex-context", name), sameTime, sameTime);
  }
  const staleStop = runHook(project, { hook_event_name: "Stop" });
  assert.equal(staleStop.decision, "block");
  assert.match(staleStop.reason, /current-state\.md has not been refreshed after the latest project mutation/i);

  for (const name of ["current-state.md", "verification.md", "handoff-summary.md"]) {
    const file = path.join(project, ".codex-context", name);
    const refreshInput = {
      tool_name: "apply_patch",
      tool_use_id: `tool-identical-refresh-${name}`,
      tool_input: {
        patch: `*** Update File: .codex-context/${name}\n@@\n+- Receipt refresh for work.txt.`
      }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...refreshInput });
    fs.appendFileSync(file, "\n- Receipt refresh fixture.\n", "utf8");
    fs.utimesSync(file, sameTime, sameTime);
    const stateRefresh = runHook(project, {
      hook_event_name: "PostToolUse",
      ...refreshInput,
      tool_response: { is_error: false }
    });
    assert.notEqual(stateRefresh.decision, "block");
  }
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const allowedStop = runHook(project, { hook_event_name: "Stop" });
  assert.notEqual(allowedStop.decision, "block", JSON.stringify(allowedStop));
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

test("planning prompts require plan progress instead of unrelated spec artifacts", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "planning", "writing-plans");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "把验证步骤调整为先跑领域测试，再跑 release check。"
  });

  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.ok(marker.required_files.includes("plan-progress.md"));
  assert.ok(marker.required_files.includes("current-state.md"));
  assert.ok(marker.required_files.includes("handoff-summary.md"));
  assert.equal(marker.required_files.includes("spec.md"), false);
  assert.equal(marker.required_files.includes("decisions.md"), false);
  assert.equal(marker.required_files.includes("open-questions.md"), false);
});

test("each new discussion prompt resets freshness baselines", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");
  const markerFile = path.join(project, ".codex-context", "discussion-state.json");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "第一轮：采用本地 receipt。"
  });
  const first = readJson(markerFile);
  for (const name of first.required_files) {
    fs.appendFileSync(path.join(project, ".codex-context", name), "\n- First prompt refresh.\n", "utf8");
  }

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "第二轮：改为 session-scoped receipt。"
  });
  const second = readJson(markerFile);
  assert.notEqual(second.baseline_hashes["spec.md"], first.baseline_hashes["spec.md"]);
  assert.notEqual(second.baseline_hashes["current-state.md"], first.baseline_hashes["current-state.md"]);
  assert.match(second.prompt_excerpt, /第二轮/);
});

test("Stop blocks stale discussion state even when no project files changed", () => {
  const project = tempProject();
  readyHealthFixture(project);
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "fixture"]);
  setWorkflowPhase(project, "brainstorming", "brainstorming");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "我们确认这个设计边界，需要继续讨论下一步。"
  });
  backdateContextFiles(project, ["spec.md", "current-state.md", "decisions.md", "open-questions.md", "handoff-summary.md"]);

  const blocked = runHook(project, { hook_event_name: "Stop" });
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /No non-context files changed/);
  assert.match(blocked.reason, /spec\.md content has not changed since the latest discussion or investigation marker/);
  assert.match(blocked.reason, /decisions\.md content has not changed since the latest discussion or investigation marker/);
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
- Files included: baseline fixture
- Files intentionally left uncommitted: working-notes.md, current-state.md, and handoff-summary.md
- Deferred reason: governance-only fixture refresh
- Next checkpoint: after the fixture assertion

## Next Action
Ask the next question.

## Files To Re-read First
- .codex-context/spec.md
`);

  const allowed = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(allowed, {});
});

test("PostToolUse exploration does not create mandatory Stop state debt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "fixture"]);
  setWorkflowPhase(project, "execution", "executing-plans");

  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_input: { path: "src/runtime.mjs" }
  });
  assert.deepEqual(post, {});
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "discussion-state.json")), false);
  assert.deepEqual(runHook(project, { hook_event_name: "Stop" }), {});
});

test("PostToolUse shell exploration commands remain lightweight", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "execution", "executing-plans");

  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "functions.shell_command",
    tool_input: { command: "Get-ChildItem -Force" }
  });
  assert.deepEqual(post, {});
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "discussion-state.json")), false);
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
Recorded in spec.md.

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
  syncApprovalHashes(project);

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
  const secret = ["sk", "precompactsecret123456789012345"].join("-");
  const privatePath = ["C:", "Users", "PrivateFixture", "project"].join("\\");
  fs.appendFileSync(
    path.join(project, ".codex-context", "working-notes.md"),
    `\nSensitive fixture: ${secret}\nPrivate path: ${privatePath}\n`,
    "utf8"
  );
  backdateContextFiles(project, ["spec.md", "current-state.md", "decisions.md", "open-questions.md", "handoff-summary.md", "working-notes.md"]);

  const output = runHook(project, { hook_event_name: "PreCompact", trigger: "auto" });
  assert.equal(output.continue, true);
  assert.match(output.systemMessage, /allowed automatic compaction/);
  assert.match(output.systemMessage, /spec\.md content has not changed since the latest discussion or investigation marker/);

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
  assert.doesNotMatch(raw, new RegExp(escapeRegExp(secret)));
  assert.doesNotMatch(raw, /C:\\Users\\PrivateFixture/);
  assert.match(raw, /\[redacted-openai-key\]/);
  assert.match(raw, /C:\\Users\\\[redacted\]/);
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

test("recovery evaluation detects a stale handoff hash without breaking active workflow status", () => {
  const project = tempProject();
  readyHealthFixture(project);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(path.join(project, ".codex-context", "current-state.md"), "# Current State\n\n## Next Action\nChanged after hash.\n");
  execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.throws(
    () => execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }),
    (error) => /saved handoff hash does not match current recovery context/i.test(String(error.stdout || ""))
  );
});

test("malformed hook stdin fails visibly instead of silently skipping the event", () => {
  const project = tempProject();
  assert.throws(() => {
    execFileSync(process.execPath, [hook], {
      cwd: project,
      input: "{ malformed",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  }, (error) => {
    assert.notEqual(error.status, 0);
    assert.match(String(error.stderr || ""), /invalid hook input json/i);
    return true;
  });
});

test("hook input validation rejects event payloads missing required fields", () => {
  const project = tempProject();
  assert.throws(() => {
    execFileSync(process.execPath, [hook], {
      cwd: project,
      input: JSON.stringify({
        cwd: project,
        hook_event_name: "PreToolUse",
        tool_input: {}
      }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  }, (error) => {
    assert.notEqual(error.status, 0);
    assert.match(String(error.stderr || ""), /PreToolUse requires tool_name/i);
    return true;
  });
});

test("Stop blocks a malformed discussion marker", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "brainstorming", "brainstorming");
  write(path.join(project, ".codex-context", "discussion-state.json"), "{ malformed");

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.equal(output.decision, "block");
  assert.match(output.reason, /discussion-state\.json is invalid/i);
  assert.match(output.reason, /Repair or remove the corrupt discussion marker/);
});

test("Stop rechecks unresolved issues when stop_hook_active is true", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "work.txt"), "baseline\n");
  readyState(project, `- Latest commit: fixture
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none
`);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  sleep(1100);
  write(path.join(project, "work.txt"), "changed without state refresh\n");

  const first = runHook(project, { hook_event_name: "Stop", stop_hook_active: false });
  assert.equal(first.decision, "block");
  const retry = runHook(project, { hook_event_name: "Stop", stop_hook_active: true });
  assert.equal(retry.decision, "block");
  assert.match(retry.reason, /still unresolved after Stop continuation/i);

  const receiptFile = path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "stop-continuation.json"
  );
  const staleReceipt = readJson(receiptFile);
  assert.equal(staleReceipt.task_id, "task-1");
  assert.equal(String(staleReceipt.task_generation), "1");
  staleReceipt.task_id = "previous-task";
  write(receiptFile, `${JSON.stringify(staleReceipt, null, 2)}\n`);

  const staleRetry = runHook(project, { hook_event_name: "Stop", stop_hook_active: true });
  assert.equal(staleRetry.decision, "block");

  const retryAfterReset = runHook(project, { hook_event_name: "Stop", stop_hook_active: true });
  assert.equal(retryAfterReset.decision, "block");

  const exhausted = runHook(project, { hook_event_name: "Stop", stop_hook_active: true });
  assert.notEqual(exhausted.decision, "block");
  assert.match(exhausted.systemMessage, /unresolved after the bounded Stop continuations/i);
  assert.match(exhausted.systemMessage, /must disclose these gaps/i);
  const receipt = readJson(receiptFile);
  assert.equal(receipt.exhausted, true);
  assert.equal(receipt.task_id, "task-1");
});

test("Stop continuation budgets remain isolated across concurrent sessions", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "work.txt"), "baseline\n");
  readyState(project, `- Latest commit: fixture
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none
`);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  sleep(1100);
  write(path.join(project, "work.txt"), "changed without state refresh\n");

  const sessionAFirst = runHook(project, {
    hook_event_name: "Stop",
    session_id: "stop-session-a",
    stop_hook_active: false
  });
  assert.equal(sessionAFirst.decision, "block");

  const sessionBFirst = runHook(project, {
    hook_event_name: "Stop",
    session_id: "stop-session-b",
    stop_hook_active: false
  });
  assert.equal(sessionBFirst.decision, "block");

  const sessionARetry = runHook(project, {
    hook_event_name: "Stop",
    session_id: "stop-session-a",
    stop_hook_active: true
  });
  assert.equal(sessionARetry.decision, "block");
  assert.match(sessionARetry.reason, /still unresolved after Stop continuation/i);
});

test("learning-only observations advise without blocking normal Stop", () => {
  const project = tempProject();
  readyHealthFixture(project);
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "fixture"]);
  const prompt = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    prompt: "以后都不要在没有验证的情况下声称已经修复。"
  });
  assert.match(prompt.hookSpecificOutput.additionalContext, /captured a raw learning observation/);

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.notEqual(output.decision, "block");
});

test("Stop blocks when Git is unavailable instead of treating the worktree as clean", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "work.txt"), "baseline\n");
  readyState(project, `- Latest commit: fixture
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none
`);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  write(path.join(project, "work.txt"), "dirty\n");

  const out = execFileSync(process.execPath, [hook], {
    cwd: project,
    input: JSON.stringify({ cwd: project, hook_event_name: "Stop" }),
    encoding: "utf8",
    env: { ...process.env, PATH: path.dirname(process.execPath) },
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  const output = JSON.parse(out);
  assert.equal(output.decision, "block");
  assert.match(output.reason, /Git status unavailable/i);
});

test("PreCompact blocks manual compaction when Git is unavailable", () => {
  const project = tempProject();
  git(project, ["init"]);
  readyState(project, `- Latest commit: fixture
- Push state: no remote
- Files included: baseline
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none
`);

  const out = execFileSync(process.execPath, [hook], {
    cwd: project,
    input: JSON.stringify({
      cwd: project,
      hook_event_name: "PreCompact",
      trigger: "manual"
    }),
    encoding: "utf8",
    env: { ...process.env, PATH: path.dirname(process.execPath) },
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  const output = JSON.parse(out);
  assert.equal(output.continue, false);
  assert.match(output.systemMessage, /Git status unavailable/i);
});

test("complete workflow records the first prompt of a new task before transition", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: complete")
      .replace(/^next_skill:.*$/m, "next_skill: none")
      .replace(/^verify_result:.*$/m, "verify_result: pass")
      .replace(/^review_status:.*$/m, "review_status: done")
      .replace(/^checkpoint_status:.*$/m, "checkpoint_status: done")
  );
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture passed.\n\n## Review Evidence\n- Review completed with no blocking findings.\n");
  bindWorkflowEvidenceHashes(project);

  const output = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    prompt: "开始新的复杂任务，先确认目标和风险。"
  });
  assert.match(output.hookSpecificOutput.additionalContext, /pending new task/i);
  const marker = readJson(path.join(project, ".codex-context", "discussion-state.json"));
  assert.equal(marker.status, "pending-new-task");
  assert.match(marker.prompt_excerpt, /开始新的复杂任务/);

  const transition = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-new-task-transition",
    tool_input: { command: "node .codex/hooks/project-ops.mjs workflow-state transition new-task" }
  });
  assert.deepEqual(transition, {});

  const codeMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-complete-code",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/index.js\n*** End Patch"
    }
  });
  assert.equal(codeMutation.hookSpecificOutput.permissionDecision, "deny");
  assert.match(codeMutation.hookSpecificOutput.permissionDecisionReason, /previous workflow is complete/i);
});

test("PreToolUse denies supported mutations until recovery is acknowledged", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });

  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-1",
    tool_input: { command: "*** Begin Patch" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  const recoveryCommand = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-recovery-command",
    tool_input: { command: "node .codex/hooks/project-ops.mjs context-recovery-eval" }
  });
  assert.deepEqual(recoveryCommand, {});

  const governanceRepair = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-governance-repair",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: .codex-context/handoff-summary.md\n*** End Patch"
    }
  });
  assert.deepEqual(governanceRepair, {});

  const chainedCommand = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-chained-recovery-command",
    tool_input: {
      command: "node .codex/hooks/project-ops.mjs context-recovery-eval; Remove-Item work.txt"
    }
  });
  assert.equal(chainedCommand.hookSpecificOutput.permissionDecision, "deny");
  assert.match(chainedCommand.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  const fakeControlPlane = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-fake-control-plane",
    tool_input: {
      command: "node tools/project-ops.mjs workflow-state transition new-task"
    }
  });
  assert.equal(fakeControlPlane.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(fakeControlPlane.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  const remotePathMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__tracker__update_status",
    tool_use_id: "tool-remote-path-mutation",
    tool_input: {
      path: ".codex-context/workflow-state.yaml",
      status: "done"
    }
  });
  assert.equal(remotePathMutation.hookSpecificOutput.permissionDecision, "deny");
  assert.match(remotePathMutation.hookSpecificOutput.permissionDecisionReason, /workflow-state\.yaml/i);

  const compoundWriteMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__filesystem__writefile",
    tool_use_id: "tool-compound-write",
    tool_input: { path: "work.txt", content: "changed" }
  });
  assert.equal(compoundWriteMutation.hookSpecificOutput.permissionDecision, "deny");
  assert.match(compoundWriteMutation.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  const readOnly = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__context7__query_docs",
    tool_use_id: "tool-2",
    tool_input: { query: "hooks" }
  });
  assert.notEqual(readOnly.hookSpecificOutput?.permissionDecision, "deny");

  for (const command of ["git status", "git branch --show-current", "git worktree list"]) {
    const diagnostic = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: "shell_command",
      tool_use_id: `tool-read-${command.replace(/\W+/g, "-")}`,
      tool_input: { command }
    });
    assert.deepEqual(diagnostic, {});
  }

  for (const command of [
    "git status; Set-Content work.txt changed",
    "Get-Content work.txt | Set-Content copy.txt",
    "sc work.txt changed",
    "ni new.txt -ItemType File",
    "node scripts/generate-output.mjs",
    "git worktree add ../other branch"
  ]) {
    const mutation = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: "shell_command",
      tool_use_id: `tool-write-${command.replace(/\W+/g, "-")}`,
      tool_input: { command }
    });
    assert.equal(mutation.hookSpecificOutput.permissionDecision, "deny");
    assert.match(mutation.hookSpecificOutput.permissionDecisionReason, /context recovery/i);
  }

  const upsert = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__database__upsert_records",
    tool_use_id: "tool-upsert",
    tool_input: { records: [{ id: 1 }] }
  });
  assert.equal(upsert.hookSpecificOutput.permissionDecision, "deny");
  assert.match(upsert.hookSpecificOutput.permissionDecisionReason, /context recovery/i);
});

test("successful recovery evaluation writes a receipt that allows supported mutations", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture recovery check.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });

  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const allowed = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-allow",
    tool_input: { command: "*** Begin Patch" }
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
});

test("recovery receipt is invalidated when the installed hook runtime changes", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture recovery check.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  write(path.join(project, ".codex", "hooks", "project-ops.mjs"), "console.log('changed runtime');\n");
  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-stale",
    tool_input: { command: "*** Begin Patch" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /runtime/i);
});

test("recovery receipt covers transitive hook runtime modules", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture recovery check.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  write(path.join(project, ".codex", "scripts", "lib", "markdown.mjs"), "export const changed = true;\n");
  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-stale-transitive-runtime",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/index.js\n*** End Patch"
    }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /runtime/i);
});

test("PreToolUse enforces pending decisions and Lane 3 execution approval", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture recovery check.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8").replace(/^decision_required:.*$/m, "decision_required: user-choice")
  );
  let denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-decision",
    tool_input: { patch: "*** Begin Patch" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision/i);

  denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__tracker__update_status",
    tool_use_id: "tool-mcp-decision",
    tool_input: { status: "done" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision/i);

  const decisionRecord = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-record-decision",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: .codex-context/workflow-state.yaml\n*** End Patch"
    }
  });
  assert.equal(decisionRecord.hookSpecificOutput.permissionDecision, "deny");
  assert.match(decisionRecord.hookSpecificOutput.permissionDecisionReason, /workflow-state\.yaml/i);

  const arbitrarySet = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-clear-decision",
    tool_input: {
      command: "node .codex/hooks/project-ops.mjs workflow-state set decision_required none"
    }
  });
  assert.equal(arbitrarySet.hookSpecificOutput.permissionDecision, "deny");
  assert.match(arbitrarySet.hookSpecificOutput.permissionDecisionReason, /validated workflow-state transition/i);

  denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__tracker__reset_status",
    tool_use_id: "tool-mcp-destructive-decision",
    tool_input: { status: "pending" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision/i);

  const readOnlyStatus = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__tracker__get_status",
    tool_use_id: "tool-mcp-read-status",
    tool_input: { item: "current" }
  });
  assert.deepEqual(readOnlyStatus, {});

  denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__filesystem__copy_file",
    tool_use_id: "tool-mcp-unknown-copy",
    tool_input: { source: "a.txt", destination: "b.txt" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision/i);

  denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "mcp__tracker__execute_query",
    tool_use_id: "tool-mcp-execute-query",
    tool_input: { query: "current status" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision/i);

  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: planning")
      .replace(/^next_skill:.*$/m, "next_skill: writing-plans")
      .replace(/^work_lane:.*$/m, "work_lane: lane-3")
      .replace(/^decision_required:.*$/m, "decision_required: none")
      .replace(/^plan_status:.*$/m, "plan_status: drafted")
      .replace(/^execution_mode:.*$/m, "execution_mode: pending")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    fs.readFileSync(path.join(project, ".codex-context", "plan-progress.md"), "utf8")
      .replace(
        /(## (?:Execution Approval|执行审批)\s*\r?\n)[^\r\n]*/,
        "$1Pending user approval."
      )
      .replace(
        /(## (?:Execution Mode|执行模式)\s*\r?\n)[^\r\n]*/,
        "$1Pending."
      )
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-lane-3",
    tool_input: { patch: "*** Begin Patch" }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /Lane 3/i);

  const planMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-lane-3-plan",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: docs/codex/plans/current.md\n*** End Patch"
    }
  });
  assert.deepEqual(planMutation, {});

  const codeMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-lane-3-code",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/index.js\n*** End Patch"
    }
  });
  assert.equal(codeMutation.hookSpecificOutput.permissionDecision, "deny");
  assert.match(codeMutation.hookSpecificOutput.permissionDecisionReason, /Lane 3/i);
});

test("PreToolUse allows validated verification failure resolution transitions", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Fixture recovery check.\n");
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: verification")
      .replace(/^next_skill:.*$/m, "next_skill: codex-verification-loop")
      .replace(/^decision_required:.*$/m, "decision_required: none")
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", source: "resume" });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-fail"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    prompt: "继续修复后重试验证。"
  });

  const allowed = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-verification-retry",
    tool_input: {
      command: "node .codex/hooks/project-ops.mjs workflow-state transition verification-retry"
    }
  });
  assert.deepEqual(allowed, {});
});

test("PostToolUse treats final git status as closure evidence, not new investigation", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "execution", "executing-plans");
  const markerFile = path.join(project, ".codex-context", "discussion-state.json");

  const output = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "shell_command",
    tool_input: { command: "git status --short" }
  });
  assert.deepEqual(output, {});
  assert.equal(fs.existsSync(markerFile), false);
});

test("hook config covers PreToolUse and subagent lifecycle", () => {
  const config = readJson(path.join(root, ".codex", "hooks.json"));
  assert.ok(config.hooks.PreToolUse);
  assert.ok(config.hooks.SubagentStart);
  assert.ok(config.hooks.SubagentStop);
  assert.match(config.hooks.PreToolUse[0].matcher, /mcp__/);
  assert.match(config.hooks.PostToolUse[0].matcher, /mcp__/);
  assert.match(config.hooks.PostToolUse[0].matcher, /ext__/);
});

test("health reports missing hook liveness separately without failing static checks", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Hook control plane:/);
  assert.match(out, /Static configuration: pass/);
  assert.match(out, /Runtime parity: pass/);
  assert.match(out, /Recent hook liveness: missing/);
  assert.match(out, /Result: pass/);
});

test("health reports recent liveness after a real hook event", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    prompt: "x"
  });
  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Recent hook liveness: recent/);
  assert.match(out, /Last event: UserPromptSubmit/);
  assert.match(out, /Critical event coverage: incomplete/);
  assert.match(out, /Missing critical events: PreToolUse, PostToolUse, Stop/);
  assert.match(out, /Result: pass/);
});

test("health reports complete critical event liveness after control hooks run", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "liveness-pre",
    tool_input: { command: "git status" }
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "shell_command",
    tool_use_id: "liveness-post",
    tool_input: { command: "git status" }
  });
  runHook(project, { hook_event_name: "Stop" });
  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Critical event coverage: complete/);
  assert.match(out, /Missing critical events: none/);
});

test("health treats stale critical event timestamps as missing coverage", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_use_id: "stale-pre",
    tool_input: { path: "README.md" }
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_use_id: "stale-post",
    tool_input: { path: "README.md" }
  });
  runHook(project, { hook_event_name: "Stop" });

  const receiptFile = path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "liveness.json"
  );
  const receipt = readJson(receiptFile);
  const staleAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  receipt.last_event = "Stop";
  receipt.last_seen_at = staleAt;
  for (const eventName of ["PreToolUse", "PostToolUse", "Stop"]) {
    receipt.events[eventName] = staleAt;
  }
  write(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);

  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "fresh-session",
    source: "resume"
  });
  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Recent hook liveness: recent/);
  assert.match(out, /Critical event coverage: incomplete/);
  assert.match(out, /Missing critical events: PreToolUse, PostToolUse, Stop/);
});

test("a new hook runtime does not inherit event coverage from the previous runtime", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_use_id: "runtime-pre",
    tool_input: { path: "README.md" }
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_use_id: "runtime-post",
    tool_input: { path: "README.md" }
  });
  runHook(project, { hook_event_name: "Stop" });

  const runtimeFile = path.join(project, ".codex", "scripts", "lib", "core.mjs");
  write(runtimeFile, `${fs.readFileSync(runtimeFile, "utf8")}\nexport const runtimeVersion = 2;\n`);
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    prompt: "record the new runtime"
  });

  const receipt = readJson(path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "liveness.json"
  ));
  assert.deepEqual(Object.keys(receipt.events).sort(), ["UserPromptSubmit"]);
});

test("concurrent hook events preserve shared liveness receipts without process failures", async () => {
  const project = tempProject();
  readyHealthFixture(project);
  const receiptFile = path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "liveness.json"
  );

  for (let round = 0; round < 8; round += 1) {
    fs.rmSync(receiptFile, { force: true });
    const events = [
      {
        hook_event_name: "PreToolUse",
        session_id: "concurrent-session",
        tool_name: "Read",
        tool_use_id: `concurrent-pre-${round}`,
        tool_input: { path: "README.md" }
      },
      {
        hook_event_name: "PostToolUse",
        session_id: "concurrent-session",
        tool_name: "Read",
        tool_use_id: `concurrent-post-${round}`,
        tool_input: { path: "README.md" }
      },
      {
        hook_event_name: "Stop",
        session_id: "concurrent-session",
        stop_hook_active: false
      }
    ];

    await Promise.all(events.flatMap((event) => [
      runHookProcess(project, event),
      runHookProcess(project, event),
      runHookProcess(project, event)
    ]));

    const receipt = readJson(receiptFile);
    for (const eventName of ["PreToolUse", "PostToolUse", "Stop"]) {
      assert.ok(receipt.events?.[eventName], `round ${round} lost ${eventName} liveness`);
    }
  }
});

test("parallel mutation intents in one session remain isolated by tool invocation", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "parallel-session",
    source: "resume"
  });
  acknowledgeSessionRecovery(project, "parallel-session");

  for (const toolUseId of ["parallel-tool-a", "parallel-tool-b"]) {
    const pre = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "parallel-session",
      tool_name: "apply_patch",
      tool_use_id: toolUseId,
      tool_input: {
        patch: `*** Begin Patch\n*** Update File: ${toolUseId}.txt\n*** End Patch`
      }
    });
    assert.notEqual(pre.hookSpecificOutput?.permissionDecision, "deny");
  }

  const runtimeDir = path.join(project, ".codex-context", "raw", "project-ops-runtime");
  const intentFiles = fs.readdirSync(runtimeDir)
    .filter((name) => /^mutation-intent-.*\.json$/i.test(name));
  assert.equal(intentFiles.length, 2);
});

test("mutation hooks fail closed when tool_use_id is missing", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch"
    }
  });
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /tool_use_id.*incomplete/i);
});

test("SubagentStart injects lifecycle context and SubagentStop grades summary evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);

  const start = runHook(project, {
    hook_event_name: "SubagentStart",
    agent_id: "agent-1",
    agent_type: "reviewer",
    permission_mode: "default"
  });
  assert.match(start.hookSpecificOutput.additionalContext, /task_id=/);
  assert.match(start.hookSpecificOutput.additionalContext, /Do not advance the parent workflow phase/);
  assert.match(start.hookSpecificOutput.additionalContext, /does not enforce file-level delegated scope/i);

  const firstStop = runHook(project, {
    hook_event_name: "SubagentStop",
    agent_id: "agent-1",
    agent_type: "reviewer",
    stop_hook_active: false,
    last_assistant_message: ""
  });
  assert.notEqual(firstStop.decision, "block");
  assert.match(firstStop.systemMessage, /quality warning/i);
  assert.match(firstStop.systemMessage, /concise result summary/i);

  const retry = runHook(project, {
    hook_event_name: "SubagentStop",
    agent_id: "agent-1",
    agent_type: "reviewer",
    stop_hook_active: true,
    last_assistant_message: ""
  });
  assert.notEqual(retry.decision, "block");
  assert.match(retry.systemMessage, /quality warning/i);
  assert.match(retry.systemMessage, /do not use it as completion or verification evidence/i);

  const meaningless = runHook(project, {
    hook_event_name: "SubagentStop",
    agent_id: "agent-1",
    agent_type: "reviewer",
    stop_hook_active: false,
    last_assistant_message: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  });
  assert.notEqual(meaningless.decision, "block");
  assert.match(meaningless.systemMessage, /evidence|risks|next action/i);

  const valid = runHook(project, {
    hook_event_name: "SubagentStop",
    agent_id: "agent-1",
    agent_type: "reviewer",
    stop_hook_active: false,
    last_assistant_message: [
      "Evidence: inspected the hook runtime and reproduced the target behavior.",
      "Risks: no unresolved P0 or P1 risk remains in the delegated scope.",
      "Next action: the parent should run the targeted regression test."
    ].join("\n")
  });
  assert.notEqual(valid.decision, "block");

  const narrative = runHook(project, {
    hook_event_name: "SubagentStop",
    agent_id: "agent-1",
    agent_type: "reviewer",
    stop_hook_active: false,
    last_assistant_message: [
      "I inspected the hook runtime and confirmed the delegated path with the local fixture.",
      "No unresolved blocking risk remains in this delegated scope.",
      "The parent should externalize the accepted result and run the targeted regression test."
    ].join("\n")
  });
  assert.notEqual(narrative.decision, "block");

  assert.equal(fs.existsSync(path.join(project, ".codex-context", "discussion-state.json")), false);
  const parentAllowed = runHook(project, {
    hook_event_name: "Stop",
    session_id: "parent-session"
  });
  assert.notEqual(parentAllowed.decision, "block");
});

test("PostToolUse and Stop preserve governance after a tool commits its own changes", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "before\n");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const command = "Set-Content work.txt changed; git add work.txt; git commit -m changed";
  const input = {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-commit-inside",
    tool_input: { command }
  };
  const pre = runHook(project, input);
  assert.notEqual(pre.hookSpecificOutput?.permissionDecision, "deny");

  write(path.join(project, "work.txt"), "changed\n");
  git(project, ["add", "work.txt"]);
  git(project, ["commit", "-m", "changed"]);
  assert.equal(git(project, ["status", "--short"]).trim(), "");

  const post = runHook(project, {
    ...input,
    hook_event_name: "PostToolUse",
    tool_response: { is_error: false, exit_code: 0 }
  });
  assert.notEqual(post.decision, "block");
  assert.match(post.systemMessage || post.hookSpecificOutput?.additionalContext || "", /artifact-index/i);

  const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(receipt.changed_files, ["work.txt"]);
  const stopped = runHook(project, { hook_event_name: "Stop" });
  assert.equal(stopped.decision, "block");
});

test("shell governance refresh satisfies a clean committed change receipt", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "before\n");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const codeInput = {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-clean-commit-inside",
    tool_input: {
      command: "Set-Content work.txt changed; git add work.txt; git commit -m changed"
    }
  };
  runHook(project, codeInput);
  write(path.join(project, "work.txt"), "changed\n");
  git(project, ["add", "work.txt"]);
  git(project, ["commit", "-m", "changed"]);
  runHook(project, {
    ...codeInput,
    hook_event_name: "PostToolUse",
    tool_response: { is_error: false, exit_code: 0 }
  });

  const evidenceInput = {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: "tool-shell-verification-refresh",
    tool_input: {
      command: "Set-Content -LiteralPath .codex-context/verification.md -Value '# Verification`n`n## Commands Run`n- Shell evidence refresh passed.'"
    }
  };
  const allowed = runHook(project, evidenceInput);
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Shell evidence refresh passed.\n"
  );
  runHook(project, {
    ...evidenceInput,
    hook_event_name: "PostToolUse",
    tool_response: { is_error: false, exit_code: 0 }
  });

  const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.ok(receipt.refreshed_hashes["verification.md"]);
});

test("failed, unknown-result, or no-op governance edits cannot satisfy change-state refresh requirements", () => {
  for (const { response, writesPartialOutput } of [
    { response: { is_error: true, exit_code: 1 }, writesPartialOutput: false },
    { response: {}, writesPartialOutput: true },
    { response: { is_error: false, exit_code: 0 }, writesPartialOutput: false }
  ]) {
    const project = tempProject();
    git(project, ["init"]);
    git(project, ["config", "user.email", "test@example.com"]);
    git(project, ["config", "user.name", "Test User"]);
    readyHealthFixture(project);
    readyState(project, `- Latest functional commit: baseline
- Push state: local only
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: active test
- Next checkpoint: after verification`);
    write(path.join(project, "work.txt"), "before\n");
    write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    git(project, ["add", "-A"]);
    git(project, ["commit", "-m", "baseline"]);
    execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    const codeInput = {
      tool_name: "apply_patch",
      tool_use_id: "tool-code-change",
      tool_input: {
        patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch"
      }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...codeInput });
    write(path.join(project, "work.txt"), "changed\n");
    runHook(project, {
      hook_event_name: "PostToolUse",
      ...codeInput,
      tool_response: { is_error: false }
    });

    for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
      const governanceInput = {
        tool_name: "apply_patch",
        tool_use_id: `tool-noop-${name}`,
        tool_input: {
          patch: `*** Begin Patch\n*** Update File: .codex-context/${name}\n*** End Patch`
        }
      };
      runHook(project, { hook_event_name: "PreToolUse", ...governanceInput });
      if (writesPartialOutput) {
        const target = path.join(project, ".codex-context", name);
        write(target, `${fs.readFileSync(target, "utf8")}\nPartial output.\n`);
      }
      runHook(project, {
        hook_event_name: "PostToolUse",
        ...governanceInput,
        tool_response: response
      });
    }

    const stopped = runHook(project, { hook_event_name: "Stop" });
    assert.equal(stopped.decision, "block");
  }
});

test("read-only workflow inspection and verification commands bypass mutation approval gates", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: planning")
      .replace(/^next_skill:.*$/m, "next_skill: writing-plans")
      .replace(/^work_lane:.*$/m, "work_lane: lane-3")
      .replace(/^plan_status:.*$/m, "plan_status: drafted")
      .replace(/^execution_mode:.*$/m, "execution_mode: pending")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );

  for (const [toolUseId, toolName, toolInput] of [
    ["read-workflow-shell", "shell_command", { command: "Get-Content .codex-context/workflow-state.yaml" }],
    ["read-workflow-mcp", "mcp__filesystem__read_file", { path: ".codex-context/workflow-state.yaml" }],
    ["read-pipeline", "shell_command", { command: "Get-Content README.md | Select-String -Pattern Project" }],
    ["read-quoted-redirect", "shell_command", { command: "rg \"a > b\" README.md" }],
    ["read-quoted-pipe", "shell_command", { command: "rg \"foo|bar\" README.md" }],
    ["node-tests", "shell_command", { command: "node --test tests/domains/core.test.mjs" }],
    ["npm-lint", "shell_command", { command: "npm run lint" }],
    ["pytest", "shell_command", { command: "pytest -q" }]
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: toolName,
      tool_use_id: toolUseId,
      tool_input: toolInput
    });
    assert.notEqual(
      output.hookSpecificOutput?.permissionDecision,
      "deny",
      `${toolUseId} should not be treated as a project mutation`
    );
  }

  for (const command of [
    "rg \"a > b\" README.md",
    "rg \"foo|bar\" README.md",
    "rg \"foo|rm work.txt\" README.md",
    "rg \"foo|sc work.txt changed\" README.md",
    "rg \"node -e writeFileSync('work.txt', 'x')\" README.md",
    "rg \"[System.IO.File]::WriteAllText\" README.md",
    "git status 2>$null",
    "git status 2>&1",
    "git status >/dev/null"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: "shell_command",
      tool_input: { command }
    });
    assert.deepEqual(output, {}, `${command} should remain read-only without tool_use_id`);
  }
});

test("compound read-only diagnostics bypass recovery and mutation gates", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, { hook_event_name: "SessionStart", session_id: "compound-read", source: "resume" });

  for (const command of [
    "Get-Content .codex-context/handoff-summary.md; git status --short; node .codex/hooks/project-ops.mjs health-check",
    "node .codex/hooks/project-ops.mjs context-recovery-eval; Get-Content .codex-context/workflow-state.yaml; git status --short"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "compound-read",
      tool_name: "shell_command",
      tool_input: { command }
    });
    assert.deepEqual(output, {}, `${command} should remain a read-only diagnostic compound`);
  }

  const nestedMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "compound-read",
    tool_name: "shell_command",
    tool_use_id: "compound-nested-mutation",
    tool_input: {
      command: "Get-Content README.md $(Remove-Item work.txt); git status --short"
    }
  });
  assert.equal(nestedMutation.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(nestedMutation.hookSpecificOutput.permissionDecisionReason, /context recovery/i);
});

test("closure maintenance does not create a second Stop freshness cycle", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  readyState(project, `- Latest commit: baseline
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: user explicitly requested no commit and no push
- Next checkpoint: only after a new user request
`);
  write(path.join(project, "work.txt"), "before\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const mutation = {
    tool_name: "apply_patch",
    tool_use_id: "closure-project-mutation",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...mutation });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, { hook_event_name: "PostToolUse", ...mutation, tool_response: { is_error: false } });

  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    const refresh = {
      tool_name: "apply_patch",
      tool_use_id: `closure-refresh-${name}`,
      tool_input: { patch: `*** Begin Patch\n*** Update File: .codex-context/${name}\n*** End Patch` }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...refresh });
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Refreshed ${name}.\n`, "utf8");
    runHook(project, { hook_event_name: "PostToolUse", ...refresh, tool_response: { is_error: false } });
  }

  sleep(1200);
  assert.deepEqual(runHook(project, { hook_event_name: "Stop" }), {});
  sleep(1200);
  assert.deepEqual(runHook(project, { hook_event_name: "Stop" }), {});
});

test("workflow hash maintenance preserves completed freshness evidence", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  readyState(project, `- Latest commit: baseline
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: user explicitly requested no commit and no push
- Next checkpoint: only after a new user request
`);
  write(path.join(project, "work.txt"), "before\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], { cwd: root, stdio: "ignore" });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], { cwd: root, stdio: "ignore" });

  const mutation = {
    tool_name: "apply_patch",
    tool_use_id: "hash-project-mutation",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...mutation });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, { hook_event_name: "PostToolUse", ...mutation, tool_response: { is_error: false } });

  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    const refresh = {
      tool_name: "apply_patch",
      tool_use_id: `hash-refresh-${name}`,
      tool_input: { patch: `*** Begin Patch\n*** Update File: .codex-context/${name}\n*** End Patch` }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...refresh });
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Refreshed ${name}.\n`, "utf8");
    runHook(project, { hook_event_name: "PostToolUse", ...refresh, tool_response: { is_error: false } });
  }

  const hashInput = {
    tool_name: "shell_command",
    tool_use_id: "hash-closure-action",
    tool_input: { command: "node .codex/hooks/project-ops.mjs workflow-state hash --write" }
  };
  assert.deepEqual(runHook(project, { hook_event_name: "PreToolUse", ...hashInput }), {});
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], { cwd: root, stdio: "ignore" });
  assert.deepEqual(runHook(project, {
    hook_event_name: "PostToolUse",
    ...hashInput,
    tool_response: { exit_code: 0 }
  }), {});
  sleep(1200);
  assert.deepEqual(runHook(project, { hook_event_name: "Stop" }), {});
});

test("governance-only refreshes do not reopen verification as project mutations", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  readyState(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: verification")
      .replace(/^next_skill:.*$/m, "next_skill: codex-verification-loop")
  );
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline verification"]);

  const refresh = {
    tool_name: "apply_patch",
    tool_use_id: "verification-governance-refresh",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: .codex-context/current-state.md\n*** End Patch"
    }
  };
  assert.deepEqual(runHook(project, { hook_event_name: "PreToolUse", ...refresh }), {});
  fs.appendFileSync(
    path.join(project, ".codex-context", "current-state.md"),
    "\n- Verification state refreshed.\n",
    "utf8"
  );
  assert.deepEqual(runHook(project, {
    hook_event_name: "PostToolUse",
    ...refresh,
    tool_response: { is_error: false }
  }), {});

  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^phase: verification$/m);
  assert.match(state, /^next_skill: codex-verification-loop$/m);
});

test("deferred checkpoint freshness is measured against project mutations only", () => {
  const project = tempProject();
  git(project, ["init"]);
  readyState(project, `- Latest commit: not requested
- Push state: not pushed because the user explicitly deferred commit and push
- Files included: none
- Files intentionally left uncommitted: work.txt and .codex-context state files
- Deferred reason: the user explicitly requested no commit and no push for this task
- Next checkpoint: only after a new user request
`);
  write(path.join(project, "work.txt"), "dirty\n");
  const handoffFile = path.join(project, ".codex-context", "handoff-summary.md");
  const projectMutation = new Date(Date.now() - 5000);
  fs.utimesSync(path.join(project, "work.txt"), projectMutation, projectMutation);
  const handoffRefresh = new Date(Date.now() - 3000);
  fs.utimesSync(handoffFile, handoffRefresh, handoffRefresh);
  const workflowMaintenance = new Date(Date.now() - 1000);
  fs.utimesSync(
    path.join(project, ".codex-context", "workflow-state.yaml"),
    workflowMaintenance,
    workflowMaintenance
  );

  const output = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(output, {});
});

test("unknown tools record real project changes without a pre-execution block", () => {
  for (const [toolName, toolUseId] of [
    ["mcp__filesystem__operate", "external-operate"],
    ["custom_operator", "unknown-operate"]
  ]) {
    const project = tempProject();
    git(project, ["init"]);
    git(project, ["config", "user.email", "test@example.com"]);
    git(project, ["config", "user.name", "Test User"]);
    readyHealthFixture(project);
    readyState(project);
    write(path.join(project, "work.txt"), "before\n");
    git(project, ["add", "-A"]);
    git(project, ["commit", "-m", "baseline"]);

    const input = {
      tool_name: toolName,
      tool_use_id: toolUseId,
      tool_input: { path: "work.txt", content: "after" }
    };
    const pre = runHook(project, { hook_event_name: "PreToolUse", ...input });
    assert.notEqual(pre.hookSpecificOutput?.permissionDecision, "deny");
    write(path.join(project, "work.txt"), "after\n");
    runHook(project, {
      hook_event_name: "PostToolUse",
      ...input,
      tool_response: { status: "success" }
    });

    const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
    assert.deepEqual(receipt.changed_files, ["work.txt"]);
  }
});

test("ordinary source reads do not create mandatory Stop state debt", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);

  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    tool_name: "Read",
    tool_use_id: "ordinary-read",
    tool_input: { path: "README.md" },
    tool_response: { content: "fixture" }
  });
  assert.notEqual(post.decision, "block");

  const stopped = runHook(project, { hook_event_name: "Stop" });
  assert.notEqual(stopped.decision, "block", JSON.stringify(stopped));
});

test("no-change verification commands preserve completed change-state refreshes", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "before\n");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline fixture passed.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const codeInput = {
    tool_name: "apply_patch",
    tool_use_id: "receipt-code-change",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...codeInput });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, {
    hook_event_name: "PostToolUse",
    ...codeInput,
    tool_response: { is_error: false }
  });

  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    const refreshInput = {
      tool_name: "apply_patch",
      tool_use_id: `receipt-refresh-${name}`,
      tool_input: {
        patch: `*** Begin Patch\n*** Update File: .codex-context/${name}\n*** End Patch`
      }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...refreshInput });
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Refreshed for ${name}.\n`, "utf8");
    runHook(project, {
      hook_event_name: "PostToolUse",
      ...refreshInput,
      tool_response: { is_error: false }
    });
  }

  const before = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(Object.keys(before.refreshed_hashes).sort(), [
    "artifact-index.md",
    "current-state.md",
    "handoff-summary.md",
    "verification.md"
  ]);

  const verifyInput = {
    tool_name: "shell_command",
    tool_use_id: "receipt-no-change-test",
    tool_input: { command: "node --test tests/domains/core.test.mjs" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...verifyInput });
  runHook(project, {
    hook_event_name: "PostToolUse",
    ...verifyInput,
    tool_response: { exit_code: 0 }
  });

  const after = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(after.refreshed_hashes, before.refreshed_hashes);
});

test("verification commands record generated project changes without a pre-execution block", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);

  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: planning")
      .replace(/^next_skill:.*$/m, "next_skill: writing-plans")
      .replace(/^work_lane:.*$/m, "work_lane: lane-3")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );
  const input = {
    tool_name: "shell_command",
    tool_use_id: "build-generated-output",
    tool_input: { command: "npm run build" }
  };
  const pre = runHook(project, { hook_event_name: "PreToolUse", ...input });
  assert.notEqual(pre.hookSpecificOutput?.permissionDecision, "deny");

  write(path.join(project, "dist", "bundle.js"), "generated\n");
  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    ...input,
    tool_response: { exit_code: 0 }
  });
  assert.notEqual(post.decision, "block");
  assert.match(post.systemMessage, /artifact-index/i);
  const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(receipt.changed_files, ["dist/bundle.js"]);
});

test("checkpoint commit preserves pre-commit governance refresh evidence", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "before\n");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline fixture passed.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const codeInput = {
    tool_name: "apply_patch",
    tool_use_id: "checkpoint-code",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...codeInput });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, { hook_event_name: "PostToolUse", ...codeInput, tool_response: { is_error: false } });

  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    const refreshInput = {
      tool_name: "apply_patch",
      tool_use_id: `checkpoint-refresh-${name}`,
      tool_input: { patch: `*** Begin Patch\n*** Update File: .codex-context/${name}\n*** End Patch` }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...refreshInput });
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Checkpoint refresh for ${name}.\n`, "utf8");
    runHook(project, { hook_event_name: "PostToolUse", ...refreshInput, tool_response: { is_error: false } });
  }

  const commitInput = {
    tool_name: "shell_command",
    tool_use_id: "checkpoint-commit",
    tool_input: { command: "git add -A; git commit -m checkpoint" }
  };
  runHook(project, { hook_event_name: "PreToolUse", ...commitInput });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "checkpoint"]);
  const post = runHook(project, {
    hook_event_name: "PostToolUse",
    ...commitInput,
    tool_response: { exit_code: 0 }
  });
  assert.notEqual(post.decision, "block", JSON.stringify(post));

  const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(Object.keys(receipt.refreshed_hashes).sort(), [
    "artifact-index.md",
    "current-state.md",
    "handoff-summary.md",
    "verification.md"
  ]);
});

test("change-state accumulates multiple committed mutations until governance closure", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline fixture passed.\n");
  write(path.join(project, "work-a.txt"), "before a\n");
  write(path.join(project, "work-b.txt"), "before b\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  for (const [name, value] of [["work-a.txt", "after a\n"], ["work-b.txt", "after b\n"]]) {
    const input = {
      tool_name: "shell_command",
      tool_use_id: `commit-${name}`,
      tool_input: { command: `Set-Content ${name} changed; git add ${name}; git commit -m ${name}` }
    };
    runHook(project, { hook_event_name: "PreToolUse", ...input });
    write(path.join(project, name), value);
    git(project, ["add", name]);
    git(project, ["commit", "-m", name]);
    runHook(project, {
      hook_event_name: "PostToolUse",
      ...input,
      tool_response: { exit_code: 0 }
    });
  }

  const receipt = readJson(path.join(project, ".codex-context", "raw", "project-ops-runtime", "change-state.json"));
  assert.deepEqual(receipt.changed_files.sort(), ["work-a.txt", "work-b.txt"]);
  assert.deepEqual(receipt.refreshed_hashes, {});
});

test("Lane 2 planning blocks project mutations until execution approval", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^work_lane:.*$/m, "work_lane: lane-2")
      .replace(/^phase:.*$/m, "phase: planning")
      .replace(/^next_skill:.*$/m, "next_skill: writing-plans")
      .replace(/^plan_status:.*$/m, "plan_status: drafted")
      .replace(/^execution_mode:.*$/m, "execution_mode: traditional")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );
  write(path.join(project, ".codex-context", "plan-progress.md"), `# Plan Progress

## Spec Approval
Recorded in spec.md.

## Execution Approval
Pending user choice.

## Artifact Readiness
implementation-ready

## Execution Mode
Traditional task-by-task execution.

## Current Step
Finish planning.
`);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-lane-2-planning-code",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
    }
  });
  assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /execution approval/i);

  const governance = runHook(project, {
    hook_event_name: "PreToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-lane-2-planning-plan",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: .codex-context/plan-progress.md\n*** End Patch"
    }
  });
  assert.notEqual(governance.hookSpecificOutput?.permissionDecision, "deny");
});

test("Lane 0 and Lane 1 pre-execution phases block product mutations", () => {
  for (const lane of ["lane-0", "lane-1"]) {
    const project = tempProject();
    git(project, ["init"]);
    git(project, ["config", "user.email", "test@example.com"]);
    git(project, ["config", "user.name", "Test User"]);
    readyHealthFixture(project);
    const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
    write(
      stateFile,
      fs.readFileSync(stateFile, "utf8")
        .replace(/^work_lane:.*$/m, `work_lane: ${lane}`)
        .replace(/^phase:.*$/m, "phase: brainstorming")
        .replace(/^next_skill:.*$/m, "next_skill: brainstorming")
        .replace(/^spec_status:.*$/m, "spec_status: living-draft")
        .replace(/^plan_status:.*$/m, "plan_status: not-started")
        .replace(/^execution_mode:.*$/m, "execution_mode: pending")
        .replace(/^execution_approval:.*$/m, "execution_approval: pending")
    );
    const specFile = path.join(project, ".codex-context", "spec.md");
    write(
      specFile,
      fs.readFileSync(specFile, "utf8").replace(
        /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
        "$1Living Draft / Not Approved."
      )
    );
    write(path.join(project, ".codex-context", "plan-progress.md"), `# Plan Progress

## Spec Approval
Pending written-spec approval.

## Execution Approval
Pending user choice.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Continue brainstorming.
`);
    write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    git(project, ["add", "-A"]);
    git(project, ["commit", "-m", "baseline"]);
    execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    const denied = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_use_id: `tool-${lane}-brainstorming-code`,
      tool_input: {
        patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
      }
    });
    assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
    assert.match(denied.hookSpecificOutput.permissionDecisionReason, /execution phase|execution approval/i);
  }
});

test("Lane 2 discovery permits canonical strategy, spec, and Wayfinder artifacts", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^work_lane:.*$/m, "work_lane: lane-2")
      .replace(/^phase:.*$/m, "phase: brainstorming")
      .replace(/^next_skill:.*$/m, "next_skill: brainstorming")
      .replace(/^spec_status:.*$/m, "spec_status: living-draft")
      .replace(/^plan_status:.*$/m, "plan_status: not-started")
      .replace(/^execution_mode:.*$/m, "execution_mode: pending")
      .replace(/^execution_approval:.*$/m, "execution_approval: pending")
  );

  for (const target of [
    "STRATEGY.md",
    "docs/codex/specs/feature.md",
    "docs/codex/wayfinder/feature.md",
    "docs/codex/wayfinder/prototypes/feature-shape.md"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_use_id: `scope-artifact-${target}`,
      tool_input: {
        patch: `*** Begin Patch\n*** Add File: ${target}\n+draft\n*** End Patch`
      }
    });
    assert.notEqual(
      output.hookSpecificOutput?.permissionDecision,
      "deny",
      `${target} should remain writable during scoped discovery`
    );
  }
});

test("review and verification fixes automatically reopen stale evidence after a real mutation", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  setWorkflowPhase(project, "review", "codex-review-panel");
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "review-fix-session",
    source: "resume"
  });
  acknowledgeSessionRecovery(project, "review-fix-session");

  const edit = {
    tool_name: "apply_patch",
    tool_use_id: "review-code-fix",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
    }
  };
  const allowedReviewEdit = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "review-fix-session",
    ...edit
  });
  assert.notEqual(allowedReviewEdit.hookSpecificOutput?.permissionDecision, "deny");
  write(path.join(project, "src", "app.mjs"), "changed in review\n");
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: "review-fix-session",
    ...edit,
    tool_response: { is_error: false }
  });
  let reopened = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(reopened, /^phase: debugging$/m);
  assert.match(reopened, /^next_skill: receiving-code-review$/m);
  assert.match(reopened, /^verification_evidence_hash: none$/m);
  assert.match(reopened, /^review_evidence_hash: none$/m);

  execFileSync(process.execPath, [workflowState, project, "transition", "execution-complete"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const verificationAllowed = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "review-fix-session",
    ...edit,
    tool_use_id: "verification-code-fix"
  });
  assert.notEqual(verificationAllowed.hookSpecificOutput?.permissionDecision, "deny");
  write(path.join(project, "src", "app.mjs"), "changed in verification\n");
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: "review-fix-session",
    ...edit,
    tool_use_id: "verification-code-fix",
    tool_response: { is_error: false }
  });
  reopened = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(reopened, /^phase: debugging$/m);
  assert.match(reopened, /^next_skill: systematic-debugging$/m);
  const verificationCommandAllowed = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "review-fix-session",
    tool_name: "shell_command",
    tool_use_id: "verification-command",
    tool_input: { command: "node --test" }
  });
  assert.notEqual(verificationCommandAllowed.hookSpecificOutput?.permissionDecision, "deny");
  const governanceWriteAllowed = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "review-fix-session",
    tool_name: "shell_command",
    tool_use_id: "verification-evidence-write",
    tool_input: {
      command: "Set-Content -LiteralPath .codex-context/verification.md -Value 'evidence'"
    }
  });
  assert.notEqual(governanceWriteAllowed.hookSpecificOutput?.permissionDecision, "deny");
});

test("recovery acknowledgements remain scoped to the session that ran recovery", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "verification.md"), "# Verification\n\n## Commands Run\n- Baseline.\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);

  runHook(project, { hook_event_name: "SessionStart", session_id: "session-a", source: "resume" });
  runHook(project, { hook_event_name: "SessionStart", session_id: "session-b", source: "resume" });
  acknowledgeSessionRecovery(project, "session-b");

  const sessionB = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "session-b",
    tool_name: "apply_patch",
    tool_use_id: "tool-session-b",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work-b.txt\n*** End Patch" }
  });
  assert.notEqual(sessionB.hookSpecificOutput?.permissionDecision, "deny");

  const sessionA = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "session-a",
    tool_name: "apply_patch",
    tool_use_id: "tool-session-a",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work-a.txt\n*** End Patch" }
  });
  assert.equal(sessionA.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(sessionA.hookSpecificOutput.permissionDecisionReason, /context recovery/i);
});

test("unknown hook events fail visibly and cannot create liveness evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  assert.throws(
    () => runHook(project, { hook_event_name: "BogusEvent" }),
    /Unsupported hook event/i
  );
  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Recent hook liveness: missing/);
  assert.doesNotMatch(out, /Last event: BogusEvent/);
});
