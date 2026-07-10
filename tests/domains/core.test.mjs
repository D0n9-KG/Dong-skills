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

test("new-task resets approvals and completed evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
phase: complete
next_skill: none
auto_next: false
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pass
review_status: done
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: old task complete
`);

  execFileSync(process.execPath, [workflowState, project, "transition", "new-task"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: discovery/);
  assert.match(state, /spec_status: not-started/);
  assert.match(state, /plan_status: not-started/);
  assert.match(state, /execution_approval: pending/);
  assert.match(state, /verify_result: pending/);
  assert.match(state, /checkpoint_status: pending/);
});

test("delivery-complete refuses a pending checkpoint", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
phase: delivery
next_skill: codex-git-checkpoint
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pass
review_status: skipped
checkpoint_status: pending
handoff_hash: null
updated_at: fixture
note: delivery
`);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "delivery-complete"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("resume restores the phase recorded by blocked", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
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
note: execution
`);

  execFileSync(process.execPath, [workflowState, project, "transition", "blocked"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "resume"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: execution/);
  assert.match(state, /next_skill: executing-plans/);
});

test("health consumes the workflow runtime schema instead of a copied enum list", () => {
  const project = tempProject();
  fs.cpSync(root, project, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/");
    }
  });
  git(project, ["init"]);

  const runtimeFiles = [
    path.join(project, ".codex", "scripts", "lib", "workflow.mjs"),
    path.join(
      project,
      ".agents",
      "skills",
      "codex-codebase-onboarding",
      "assets",
      "project-ops",
      ".codex",
      "scripts",
      "lib",
      "workflow.mjs"
    )
  ];
  for (const file of runtimeFiles) {
    const source = fs.readFileSync(file, "utf8");
    write(
      file,
      source.replace(
        '    "none"\n  ],\n  auto_next:',
        '    "codex-shared-schema-probe",\n    "none"\n  ],\n  auto_next:'
      )
    );
  }

  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase: .*$/m, "phase: planning")
      .replace(/^next_skill: .*$/m, "next_skill: codex-shared-schema-probe")
  );

  const out = execFileSync(process.execPath, [path.join(project, "scripts", "project-ops-health.mjs"), project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("requirements-only plans cannot enter or remain in execution", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const planFile = path.join(project, ".codex-context", "plan-progress.md");
  write(
    planFile,
    fs.readFileSync(planFile, "utf8").replace(
      /## Artifact Readiness\s+implementation-ready/i,
      "## Artifact Readiness\nrequirements-only"
    )
  );

  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
task_id: task-1
task_generation: 1
phase: planning
next_skill: writing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: drafting
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

  for (const event of ["plan-ready", "execution-approved-traditional"]) {
    assert.throws(() => {
      execFileSync(process.execPath, [workflowState, project, "transition", event], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
  }

  write(
    planFile,
    fs.readFileSync(planFile, "utf8").replace(
      /## Artifact Readiness\s+requirements-only/i,
      "## Artifact Readiness\nnot implementation-ready; requirements-only"
    )
  );
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(stateFile, `workflow: standard
task_id: task-1
task_generation: 1
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

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "check", "execution"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
  assert.throws(() => {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(
    planFile,
    fs.readFileSync(planFile, "utf8").replace(
      /## Artifact Readiness\s+not implementation-ready; requirements-only/i,
      "## Artifact Readiness\nimplementation-ready"
    )
  );
  const checkOut = execFileSync(process.execPath, [workflowState, project, "check", "execution"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(checkOut, /Result: pass/);
});

test("Goal mode requires an approved loop design review", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const planFile = path.join(project, ".codex-context", "plan-progress.md");
  write(planFile, `# Plan Progress

## Spec Approval
Approved by user.

## Execution Approval
Approved by user for Codex Goal mode.

## Artifact Readiness
implementation-ready

## Execution Mode
Codex Goal mode.

## Loop Review
pending

## Current Step
Launch goal.
`);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
task_id: task-1
task_generation: 1
phase: planning
next_skill: writing-plans
auto_next: true
decision_required: none
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

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-goal"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(
    planFile,
    fs.readFileSync(planFile, "utf8").replace(
      "## Loop Review\npending",
      "## Loop Review\nnot completed"
    )
  );
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "loop-review-approved"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
  write(
    planFile,
    fs.readFileSync(planFile, "utf8").replace(
      "## Loop Review\nnot completed",
      "## Loop Review\nApproved after codex-loop-design-check."
    )
  );
  const reviewOut = execFileSync(process.execPath, [workflowState, project, "transition", "loop-review-approved"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(reviewOut, /loop-review-approved/);
  execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-goal"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /loop_review_status: approved/);

  write(
    stateFile,
    state.replace(/loop_review_status: approved/, "loop_review_status: pending")
  );
  assert.throws(() => {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(
    planFile,
    fs.readFileSync(planFile, "utf8")
      .replace("Approved by user for Codex Goal mode.", "Approved by user for Traditional task-by-task execution.")
      .replace("Codex Goal mode.", "Traditional task-by-task execution.")
  );
  write(
    stateFile,
    state.replace(/phase: execution/, "phase: planning")
      .replace(/next_skill: executing-plans/, "next_skill: writing-plans")
      .replace(/execution_mode: codex-goal/, "execution_mode: pending")
      .replace(/execution_approval: approved-goal/, "execution_approval: pending")
      .replace(/loop_review_status: approved/, "loop_review_status: pending")
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(fs.readFileSync(stateFile, "utf8"), /loop_review_status: not-required/);
});
