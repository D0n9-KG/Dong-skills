import * as support from "../project-ops-support.mjs";

const {
  assert,
  createHash,
  execFileSync,
  fs,
  path,
  readyHealthFixture,
  root,
  runHook,
  setWorkflowPhase,
  syncApprovalHashes,
  spawn,
  tempProject,
  test,
  workflowState,
  write
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

function setState(project, replacements) {
  const file = path.join(project, ".codex-context", "workflow-state.yaml");
  let text = fs.readFileSync(file, "utf8");
  for (const [field, value] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`^${field}:.*$`, "m"), `${field}: ${value}`);
  }
  write(file, text);
}

function workflowTransitionInput(event, toolUseId) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: "shell_command",
    tool_use_id: toolUseId,
    tool_input: {
      command: `node .codex/hooks/project-ops.mjs workflow-state transition ${event}`
    }
  };
}

function runWorkflowChild(project, event) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [workflowState, project, "transition", event], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("workflow transitions require recovery from the same session", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Session recovery fixture passed.\n\n## Not Yet Verified\n- None.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  runHook(project, { hook_event_name: "SessionStart", session_id: "session-a", source: "resume" });
  runHook(project, { hook_event_name: "SessionStart", session_id: "session-b", source: "resume" });
  acknowledgeSessionRecovery(project, "session-a");

  const denied = runHook(project, {
    session_id: "session-b",
    ...workflowTransitionInput("execution-complete", "transition-session-b")
  });
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  const allowed = runHook(project, {
    session_id: "session-a",
    ...workflowTransitionInput("execution-complete", "transition-session-a")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
});

test("approval transitions require a matching user decision receipt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const specFile = path.join(project, ".codex-context", "spec.md");
  write(
    specFile,
    fs.readFileSync(specFile, "utf8").replace(
      /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
      "$1Pending user approval."
    )
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Pending user approval.

## Execution Approval
Pending user approval.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Wait for written spec approval.
`
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Approval gate fixture prepared.\n\n## Not Yet Verified\n- None.\n"
  );
  setState(project, {
    phase: "spec",
    next_skill: "brainstorming",
    decision_required: "written-spec-approval",
    spec_status: "pending-approval",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending"
  });
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", session_id: "approval-session", source: "resume" });
  acknowledgeSessionRecovery(project, "approval-session");

  const noDecision = runHook(project, {
    session_id: "approval-session",
    ...workflowTransitionInput("spec-approved", "spec-approve-no-prompt")
  });
  assert.equal(noDecision.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(noDecision.hookSpecificOutput.permissionDecisionReason, /user decision receipt/i);

  const prompt = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "approval-session",
    prompt: "可以，批准这个书面规格。"
  });
  assert.match(prompt.hookSpecificOutput?.additionalContext || "", /approval|批准/i);

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "approval-session",
    prompt: "先不要批准，我还要修改书面规格。"
  });
  const retracted = runHook(project, {
    session_id: "approval-session",
    ...workflowTransitionInput("spec-approved", "spec-approve-after-retraction")
  });
  assert.equal(retracted.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(retracted.hookSpecificOutput.permissionDecisionReason, /user decision receipt/i);

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "approval-session",
    prompt: "修改已经确认，现在批准这个书面规格。"
  });
  const approved = runHook(project, {
    session_id: "approval-session",
    ...workflowTransitionInput("spec-approved", "spec-approve-with-prompt")
  });
  assert.notEqual(approved.hookSpecificOutput?.permissionDecision, "deny");
});

test("automatic compaction preserves an unconsumed session decision after recovery", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const specFile = path.join(project, ".codex-context", "spec.md");
  write(
    specFile,
    fs.readFileSync(specFile, "utf8").replace(
      /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
      "$1Pending user approval."
    )
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Pending user approval.

## Execution Approval
Pending user approval.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Wait for written spec approval.
`
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Compaction decision fixture prepared.\n\n## Not Yet Verified\n- None.\n"
  );
  setState(project, {
    phase: "spec",
    next_skill: "brainstorming",
    decision_required: "written-spec-approval",
    spec_status: "pending-approval",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending"
  });
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const sessionId = "approval-compact-session";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "可以，批准这个书面规格。"
  });

  runHook(project, {
    hook_event_name: "PostCompact",
    session_id: sessionId,
    trigger: "auto"
  });
  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: sessionId,
    source: "compact"
  });
  const staleRecovery = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("spec-approved", "spec-approve-before-recovery")
  });
  assert.equal(staleRecovery.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(staleRecovery.hookSpecificOutput.permissionDecisionReason, /context recovery/i);

  acknowledgeSessionRecovery(project, sessionId, "recovery-after-compact");
  const approved = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("spec-approved", "spec-approve-after-compact")
  });
  assert.notEqual(approved.hookSpecificOutput?.permissionDecision, "deny");
});

