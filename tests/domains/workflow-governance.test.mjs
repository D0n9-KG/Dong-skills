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

function assertRecoveryReadable(project) {
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
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

function workflowField(project, name) {
  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  return state.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";
}

function stripWorkflowDecision(markdown) {
  return String(markdown || "")
    .replace(/(?:^|\n)## Workflow Decision\s*\n[\s\S]*?(?=\n## |$)/, "")
    .replace(/\s+$/, "") + "\n";
}

function canonicalDecisionTargetHash(project, decision) {
  const names = {
    "written-spec-approval": ["spec.md"],
    "execution-approval": ["plan-progress.md"],
    "verification-gap-acceptance": ["verification.md"],
    "verification-failure-choice": ["verification.md"],
    "user-choice": ["current-state.md", "handoff-summary.md"]
  }[decision];
  const files = names.map((name) => ({
    name,
    content: stripWorkflowDecision(fs.readFileSync(path.join(project, ".codex-context", name), "utf8"))
  }));
  return createHash("sha256").update(JSON.stringify({
    task_id: workflowField(project, "task_id"),
    task_generation: workflowField(project, "task_generation"),
    decision,
    files
  }), "utf8").digest("hex");
}

function writeCanonicalDecision(project, fileName, decision, transition, overrides = {}) {
  const file = path.join(project, ".codex-context", fileName);
  const base = stripWorkflowDecision(fs.readFileSync(file, "utf8"));
  write(file, base + `\n## Workflow Decision
- schema: dong-skills.workflow-decision.v1
- decision: ${decision}
- transition: ${overrides.transition || transition}
- task_id: ${overrides.task_id || workflowField(project, "task_id")}
- task_generation: ${overrides.task_generation || workflowField(project, "task_generation")}
- target_hash: ${overrides.target_hash || canonicalDecisionTargetHash(project, decision)}
`);
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

test("workflow transitions are not coupled to session recovery receipts", () => {
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
  assertRecoveryReadable(project);

  const secondSession = runHook(project, {
    session_id: "session-b",
    ...workflowTransitionInput("execution-complete", "transition-session-b")
  });
  assert.notEqual(secondSession.hookSpecificOutput?.permissionDecision, "deny");

  const allowed = runHook(project, {
    session_id: "session-a",
    ...workflowTransitionInput("execution-complete", "transition-session-a")
  });
  assert.notEqual(allowed.hookSpecificOutput?.permissionDecision, "deny");
});

test("context recovery evaluation is read-only and creates no authorization receipt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Recovery evaluation fixture.\n\n## Not Yet Verified\n- None.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assertRecoveryReadable(project);

  const runtimeDir = path.join(project, ".codex-context", "raw", "project-ops-runtime");
  const receipts = fs.existsSync(runtimeDir)
    ? fs.readdirSync(runtimeDir).filter((name) => /^recovery(?:-|\.)/i.test(name))
    : [];
  assert.deepEqual(receipts, []);
});

test("canonical decision evidence is required for spec approval", () => {
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
  assertRecoveryReadable(project);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "spec-approved"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  writeCanonicalDecision(project, "spec.md", "written-spec-approval", "spec-approved");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assertRecoveryReadable(project);
  execFileSync(process.execPath, [workflowState, project, "transition", "spec-approved"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(workflowField(project, "spec_status"), "approved");
});

test("canonical decision evidence authorizes only the matching task, transition, and target hash", () => {
  const prepareSpecDecision = (overrides = null) => {
    const project = tempProject();
    readyHealthFixture(project);
    const specFile = path.join(project, ".codex-context", "spec.md");
    write(specFile, fs.readFileSync(specFile, "utf8").replace(
      /(## (?:Approval Status|审批状态)\s*\r?\n)[^\r\n]*/,
      "$1Pending user approval."
    ));
    write(path.join(project, ".codex-context", "plan-progress.md"), `# Plan Progress

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
`);
    write(path.join(project, ".codex-context", "verification.md"),
      "# Verification\n\n## Not Yet Verified\n- Implementation has not started.\n");
    setState(project, {
      phase: "spec",
      next_skill: "brainstorming",
      decision_required: "written-spec-approval",
      spec_status: "pending-approval",
      plan_status: "not-started",
      execution_mode: "pending",
      execution_approval: "pending"
    });
    if (overrides) {
      writeCanonicalDecision(project, "spec.md", "written-spec-approval", "spec-approved", overrides);
    }
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    assertRecoveryReadable(project);
    return project;
  };

  for (const [label, overrides] of [
    ["missing", null],
    ["wrong task", { task_id: "task-other" }],
    ["wrong transition", { transition: "spec-skipped" }],
    ["wrong hash", { target_hash: "0".repeat(64) }]
  ]) {
    const project = prepareSpecDecision(overrides);
    assert.throws(() => {
      execFileSync(process.execPath, [workflowState, project, "transition", "spec-approved"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/, label);
  }

  const correctSpec = prepareSpecDecision({});
  execFileSync(process.execPath, [workflowState, correctSpec, "transition", "spec-approved"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const approvedSpecState = fs.readFileSync(path.join(correctSpec, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(approvedSpecState, /^spec_status: approved$/m);
  assert.match(fs.readFileSync(path.join(correctSpec, ".codex-context", "spec.md"), "utf8"), /- status: approved/);

  const cases = [
    {
      decision: "execution-approval",
      transition: "execution-approved-traditional",
      file: "plan-progress.md",
      state: {
        phase: "planning",
        next_skill: "writing-plans",
        decision_required: "execution-approval",
        spec_status: "approved",
        plan_status: "drafted",
        execution_mode: "pending",
        execution_approval: "pending"
      }
    },
    {
      decision: "verification-gap-acceptance",
      transition: "verification-gap-accepted",
      file: "verification.md",
      state: {
        phase: "verification",
        next_skill: "codex-verification-loop",
        decision_required: "verification-gap-acceptance",
        verify_result: "gap-recorded"
      }
    },
    {
      decision: "verification-failure-choice",
      transition: "verification-retry",
      file: "verification.md",
      state: {
        phase: "debugging",
        next_skill: "systematic-debugging",
        decision_required: "verification-failure-choice",
        verify_result: "fail"
      }
    },
    {
      decision: "user-choice",
      transition: "resume",
      file: "handoff-summary.md",
      state: {
        phase: "blocked",
        next_skill: "using-superpowers",
        decision_required: "user-choice",
        resume_phase: "execution",
        resume_skill: "executing-plans"
      }
    }
  ];

  for (const item of cases) {
    const project = tempProject();
    readyHealthFixture(project);
    write(path.join(project, ".codex-context", "verification.md"), item.decision.startsWith("verification-")
      ? "# Verification\n\n## Commands Run\n- The fixture recorded the unresolved verification result.\n\n## Not Yet Verified\n- The recorded gap or failure still requires the selected resolution.\n"
      : "# Verification\n\n## Not Yet Verified\n- Implementation or follow-up remains active.\n");
    if (item.decision === "execution-approval") {
      const planFile = path.join(project, ".codex-context", "plan-progress.md");
      write(planFile, fs.readFileSync(planFile, "utf8").replace(
        /(## (?:Execution Approval|执行审批)\s*\r?\n)[^\r\n]*/,
        "$1Pending user approval."
      ));
    }
    setState(project, item.state);
    syncApprovalHashes(project);
    writeCanonicalDecision(project, item.file, item.decision, item.transition);
    execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    assertRecoveryReadable(project);
    execFileSync(process.execPath, [workflowState, project, "transition", item.transition], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }
});

test("execution decisions bind linked plan substance while allowing later progress metadata", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");
  const detailedPlan = path.join(project, "docs", "codex", "plans", "linked-plan.md");
  write(detailedPlan, `# Linked Plan

## Tasks
- [ ] Implement the approved linked-plan task.

## Current Step
- Start implementation.

## Checkpoints
### Checkpoint 1
- Pending.
`);
  write(path.join(ctx, "plan-progress.md"), `# Plan Progress

## Current Plan
- Detailed plan: \`docs/codex/plans/linked-plan.md\`.

## Spec Approval
- status: approved

## Execution Approval
- status: pending

## Artifact Readiness
- status: implementation-ready

## Execution Mode
- mode: pending

## Work Class / Risk Lane
- Lane 2.

## Runtime Constraints
- Follow the linked plan.

## Tasks
- [ ] Implement the approved linked-plan task.

## Current Step
- Start implementation.

## Checkpoints
### Checkpoint 1
- Pending.

## Verification
- Run linked-plan tests.

## Out Of Scope
- Remote service replacement.
`);
  const specHash = createHash("sha256")
    .update(fs.readFileSync(path.join(ctx, "spec.md"), "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"), "utf8")
    .digest("hex");
  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
work_lane: lane-2
task_id: linked-plan-task
task_generation: 1
document_hash_mode: approval-contract-v2
phase: planning
next_skill: writing-plans
auto_next: false
decision_required: execution-approval
spec_status: approved
plan_status: drafted
approved_spec_hash: ${specHash}
approved_plan_hash: none
execution_mode: pending
execution_approval: pending
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: linked plan fixture
`);

  execFileSync(process.execPath, [workflowState, project, "decision", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(
    detailedPlan,
    fs.readFileSync(detailedPlan, "utf8").replace(
      "Implement the approved linked-plan task.",
      "Replace the implementation with an unapproved remote service."
    )
  );
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /target_hash does not match/i);

  write(
    detailedPlan,
    fs.readFileSync(detailedPlan, "utf8").replace(
      "Replace the implementation with an unapproved remote service.",
      "Implement the approved linked-plan task."
    )
  );
  execFileSync(process.execPath, [workflowState, project, "decision", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  write(
    detailedPlan,
    fs.readFileSync(detailedPlan, "utf8")
      .replace("- [ ] Implement the approved linked-plan task.", "- [x] Implement the approved linked-plan task.")
      .replace("- Start implementation.", "- Run verification.")
      .replace("### Checkpoint 1\n- Pending.", "### Checkpoint 1\n- Task verified.")
  );
  const status = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(status, /Workflow state ok/);
});

test("PreCompact preserves canonical decision evidence without a recovery receipt", () => {
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
  writeCanonicalDecision(project, "spec.md", "written-spec-approval", "spec-approved");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const decisionBefore = fs.readFileSync(specFile, "utf8");
  runHook(project, {
    hook_event_name: "PreCompact",
    session_id: "approval-compact-session",
    trigger: "auto"
  });
  assert.equal(fs.readFileSync(specFile, "utf8"), decisionBefore);
  assertRecoveryReadable(project);
  execFileSync(process.execPath, [workflowState, project, "transition", "spec-approved"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(workflowField(project, "spec_status"), "approved");
});

test("traditional execution approval uses canonical evidence", () => {
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
Pending user approval.

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
  writeCanonicalDecision(project, "plan-progress.md", "execution-approval", "execution-approved-traditional");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assertRecoveryReadable(project);
  execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(workflowField(project, "execution_approval"), "approved-traditional");
});

test("skipping brainstorming requires canonical evidence", () => {
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
  assertRecoveryReadable(project);
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "spec-skipped"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  writeCanonicalDecision(project, "spec.md", "written-spec-approval", "spec-skipped");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assertRecoveryReadable(project);
  execFileSync(process.execPath, [workflowState, project, "transition", "spec-skipped"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "spec-skipped"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
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
  assertRecoveryReadable(project);
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "verification-gap-accepted"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  writeCanonicalDecision(project, "verification.md", "verification-gap-acceptance", "verification-gap-accepted");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assertRecoveryReadable(project);
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

  assertRecoveryReadable(project);

  writeCanonicalDecision(project, "verification.md", "verification-gap-acceptance", "verification-retry");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assertRecoveryReadable(project);
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
  write(
    path.join(project, ".codex-context", "discussion-state.json"),
    `${JSON.stringify({ status: "pending-new-task", source: "legacy-hook", prompt_excerpt: "old marker" }, null, 2)}\n`
  );

  execFileSync(process.execPath, [workflowState, project, "transition", "new-task"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const archive = path.join(project, ".codex-context", "archive", "tasks", "task-1-g1");
  assert.match(fs.readFileSync(path.join(archive, "spec.md"), "utf8"), /OLD TASK SPEC SENTINEL/);
  assert.match(fs.readFileSync(path.join(archive, "plan-progress.md"), "utf8"), /OLD TASK PLAN SENTINEL/);
  assert.match(fs.readFileSync(path.join(archive, "discussion-state.json"), "utf8"), /pending-new-task/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, ".codex-context", "spec.md"), "utf8"), /OLD TASK/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, ".codex-context", "current-state.md"), "utf8"), /old-task\.md/);
  assert.equal(fs.existsSync(path.join(project, ".codex-context", "discussion-state.json")), false);

  const status = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(status, /Workflow state ok/i);
});

test("new-task reset is recovery-ready without runtime prompt state", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setState(project, {
    phase: "complete",
    next_skill: "none",
    verify_result: "pass",
    review_status: "done",
    checkpoint_status: "done"
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

  assert.equal(fs.existsSync(path.join(project, ".codex-context", "discussion-state.json")), false);
});

test("canonical spec drift forces scope reopening", () => {
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
  assertRecoveryReadable(project);

  fs.appendFileSync(
    path.join(project, ".codex-context", "spec.md"),
    "\n## Pending Scope Revision\n- Return JSON and add retry behavior.\n",
    "utf8"
  );

  const denied = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: "mutation-after-scope-change",
    tool_input: { command: "Set-Content src/app.js 'changed'" }
  });
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /spec\.md changed after written-spec approval|workflow state is not valid/i);

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
    assertRecoveryReadable(project);

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

test("Wayfinder route-map updates are explicit and Stop stays advisory", () => {
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

  const allowedBeforeMapEdit = runHook(project, {
    hook_event_name: "Stop",
    session_id: "wayfinder-map-refresh"
  });
  assert.notEqual(allowedBeforeMapEdit.decision, "block", JSON.stringify(allowedBeforeMapEdit));

  write(
    wayfinderFile,
    fs.readFileSync(wayfinderFile, "utf8")
      .replace("- None.", "- Use staged rollout.")
      .replace("- Choose the rollout.", "- Measure migration volume.")
  );
  for (const name of ["current-state.md", "handoff-summary.md"]) {
    const file = path.join(contextRoot, name);
    write(file, `${fs.readFileSync(file, "utf8")}\n- 最新路线决策已记录。\n`);
  }
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