test("approval parsing does not treat negated modes or partial skips as approval", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "spec",
    next_skill: "brainstorming",
    decision_required: "written-spec-approval",
    spec_status: "pending-approval",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending"
  });

  const specPrompt = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "semantic-approval-session",
    prompt: "可以跳过风险分析里的示例，但书面规格先不要批准。"
  });
  assert.doesNotMatch(specPrompt.hookSpecificOutput?.additionalContext || "", /recorded user approval/i);

  for (const prompt of [
    "请检查批准流程，但不要批准。",
    "不要跳过书面规格。",
    "请确认这份规格是否完整。",
    "我不能确认这份规格，仍需修改。",
    "这份规格现在可以批准吗？"
  ]) {
    const rejected = runHook(project, {
      hook_event_name: "UserPromptSubmit",
      session_id: "semantic-approval-session",
      prompt
    });
    assert.doesNotMatch(rejected.hookSpecificOutput?.additionalContext || "", /recorded user approval/i);
  }

  setState(project, {
    phase: "planning",
    next_skill: "writing-plans",
    decision_required: "execution-approval",
    spec_status: "approved",
    plan_status: "drafted",
    execution_mode: "pending",
    execution_approval: "pending"
  });
  const executionPrompt = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "semantic-approval-session",
    prompt: "不要用 Goal mode，可以按传统方式执行。"
  });
  assert.match(executionPrompt.hookSpecificOutput?.additionalContext || "", /execution-approved-traditional/);
  assert.doesNotMatch(executionPrompt.hookSpecificOutput?.additionalContext || "", /execution-approved-goal/);

  const ambiguousExecutionPrompt = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "semantic-approval-session",
    prompt: "可以。"
  });
  assert.doesNotMatch(
    ambiguousExecutionPrompt.hookSpecificOutput?.additionalContext || "",
    /execution-approved-(?:traditional|goal)/
  );

  for (const prompt of [
    "请确认传统模式的风险，暂不执行。",
    "Goal mode 的风险可以接受吗？"
  ]) {
    const rejected = runHook(project, {
      hook_event_name: "UserPromptSubmit",
      session_id: "semantic-approval-session",
      prompt
    });
    assert.doesNotMatch(
      rejected.hookSpecificOutput?.additionalContext || "",
      /execution-approved-(?:traditional|goal)/
    );
  }
});

test("plan-then-execute intent survives new-task and authorizes traditional execution", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "complete",
    next_skill: "none",
    decision_required: "none",
    verify_result: "pass",
    review_status: "done",
    checkpoint_status: "done"
  });

  const intent = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "intent-session",
    prompt: "请先完成计划，然后按 Traditional task-by-task execution 直接执行，不用再等我确认。"
  });
  assert.match(intent.hookSpecificOutput?.additionalContext || "", /plan-then-execute/i);

  execFileSync(process.execPath, [workflowState, project, "transition", "new-task"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  write(
    path.join(project, ".codex-context", "spec.md"),
    "# Spec\n\n## Approval Status\nApproved by user.\n\n## Out Of Scope\n- Do not expand the fixture.\n"
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Approved by user.

## Execution Approval
plan-then-execute requested; Traditional task-by-task execution.

## Artifact Readiness
implementation-ready

## Execution Mode
Traditional task-by-task execution.

## Loop Review
not-required.

## Current Step
Start execution.
`
  );
  write(
    path.join(project, ".codex-context", "current-state.md"),
    "# Current State\n\n## Objective\nExecute the approved fixture plan.\n\n## Next Action\nStart traditional execution.\n"
  );
  write(
    path.join(project, ".codex-context", "artifact-index.md"),
    "# Artifact Index\n\n## Modified\n- `plan-progress.md`: records plan-then-execute intent.\n"
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Not Yet Verified\n- Implementation has not started.\n"
  );
  write(
    path.join(project, ".codex-context", "handoff-summary.md"),
    `# Handoff Summary

## Objective
Execute the approved fixture plan.

## Decisions Made
- Use Traditional task-by-task execution.

## Risks
- Keep the fixture isolated.

## Verification Evidence
- Implementation has not started.

## Next Action
Start execution.

## Files To Re-read First
- .codex-context/spec.md
- .codex-context/plan-progress.md
`
  );
  setState(project, {
    phase: "planning",
    next_skill: "writing-plans",
    decision_required: "execution-approval",
    spec_status: "approved",
    plan_status: "drafted",
    execution_mode: "pending",
    execution_approval: "pending",
    loop_review_status: "not-required",
    verify_result: "pending",
    verification_gap_status: "not-required",
    review_status: "pending",
    checkpoint_status: "pending"
  });
  syncApprovalHashes(project);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "execution-session",
    source: "resume"
  });
  acknowledgeSessionRecovery(project, "execution-session");

  const allowed = runHook(project, {
    session_id: "execution-session",
    ...workflowTransitionInput("execution-approved-traditional", "execute-plan-then-execute")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
});

test("explicit skip-brainstorming intent authorizes spec-skipped without a second approval prompt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "brainstorming",
    next_skill: "brainstorming",
    decision_required: "none",
    spec_status: "living-draft",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending"
  });
  write(
    path.join(project, ".codex-context", "spec.md"),
    "# Spec\n\n## Approval Status\nLiving Draft / Not Approved.\n\n## Out Of Scope\n- Do not expand the fixture.\n"
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Pending user direction.

## Execution Approval
Pending user approval.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Determine whether brainstorming is skipped.
`
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Skip-intent fixture prepared.\n\n## Not Yet Verified\n- No implementation has started.\n\n## Review Evidence\n- Not reviewed.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const sessionId = "skip-brainstorming-session";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);

  const negated = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "不要跳过 brainstorming，先讨论清楚。"
  });
  assert.doesNotMatch(negated.hookSpecificOutput?.additionalContext || "", /spec-skipped/);

  const denied = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("spec-skipped", "skip-without-intent")
  });
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");

  const intent = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "需求和边界已经明确，跳过 brainstorming，直接进入计划。"
  });
  assert.match(intent.hookSpecificOutput?.additionalContext || "", /spec-skipped/);

  const allowed = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("spec-skipped", "skip-with-intent")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
  execFileSync(process.execPath, [workflowState, project, "transition", "spec-skipped"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: "skip-with-intent",
    tool_input: {
      command: "node .codex/hooks/project-ops.mjs workflow-state transition spec-skipped"
    },
    tool_response: { is_error: false, exit_code: 0 }
  });

  const replay = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("spec-skipped", "skip-replay")
  });
  assert.equal(replay.hookSpecificOutput?.permissionDecision, "deny");
});

test("Lane 3 verification gaps require user acceptance and cannot skip review", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Core checks passed.\n\n## Not Yet Verified\n- One external integration remains unavailable.\n"
  );
  setState(project, {
    work_lane: "lane-3",
    phase: "verification",
    next_skill: "codex-verification-loop",
    decision_required: "none",
    verify_result: "pending",
    review_status: "pending",
    checkpoint_status: "pending"
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-gap-recorded"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const pendingGap = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(pendingGap, /^phase: verification$/m);
  assert.match(pendingGap, /^decision_required: verification-gap-acceptance$/m);

  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, { hook_event_name: "SessionStart", session_id: "gap-session", source: "resume" });
  acknowledgeSessionRecovery(project, "gap-session");

  const denied = runHook(project, {
    session_id: "gap-session",
    ...workflowTransitionInput("verification-gap-accepted", "gap-accept-no-prompt")
  });
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /user decision receipt/i);

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "gap-session",
    prompt: "接受已记录的验证缺口，继续进入审查。"
  });
  const allowed = runHook(project, {
    session_id: "gap-session",
    ...workflowTransitionInput("verification-gap-accepted", "gap-accept-with-prompt")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-gap-accepted"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "review-skipped"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("verification and review closure require fresh document evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    work_lane: "lane-3",
    phase: "verification",
    next_skill: "codex-verification-loop",
    decision_required: "none",
    spec_status: "approved",
    plan_status: "approved",
    execution_mode: "traditional",
    execution_approval: "approved-traditional",
    loop_review_status: "not-required",
    verify_result: "pending",
    verification_gap_status: "not-required",
    review_status: "pending",
    checkpoint_status: "pending"
  });
  const verificationFile = path.join(project, ".codex-context", "verification.md");
  write(
    verificationFile,
    `# Verification

## Commands Run
- None.

## Product Evidence
- None.

## Not Yet Verified
- Implementation remains unverified.

## Review Evidence
- Not reviewed.
`
  );

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "verification-pass"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(
    verificationFile,
    `# Verification

## Commands Run
- \`node --test\`: pass, 12/12.

## Product Evidence
- CLI recovery scenario completed successfully.

## Not Yet Verified
- None.

## Review Evidence
- Not reviewed.
`
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-pass"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  let state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^verification_evidence_hash: [a-f0-9]{64}$/m);
  assert.match(state, /^review_evidence_hash: none$/m);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "review-complete"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(
    verificationFile,
    fs.readFileSync(verificationFile, "utf8").replace(
      "## Review Evidence\n- Not reviewed.",
      "## Review Evidence\n- Independent review found no blocking issues; residual risk is limited to the recorded manual gap."
    )
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "review-complete"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^review_evidence_hash: [a-f0-9]{64}$/m);

  fs.appendFileSync(verificationFile, "\n- Evidence changed after review closure.\n", "utf8");
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "checkpoint-ready"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("rejecting a recorded verification gap returns the workflow to debugging", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Integration fixture blocked.\n\n## Not Yet Verified\n- External service is unavailable.\n"
  );
  setState(project, {
    work_lane: "lane-3",
    phase: "verification",
    next_skill: "codex-verification-loop",
    decision_required: "verification-gap-acceptance",
    verify_result: "gap-recorded",
    verification_gap_status: "pending",
    review_status: "pending"
  });
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const sessionId = "gap-rejected-session";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "不接受这个验证缺口，请继续修复并重试。"
  });

  const allowed = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("verification-retry", "verification-gap-retry")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");

  execFileSync(process.execPath, [workflowState, project, "transition", "verification-retry"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^phase: debugging$/m);
  assert.match(state, /^next_skill: systematic-debugging$/m);
  assert.match(state, /^decision_required: none$/m);
  assert.match(state, /^verify_result: fail$/m);
  assert.match(state, /^verification_gap_status: not-required$/m);
});

test("concurrent new-task transitions do not all report success", async () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "complete",
    next_skill: "none",
    verify_result: "pass",
    review_status: "done",
    checkpoint_status: "done"
  });

  const results = await Promise.all(
    Array.from({ length: 12 }, () => runWorkflowChild(project, "new-task"))
  );
  assert.equal(results.filter((result) => result.code === 0).length, 1);
  assert.equal(results.filter((result) => result.code !== 0).length, 11);
  assert.match(
    fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8"),
    /^task_generation: 2$/m
  );
});

test("new-task archives and resets task-scoped context", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "complete",
    next_skill: "none",
    verify_result: "pass",
    review_status: "done",
    checkpoint_status: "done"
  });
  fs.appendFileSync(path.join(project, ".codex-context", "spec.md"), "\nOLD TASK SPEC SENTINEL\n", "utf8");
  fs.appendFileSync(path.join(project, ".codex-context", "plan-progress.md"), "\nOLD TASK PLAN SENTINEL\n", "utf8");
  fs.appendFileSync(
    path.join(project, ".codex-context", "current-state.md"),
    "\n## Active Wayfinder\n- Path: docs/codex/wayfinders/old-task.md\n",
    "utf8"
  );

  execFileSync(process.execPath, [workflowState, project, "transition", "new-task"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const archive = path.join(project, ".codex-context", "archive", "tasks", "task-1-g1");
  assert.match(fs.readFileSync(path.join(archive, "spec.md"), "utf8"), /OLD TASK SPEC SENTINEL/);
  assert.match(fs.readFileSync(path.join(archive, "plan-progress.md"), "utf8"), /OLD TASK PLAN SENTINEL/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, ".codex-context", "spec.md"), "utf8"), /OLD TASK/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, ".codex-context", "current-state.md"), "utf8"), /old-task\.md/);

  const status = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(status, /Workflow state ok/i);
});

test("new-task reset is recovery-ready and keeps the pending prompt obligation", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "complete",
    next_skill: "none",
    verify_result: "pass",
    review_status: "done",
    checkpoint_status: "done"
  });

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "new-task-session",
    prompt: "开始新的复杂任务，先梳理目标、边界和风险。"
  });

  execFileSync(process.execPath, [workflowState, project, "transition", "new-task"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const recovery = execFileSync(
    process.execPath,
    [path.join(root, "scripts", "context-recovery-eval.mjs"), project],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  assert.match(recovery, /Result: pass/);

  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.doesNotMatch(state, /^handoff_hash: null$/m);
  assert.match(state, /^handoff_task_generation: 2$/m);

  const marker = JSON.parse(
    fs.readFileSync(path.join(project, ".codex-context", "discussion-state.json"), "utf8")
  );
  assert.equal(marker.status, "dirty");
  assert.match(marker.prompt_excerpt, /开始新的复杂任务/);
  assert.deepEqual(
    [...marker.required_files].sort(),
    ["current-state.md", "handoff-summary.md", "plan-progress.md", "spec.md"].sort()
  );
});

test("bare continuation prompts do not dirty five discussion documents", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "planning", "writing-plans");
  const marker = path.join(project, ".codex-context", "discussion-state.json");
  fs.rmSync(marker, { force: true });

  const output = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "继续"
  });
  assert.equal(fs.existsSync(marker), false);
  assert.doesNotMatch(output.hookSpecificOutput?.additionalContext || "", /marked discussion state dirty/i);

  const status = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "目前进展到哪了？"
  });
  assert.equal(fs.existsSync(marker), false);
  assert.doesNotMatch(status.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);

  const coverageReview = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "复核吧，但是我好像没有看到Stop coverage"
  });
  assert.equal(fs.existsSync(marker), false);
  assert.doesNotMatch(coverageReview.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);

  const projectOpsPolicy = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "补充一下，dong skills应该是起到辅助提醒的作用，如果现在的dong skills过于繁重反而会导致codex工作被限制，所以如果发现有这个问题，应该适当放宽限制，避免出现dong skills干扰codex工作的情况"
  });
  assert.equal(fs.existsSync(marker), false);
  assert.doesNotMatch(projectOpsPolicy.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);

  const hookPolicy = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "如果 hooks 经常报没有必要的 dirty，就应放宽或删除不必要的 hooks"
  });
  assert.equal(fs.existsSync(marker), false);
  assert.doesNotMatch(hookPolicy.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);

  const requestedBusinessFix = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "复核当前实验方法并修改评测指标"
  });
  assert.equal(fs.existsSync(marker), true);
  assert.match(requestedBusinessFix.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);

  fs.rmSync(marker, { force: true });
  const mixedProjectOpsAndBusiness = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "continue-session",
    prompt: "调整 Dong Skills 后，把研究方法改成时序知识图谱"
  });
  assert.equal(fs.existsSync(marker), true);
  assert.match(mixedProjectOpsAndBusiness.hookSpecificOutput?.additionalContext || "", /marked .*state dirty/i);
});

test("execution scope corrections block project mutations until scope is reopened", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    work_lane: "lane-3",
    phase: "execution",
    next_skill: "executing-plans",
    decision_required: "none",
    spec_status: "approved",
    plan_status: "approved",
    execution_mode: "traditional",
    execution_approval: "approved-traditional",
    loop_review_status: "not-required",
    verify_result: "pending",
    verification_gap_status: "not-required",
    review_status: "pending",
    checkpoint_status: "pending"
  });
  write(
    path.join(project, ".codex-context", "spec.md"),
    "# Spec\n\n## Approval Status\nApproved by user.\n\n## Scope\n- Keep the existing text output.\n"
  );
  write(
    path.join(project, ".codex-context", "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Approved by user.

## Execution Approval
Approved by user for Traditional task-by-task execution.

## Artifact Readiness
implementation-ready

## Execution Mode
Traditional task-by-task execution.

## Current Step
Implement the approved text output.
`
  );
  write(
    path.join(project, ".codex-context", "current-state.md"),
    "# Current State\n\n## Objective\nImplement the approved text output.\n\n## Next Action\nContinue implementation.\n"
  );
  write(
    path.join(project, ".codex-context", "handoff-summary.md"),
    `# Handoff Summary

## Objective
Implement the approved text output.

## Decisions Made
- Keep text output.

## Risks
- Do not expand scope.

## Verification Evidence
- Pending.

## Next Action
Continue implementation.

## Files To Re-read First
- .codex-context/spec.md
- .codex-context/plan-progress.md
`
  );
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Existing execution baseline passed before the user scope correction.\n\n## Not Yet Verified\n- The new scope is not implemented.\n"
  );
  syncApprovalHashes(project);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const sessionId = "execution-correction-session";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);
  const markerFile = path.join(project, ".codex-context", "discussion-state.json");
  fs.rmSync(markerFile, { force: true });

  const correction = runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "把输出改成 JSON，并新增失败重试；先不要继续改代码。"
  });
  assert.match(correction.hookSpecificOutput?.additionalContext || "", /execution|scope|范围/i);
  const marker = JSON.parse(fs.readFileSync(markerFile, "utf8"));
  assert.equal(marker.enforce_before_mutation, true);
  assert.equal(marker.requires_scope_reopen, true);
  assert.deepEqual(
    [...marker.required_files].sort(),
    ["current-state.md", "handoff-summary.md", "plan-progress.md", "spec.md"].sort()
  );

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    prompt: "以后这个 API 都返回 JSON。"
  });
  const durableProjectDirective = JSON.parse(fs.readFileSync(markerFile, "utf8"));
  assert.equal(durableProjectDirective.enforce_before_mutation, true);
  assert.equal(durableProjectDirective.requires_scope_reopen, true);

  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: "mutation-after-scope-change",
    tool_input: { command: "Set-Content src/app.js 'changed'" }
  });
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /reopen|scope|范围|user directive/i);

  const reopen = runHook(project, {
    session_id: sessionId,
    ...workflowTransitionInput("brainstorming-start", "reopen-scope")
  });
  assert.notEqual(reopen.hookSpecificOutput?.permissionDecision, "deny");
  execFileSync(process.execPath, [workflowState, project, "transition", "brainstorming-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^phase: brainstorming$/m);
  assert.match(state, /^spec_status: living-draft$/m);
  assert.match(state, /^execution_approval: pending$/m);
});

test("execution scope reductions and deferrals also require fresh approval", () => {
  for (const prompt of [
    "登录这轮不用做了，先只做导出。",
    "权限系统放到下一轮。",
    "搜索暂时不考虑。",
    "优先把性能做完，UI 以后再说。"
  ]) {
    const project = tempProject();
    readyHealthFixture(project);
    const markerFile = path.join(project, ".codex-context", "discussion-state.json");
    fs.rmSync(markerFile, { force: true });

    runHook(project, {
      hook_event_name: "UserPromptSubmit",
      session_id: `scope-reduction-${prompt.length}`,
      prompt
    });

    const marker = JSON.parse(fs.readFileSync(markerFile, "utf8"));
    assert.equal(marker.enforce_before_mutation, true, prompt);
    assert.equal(marker.requires_scope_reopen, true, prompt);
    assert.ok(marker.required_files.includes("spec.md"), prompt);
  }
});

test("approved spec and plan content drift blocks execution until reapproval", () => {
  for (const [fileName, addition] of [
    ["spec.md", "\n## Unapproved Scope Amendment\n- Add JSON output.\n"],
    ["plan-progress.md", "\n## Unapproved Added Task\n- Add retry handling.\n"]
  ]) {
    const project = tempProject();
    readyHealthFixture(project);
    setState(project, {
      work_lane: "lane-3",
      phase: "execution",
      next_skill: "executing-plans",
      decision_required: "none",
      spec_status: "approved",
      plan_status: "approved",
      execution_mode: "traditional",
      execution_approval: "approved-traditional",
      loop_review_status: "not-required",
      verify_result: "pending",
      verification_gap_status: "not-required",
      review_status: "pending",
      checkpoint_status: "pending"
    });
    write(
      path.join(project, ".codex-context", "spec.md"),
      "# Spec\n\n## Approval Status\nApproved by user.\n\n## Scope\n- Keep text output.\n"
    );
    write(
      path.join(project, ".codex-context", "plan-progress.md"),
      `# Plan Progress

## Spec Approval
Approved by user.

## Execution Approval
Approved by user for Traditional task-by-task execution.

## Artifact Readiness
implementation-ready

## Execution Mode
Traditional task-by-task execution.

## Current Step
Implement the approved text output.
`
    );
    write(
      path.join(project, ".codex-context", "verification.md"),
      "# Verification\n\n## Commands Run\n- Approved execution baseline verified.\n"
    );
    setState(project, {
      approved_spec_hash: createHash("sha256")
        .update(fs.readFileSync(path.join(project, ".codex-context", "spec.md")))
        .digest("hex"),
      approved_plan_hash: createHash("sha256")
        .update(fs.readFileSync(path.join(project, ".codex-context", "plan-progress.md")))
        .digest("hex")
    });
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    execFileSync("git", ["init"], { cwd: project, stdio: ["ignore", "ignore", "pipe"] });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: project });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: project });
    execFileSync("git", ["add", "-A"], { cwd: project });
    execFileSync("git", ["commit", "-m", "approved baseline"], {
      cwd: project,
      stdio: ["ignore", "ignore", "pipe"]
    });

    const sessionId = `approval-drift-${fileName}`;
    runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
    acknowledgeSessionRecovery(project, sessionId);

    const beforeDrift = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: sessionId,
      tool_name: "apply_patch",
      tool_use_id: `before-${fileName}`,
      tool_input: {
        patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
      }
    });
    assert.notEqual(beforeDrift.hookSpecificOutput?.permissionDecision, "deny");

    const approvedFile = path.join(project, ".codex-context", fileName);
    write(approvedFile, `${fs.readFileSync(approvedFile, "utf8")}${addition}`);
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    const afterDrift = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: sessionId,
      tool_name: "apply_patch",
      tool_use_id: `after-${fileName}`,
      tool_input: {
        patch: "*** Begin Patch\n*** Update File: src/app.mjs\n*** End Patch"
      }
    });
    assert.equal(afterDrift.hookSpecificOutput?.permissionDecision, "deny", fileName);
    assert.match(
      afterDrift.hookSpecificOutput.permissionDecisionReason,
      /approved|reapproval|re-approval|drift|changed/i,
      fileName
    );
  }
});

test("Wayfinder uses a formal workflow phase and returns through brainstorming", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "discovery",
    next_skill: "codex-codebase-onboarding",
    decision_required: "none",
    spec_status: "not-started",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending",
    verify_result: "pending",
    review_status: "pending",
    checkpoint_status: "pending"
  });

  execFileSync(process.execPath, [workflowState, project, "transition", "wayfinder-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  let state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^phase: wayfinding$/m);
  assert.match(state, /^next_skill: codex-wayfinder$/m);
  assert.match(state, /^spec_status: living-draft$/m);
  assert.match(state, /^plan_status: not-started$/m);
  assert.match(state, /^execution_approval: pending$/m);

  execFileSync(process.execPath, [workflowState, project, "transition", "wayfinder-complete"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(state, /^phase: brainstorming$/m);
  assert.match(state, /^next_skill: brainstorming$/m);
  assert.match(state, /^spec_status: living-draft$/m);
});

test("Wayfinder decisions must refresh the active map before Stop", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const contextRoot = path.join(project, ".codex-context");
  const wayfinderRelative = "docs/codex/wayfinder/route.md";
  const wayfinderFile = path.join(project, ...wayfinderRelative.split("/"));
  write(wayfinderFile, `# Route

## Destination
Ship safely.

## Decisions So Far
- None.

## Frontier
- Choose the rollout.

## Fog
- Migration volume.

## Out Of Scope
- Automatic deploy.
`);
  const artifactIndex = path.join(contextRoot, "artifact-index.md");
  write(
    artifactIndex,
    `${fs.readFileSync(artifactIndex, "utf8")}
- \`${wayfinderRelative}\`: active Wayfinder route map.
`
  );
  for (const name of ["current-state.md", "handoff-summary.md"]) {
    const file = path.join(contextRoot, name);
    write(file, `${fs.readFileSync(file, "utf8")}
当前 Wayfinder: [Route](${wayfinderRelative})
`);
  }
  write(
    path.join(contextRoot, "spec.md"),
    "# Spec\n\n## Approval Status\nLiving Draft / Not Approved.\n\n## Next Step\nContinue wayfinding.\n"
  );
  write(
    path.join(contextRoot, "plan-progress.md"),
    `# Plan Progress

## Spec Approval
Pending.

## Execution Approval
Pending.

## Artifact Readiness
requirements-only

## Execution Mode
Pending.

## Current Step
Resolve the active Wayfinder frontier.
`
  );
  setState(project, {
    phase: "wayfinding",
    next_skill: "codex-wayfinder",
    decision_required: "none",
    spec_status: "living-draft",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending",
    loop_review_status: "pending"
  });
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync("git", ["init"], { cwd: project, stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: project });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: project });
  execFileSync("git", ["add", "-A"], { cwd: project });
  execFileSync("git", ["commit", "-m", "baseline"], { cwd: project, stdio: ["ignore", "ignore", "pipe"] });

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    session_id: "wayfinder-map-refresh",
    prompt: "我决定采用分阶段发布，下一步调查迁移量。"
  });
  const marker = JSON.parse(fs.readFileSync(path.join(contextRoot, "discussion-state.json"), "utf8"));
  assert.ok(marker.required_files.includes(wayfinderRelative));

  for (const name of ["current-state.md", "handoff-summary.md"]) {
    const file = path.join(contextRoot, name);
    write(file, `${fs.readFileSync(file, "utf8")}\n- 最新路线决策已记录。\n`);
  }
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const blocked = runHook(project, {
    hook_event_name: "Stop",
    session_id: "wayfinder-map-refresh"
  });
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /docs[\\/]codex[\\/]wayfinder[\\/]route\.md/i);

  write(
    wayfinderFile,
    fs.readFileSync(wayfinderFile, "utf8")
      .replace("- None.", "- Use staged rollout.")
      .replace("- Choose the rollout.", "- Measure migration volume.")
  );
  const workingNotes = path.join(contextRoot, "working-notes.md");
  write(
    workingNotes,
    `${fs.readFileSync(workingNotes, "utf8")}\n- Wayfinder decision and next frontier were externalized.\n`
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const allowed = runHook(project, {
    hook_event_name: "Stop",
    session_id: "wayfinder-map-refresh"
  });
  assert.notEqual(allowed.decision, "block", JSON.stringify(allowed));
});

test("active-session context updates do not invalidate workflow routing", () => {
  const project = tempProject();
  readyHealthFixture(project);
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  fs.appendFileSync(
    path.join(project, ".codex-context", "current-state.md"),
    "\n- Same-session progress update.\n",
    "utf8"
  );

  const next = execFileSync(process.execPath, [workflowState, project, "next"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.doesNotMatch(next, /saved handoff_hash does not match current workflow context/i);

  assert.throws(
    () => execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }),
    (error) => /saved handoff hash does not match current recovery context/i.test(String(error.stdout || ""))
  );
});
