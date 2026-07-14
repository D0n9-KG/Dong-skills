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

function workflowField(project, name) {
  const state = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  return state.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim() || "";
}

function stripWorkflowDecision(markdown) {
  return String(markdown || "")
    .replace(/(?:^|\n)## Workflow Decision\s*\n[\s\S]*?(?=\n## |$)/, "")
    .replace(/\s+$/, "") + "\n";
}

function writeCanonicalDecision(project, fileName, decision, transition) {
  const names = {
    "written-spec-approval": ["spec.md"],
    "execution-approval": ["plan-progress.md"],
    "verification-gap-acceptance": ["verification.md"],
    "verification-failure-choice": ["verification.md"],
    "user-choice": ["current-state.md", "handoff-summary.md"]
  }[decision];
  const taskId = workflowField(project, "task_id");
  const taskGeneration = workflowField(project, "task_generation");
  const files = names.map((name) => ({
    name,
    content: stripWorkflowDecision(fs.readFileSync(path.join(project, ".codex-context", name), "utf8"))
  }));
  const targetHash = createHash("sha256").update(JSON.stringify({
    task_id: taskId,
    task_generation: taskGeneration,
    decision,
    files
  }), "utf8").digest("hex");
  const file = path.join(project, ".codex-context", fileName);
  write(file, `${stripWorkflowDecision(fs.readFileSync(file, "utf8"))}
## Workflow Decision
- schema: dong-skills.workflow-decision.v1
- decision: ${decision}
- transition: ${transition}
- task_id: ${taskId}
- task_generation: ${taskGeneration}
- target_hash: ${targetHash}
`);
}

test("task templates remain valid JavaScript in source and bootstrap snapshot", () => {
  const templateFiles = [
    path.join(root, ".codex", "scripts", "lib", "templates.mjs"),
    path.join(
      root,
      ".agents",
      "skills",
      "codex-codebase-onboarding",
      "assets",
      "project-ops",
      ".codex",
      "scripts",
      "lib",
      "templates.mjs"
    )
  ];

  for (const file of templateFiles) {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ["--check", file], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, `${path.relative(root, file)} should parse`);
  }
});

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
  assert.match(state, /work_lane: lane-1/);
});

test("workflow work_lane is backward compatible and rejects unknown values", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  const legacy = fs.readFileSync(stateFile, "utf8").replace(/^work_lane:.*\r?\n/m, "");
  write(stateFile, legacy);

  let out = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow state ok/);

  write(stateFile, `${legacy.trimEnd()}\nwork_lane: lane-9\n`);
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => /invalid work_lane: lane-9/.test(String(error.stdout || "")));

  write(stateFile, `${legacy.trimEnd()}\nwork_lane: lane-3\n`);
  out = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Workflow state ok/);
});

test("normalized document hashes ignore UTF-8 BOM and line-ending differences", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  syncApprovalHashes(project);

  for (const name of ["spec.md", "plan-progress.md"]) {
    const file = path.join(project, ".codex-context", name);
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    fs.writeFileSync(file, `\uFEFF${text.replace(/\n/g, "\r\n")}`, "utf8");
  }

  const output = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /Workflow state ok/);
});

test("approved plan contracts allow progress updates but reject substantive linked-plan drift", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const planFile = path.join(ctx, "plan-progress.md");
  const detailedPlan = path.join(project, "docs", "codex", "plans", "fixture-plan.md");

  write(detailedPlan, `# Fixture Plan

## Tasks
- [ ] Implement the approved parser contract.

## Current Step
- Start the parser task.

## Checkpoints
### Checkpoint 1
- Pending.
`);
  write(planFile, `${fs.readFileSync(planFile, "utf8")}
## Current Plan
- Detailed plan: \`docs/codex/plans/fixture-plan.md\`.

## Tasks
- [ ] Implement the approved parser contract.

## Checkpoints
### Checkpoint 1
- Pending.
`);
  syncApprovalHashes(project);
  git(project, ["init"]);
  git(project, ["config", "user.email", "dong-skills-test"]);
  git(project, ["config", "user.name", "Dong Skills Test"]);
  git(project, ["add", ".codex-context", "docs/codex/plans/fixture-plan.md"]);
  git(project, ["commit", "-m", "record approved plan contract"]);

  write(
    planFile,
    fs.readFileSync(planFile, "utf8")
      .replace("- [ ] Implement the approved parser contract.", "- [x] Implement the approved parser contract.")
      .replace("## Current Step\nContinue.", "## Current Step\nRun the parser tests.")
      .replace("### Checkpoint 1\n- Pending.", "### Checkpoint 1\n- Parser task verified.")
  );
  write(
    detailedPlan,
    fs.readFileSync(detailedPlan, "utf8")
      .replace("- [ ] Implement the approved parser contract.", "- [x] Implement the approved parser contract.")
      .replace("- Start the parser task.", "- Run the parser tests.")
      .replace("### Checkpoint 1\n- Pending.", "### Checkpoint 1\n- Parser task verified.")
  );

  execFileSync(process.execPath, [workflowState, project, "migrate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(workflowField(project, "document_hash_mode"), "approval-contract-v2");

  let output = execFileSync(process.execPath, [workflowState, project, "status"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /Workflow state ok/);

  write(
    detailedPlan,
    fs.readFileSync(detailedPlan, "utf8").replace(
      "Implement the approved parser contract.",
      "Replace the parser with an unapproved remote service."
    )
  );
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "status"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => /approved plan contract changed|obtain fresh approval/i.test(String(error.stdout || "")));
});

test("legacy document hash migration rebinds matching files and rejects drift", () => {
  for (const drifted of [false, true]) {
    const project = tempProject();
    readyHealthFixture(project);
    readyState(project);
    const ctx = path.join(project, ".codex-context");
    const specFile = path.join(ctx, "spec.md");
    const planFile = path.join(ctx, "plan-progress.md");
    const rawHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    let state = fs.readFileSync(path.join(ctx, "workflow-state.yaml"), "utf8")
      .replace(/^document_hash_mode:.*\r?\n/m, "")
      .replace(/^approved_spec_hash:.*$/m, `approved_spec_hash: ${rawHash(specFile)}`)
      .replace(/^approved_plan_hash:.*$/m, `approved_plan_hash: ${rawHash(planFile)}`);
    write(path.join(ctx, "workflow-state.yaml"), state);
    if (drifted) write(specFile, `${fs.readFileSync(specFile, "utf8")}\nUnapproved drift.\n`);

    if (drifted) {
      assert.throws(() => {
        execFileSync(process.execPath, [workflowState, project, "migrate"], {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"]
        });
      }, /Command failed/);
    } else {
      execFileSync(process.execPath, [workflowState, project, "migrate"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      state = fs.readFileSync(path.join(ctx, "workflow-state.yaml"), "utf8");
      assert.match(state, /^document_hash_mode: approval-contract-v2$/m);
      const output = execFileSync(process.execPath, [workflowState, project, "status"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      assert.match(output, /Workflow state ok/);
    }
  }
});

test("legacy plan hash migration carries the normalized hash into approval contract migration", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  const specFile = path.join(ctx, "spec.md");
  const planFile = path.join(ctx, "plan-progress.md");
  const plan = fs.readFileSync(planFile, "utf8").replace(/\r\n?/g, "\n");
  fs.writeFileSync(planFile, plan.replace(/\n/g, "\r\n"), "utf8");
  const rawHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^document_hash_mode:.*\r?\n/m, "")
      .replace(/^approved_spec_hash:.*$/m, `approved_spec_hash: ${rawHash(specFile)}`)
      .replace(/^approved_plan_hash:.*$/m, `approved_plan_hash: ${rawHash(planFile)}`)
  );

  execFileSync(process.execPath, [workflowState, project, "migrate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^document_hash_mode: approval-contract-v2$/m);
  assert.notEqual(workflowField(project, "approved_plan_hash"), rawHash(planFile));
});

test("legacy context hash migration safely rebinds a matching raw CRLF aggregate", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  const contextFiles = [
    "current-state.md",
    "spec.md",
    "plan-progress.md",
    "artifact-index.md",
    "verification.md",
    "handoff-summary.md"
  ];
  for (const name of contextFiles) {
    const file = path.join(ctx, name);
    const text = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
    fs.writeFileSync(file, text.replace(/\n/g, "\r\n"), "utf8");
  }
  const rawHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const legacyContextHash = createHash("sha256")
    .update(contextFiles.map((name) => `${name}:${rawHash(path.join(ctx, name))}`).join("\n"), "utf8")
    .digest("hex");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^document_hash_mode:.*\r?\n/m, "")
      .replace(/^approved_spec_hash:.*$/m, `approved_spec_hash: ${rawHash(path.join(ctx, "spec.md"))}`)
      .replace(/^approved_plan_hash:.*$/m, `approved_plan_hash: ${rawHash(path.join(ctx, "plan-progress.md"))}`)
      .replace(/^handoff_hash:.*$/m, `handoff_hash: ${legacyContextHash}`)
  );

  execFileSync(process.execPath, [workflowState, project, "migrate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const hashOutput = execFileSync(process.execPath, [workflowState, project, "hash"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const normalizedContextHash = hashOutput.match(/^CONTEXT_HASH:\s*([a-f0-9]{64})$/m)?.[1];
  assert.ok(normalizedContextHash);
  assert.equal(workflowField(project, "handoff_hash"), normalizedContextHash);
  assert.notEqual(normalizedContextHash, legacyContextHash);
});

test("legacy document hash migration rejects drift committed after approval evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  const specFile = path.join(ctx, "spec.md");
  const planFile = path.join(ctx, "plan-progress.md");
  const rawHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^document_hash_mode:.*\r?\n/m, "")
      .replace(/^approved_spec_hash:.*$/m, `approved_spec_hash: ${rawHash(specFile)}`)
      .replace(/^approved_plan_hash:.*$/m, `approved_plan_hash: ${rawHash(planFile)}`)
  );
  git(project, ["init"]);
  git(project, ["config", "user.email", "dong-skills-test"]);
  git(project, ["config", "user.name", "Dong Skills Test"]);
  git(project, ["add", ".codex-context"]);
  git(project, ["commit", "-m", "record approved workflow evidence"]);

  write(specFile, `${fs.readFileSync(specFile, "utf8")}\nCommitted without reapproval.\n`);
  git(project, ["add", ".codex-context/spec.md"]);
  git(project, ["commit", "-m", "change spec without approval"]);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "migrate"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("legacy document hash migration accepts equivalent content from its recorded revision", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const ctx = path.join(project, ".codex-context");
  const stateFile = path.join(ctx, "workflow-state.yaml");
  const specFile = path.join(ctx, "spec.md");
  const planFile = path.join(ctx, "plan-progress.md");
  const spec = fs.readFileSync(specFile, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  fs.writeFileSync(specFile, spec.replace(/\n/g, "\r\n"), "utf8");
  const rawHash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^document_hash_mode:.*\r?\n/m, "")
      .replace(/^approved_spec_hash:.*$/m, `approved_spec_hash: ${rawHash(specFile)}`)
      .replace(/^approved_plan_hash:.*$/m, `approved_plan_hash: ${rawHash(planFile)}`)
  );
  git(project, ["init"]);
  git(project, ["config", "core.autocrlf", "false"]);
  git(project, ["config", "user.email", "dong-skills-test"]);
  git(project, ["config", "user.name", "Dong Skills Test"]);
  git(project, ["add", ".codex-context"]);
  git(project, ["commit", "-m", "record legacy approval evidence"]);

  fs.writeFileSync(specFile, spec, "utf8");
  execFileSync(process.execPath, [workflowState, project, "migrate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^document_hash_mode: approval-contract-v2$/m);
  assert.match(
    state,
    new RegExp(`^approved_spec_hash: ${createHash("sha256").update(spec, "utf8").digest("hex")}$`, "m")
  );
});

test("project-ops wrapper routes rootless workflow migrate to the current project", () => {
  const project = tempProject();
  readyHealthFixture(project);
  readyState(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, fs.readFileSync(stateFile, "utf8").replace(/^document_hash_mode:.*\r?\n/m, ""));

  const output = execFileSync(process.execPath, [hook, "workflow-state", "migrate"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(output, /Migrated workflow-state\.yaml/);
  assert.match(fs.readFileSync(stateFile, "utf8"), /^document_hash_mode: approval-contract-v2$/m);
});

test("validated work-lane transitions classify complex work before execution", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-1
task_id: task-lane
task_generation: 2
phase: planning
next_skill: writing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: drafted
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pass
review_status: done
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: fixture
note: fixture
`);

  execFileSync(process.execPath, [workflowState, project, "transition", "work-lane-3"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  let state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /work_lane: lane-3/);
  assert.match(state, /phase: planning/);
  assert.match(state, /next_skill: writing-plans/);
  assert.match(state, /plan_status: not-started/);
  assert.match(state, /execution_mode: pending/);
  assert.match(state, /execution_approval: pending/);
  assert.match(state, /verify_result: pending/);
  assert.match(state, /review_status: pending/);
  assert.match(state, /checkpoint_status: pending/);

  write(
    stateFile,
    state
      .replace(/^phase:.*$/m, "phase: execution")
      .replace(/^next_skill:.*$/m, "next_skill: executing-plans")
      .replace(/^plan_status:.*$/m, "plan_status: approved")
      .replace(/^execution_mode:.*$/m, "execution_mode: traditional")
      .replace(/^execution_approval:.*$/m, "execution_approval: approved-traditional")
  );
  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "work-lane-1"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("execution failures use a recoverable debugging phase before returning to the plan", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  let state = fs.readFileSync(stateFile, "utf8")
    .replace(/^work_lane:.*$/m, "work_lane: lane-3")
    .replace(/^phase:.*$/m, "phase: execution")
    .replace(/^next_skill:.*$/m, "next_skill: executing-plans")
    .replace(/^spec_status:.*$/m, "spec_status: approved")
    .replace(/^plan_status:.*$/m, "plan_status: approved")
    .replace(/^execution_mode:.*$/m, "execution_mode: traditional")
    .replace(/^execution_approval:.*$/m, "execution_approval: approved-traditional")
    .replace(/^loop_review_status:.*$/m, "loop_review_status: not-required")
    .replace(/^decision_required:.*$/m, "decision_required: none");
  write(stateFile, state);

  execFileSync(process.execPath, [workflowState, project, "transition", "debugging-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^phase: debugging$/m);
  assert.match(state, /^next_skill: systematic-debugging$/m);
  assert.match(state, /^debug_return_phase: execution$/m);
  assert.match(state, /^debug_return_skill: executing-plans$/m);

  execFileSync(process.execPath, [workflowState, project, "transition", "blocked"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  writeCanonicalDecision(project, "handoff-summary.md", "user-choice", "resume");
  execFileSync(process.execPath, [workflowState, project, "transition", "resume"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^phase: debugging$/m);
  assert.match(state, /^debug_return_phase: execution$/m);

  execFileSync(process.execPath, [workflowState, project, "transition", "debugging-resolved"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^phase: execution$/m);
  assert.match(state, /^next_skill: executing-plans$/m);
  assert.match(state, /^debug_return_phase: none$/m);
  assert.match(state, /^debug_return_skill: none$/m);
});

test("mechanical exception requires an explicit Lane 0 classification", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-1
task_id: task-mechanical
task_generation: 3
phase: discovery
next_skill: using-superpowers
auto_next: true
decision_required: none
spec_status: not-started
plan_status: not-started
execution_mode: pending
execution_approval: pending
loop_review_status: pending
verify_result: pass
review_status: done
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: fixture
note: fixture
`);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "mechanical-exception"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  execFileSync(process.execPath, [workflowState, project, "transition", "work-lane-0"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "mechanical-exception"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /work_lane: lane-0/);
  assert.match(state, /phase: execution/);
  assert.match(state, /spec_status: mechanical-exception/);
  assert.match(state, /execution_approval: approved-traditional/);
  assert.match(state, /verify_result: pending/);
  assert.match(state, /review_status: pending/);
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

test("delivery-complete cannot reuse an execution-phase milestone checkpoint", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  let state = fs.readFileSync(stateFile, "utf8")
    .replace(/^work_lane:.*$/m, "work_lane: lane-2")
    .replace(/^phase:.*$/m, "phase: execution")
    .replace(/^next_skill:.*$/m, "next_skill: executing-plans")
    .replace(/^spec_status:.*$/m, "spec_status: approved")
    .replace(/^plan_status:.*$/m, "plan_status: approved")
    .replace(/^execution_mode:.*$/m, "execution_mode: traditional")
    .replace(/^execution_approval:.*$/m, "execution_approval: approved-traditional")
    .replace(/^verify_result:.*$/m, "verify_result: pending")
    .replace(/^review_status:.*$/m, "review_status: pending")
    .replace(/^checkpoint_status:.*$/m, "checkpoint_status: pending");
  write(stateFile, state);

  execFileSync(process.execPath, [workflowState, project, "transition", "checkpoint-done"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8")
    .replace(/^phase:.*$/m, "phase: delivery")
    .replace(/^next_skill:.*$/m, "next_skill: verification-before-completion")
    .replace(/^verify_result:.*$/m, "verify_result: pass")
    .replace(/^review_status:.*$/m, "review_status: done");
  write(stateFile, state);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "delivery-complete"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("checkpoint-ready cannot skip verification or review", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-2
task_id: task-checkpoint
task_generation: 4
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pending
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: fixture
note: fixture
`);

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "checkpoint-ready"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
  assert.match(fs.readFileSync(stateFile, "utf8"), /phase: execution/);

  write(
    path.join(project, ".codex-context", "verification.md"),
    `# Verification

## Commands Run
- \`node --test\`: pass.

## Product Evidence
- Checkpoint fixture behavior verified.

## Not Yet Verified
- None.

## Review Evidence
- Not reviewed.
`
  );
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: verification")
      .replace(/^next_skill:.*$/m, "next_skill: codex-verification-loop")
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-pass"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  write(
    path.join(project, ".codex-context", "verification.md"),
    fs.readFileSync(path.join(project, ".codex-context", "verification.md"), "utf8").replace(
      "## Review Evidence\n- Not reviewed.",
      "## Review Evidence\n- Review completed with no blocking findings."
    )
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "review-complete"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  execFileSync(process.execPath, [workflowState, project, "transition", "checkpoint-ready"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: handoff/);
  assert.match(state, /next_skill: codex-git-checkpoint/);
});

test("delivery-complete requires verification and review evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-2
task_id: task-delivery-evidence
task_generation: 5
phase: delivery
next_skill: verification-before-completion
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pending
review_status: pending
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: fixture
note: fixture
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
  writeCanonicalDecision(project, "handoff-summary.md", "user-choice", "resume");
  execFileSync(process.execPath, [workflowState, project, "transition", "resume"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: execution/);
  assert.match(state, /next_skill: executing-plans/);
});

test("blocked rejects states that already have a pending user decision", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: planning")
      .replace(/^next_skill:.*$/m, "next_skill: writing-plans")
      .replace(/^decision_required:.*$/m, "decision_required: execution-approval")
      .replace(/^spec_status:.*$/m, "spec_status: approved")
      .replace(/^plan_status:.*$/m, "plan_status: drafted")
  );

  assert.throws(() => {
    execFileSync(process.execPath, [workflowState, project, "transition", "blocked"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /^phase: planning$/m);
  assert.match(state, /^decision_required: execution-approval$/m);
});

test("verification failure choices use explicit validated transitions", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  const verificationState = fs.readFileSync(stateFile, "utf8")
    .replace(/^phase:.*$/m, "phase: verification")
    .replace(/^next_skill:.*$/m, "next_skill: codex-verification-loop")
    .replace(/^decision_required:.*$/m, "decision_required: none")
    .replace(/^verify_result:.*$/m, "verify_result: pending");

  write(stateFile, verificationState);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- `node --test`: fail with the expected fixture error.\n\n## Not Yet Verified\n- The failing behavior remains unresolved.\n\n## Review Evidence\n- Not reviewed.\n"
  );
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-fail"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  let state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: debugging/);
  assert.match(state, /decision_required: verification-failure-choice/);

  writeCanonicalDecision(project, "verification.md", "verification-failure-choice", "verification-retry");
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-retry"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: debugging/);
  assert.match(state, /next_skill: systematic-debugging/);
  assert.match(state, /decision_required: none/);

  write(stateFile, verificationState);
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-fail"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  writeCanonicalDecision(project, "verification.md", "verification-failure-choice", "verification-gap-accepted");
  execFileSync(process.execPath, [workflowState, project, "transition", "verification-gap-accepted"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: review/);
  assert.match(state, /next_skill: codex-review-panel/);
  assert.match(state, /verify_result: gap-recorded/);
  assert.match(state, /decision_required: none/);
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
      .replace(/^decision_required: .*$/m, "decision_required: none")
      .replace(/^resume_phase: .*$/m, "resume_phase: none")
      .replace(/^resume_skill: .*$/m, "resume_skill: none")
      .replace(/^debug_return_phase: .*$/m, "debug_return_phase: none")
      .replace(/^debug_return_skill: .*$/m, "debug_return_skill: none")
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
  syncApprovalHashes(project);

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
  syncApprovalHashes(project);

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
  syncApprovalHashes(project);
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
  writeCanonicalDecision(project, "plan-progress.md", "execution-approval", "execution-approved-goal");
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
  writeCanonicalDecision(project, "plan-progress.md", "execution-approval", "execution-approved-traditional");
  execFileSync(process.execPath, [workflowState, project, "transition", "execution-approved-traditional"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(fs.readFileSync(stateFile, "utf8"), /loop_review_status: not-required/);
});

test("reopening scope invalidates downstream approvals and completion evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-3
task_id: task-reopen
task_generation: 7
phase: execution
next_skill: executing-plans
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pass
review_status: done
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);

  execFileSync(process.execPath, [workflowState, project, "transition", "brainstorming-start"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: brainstorming/);
  assert.match(state, /spec_status: living-draft/);
  assert.match(state, /plan_status: not-started/);
  assert.match(state, /execution_mode: pending/);
  assert.match(state, /execution_approval: pending/);
  assert.match(state, /loop_review_status: pending/);
  assert.match(state, /verify_result: pending/);
  assert.match(state, /review_status: pending/);
  assert.match(state, /checkpoint_status: pending/);
});

test("completed workflows require new-task before any further transition", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  const completeState = `workflow: standard
work_lane: lane-3
task_id: task-complete
task_generation: 9
phase: complete
next_skill: none
auto_next: false
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pass
verification_gap_status: not-required
review_status: done
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: fixture
handoff_task_id: task-complete
handoff_task_generation: 9
updated_at: fixture
note: fixture
`;

  for (const event of ["brainstorming-start", "spec-skipped", "plan-start", "blocked"]) {
    write(stateFile, completeState);
    assert.throws(() => {
      execFileSync(process.execPath, [workflowState, project, "transition", event], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, (error) => /workflow-state transition new-task/i.test(
      String(error.stderr || error.stdout || error.message)
    ));
    assert.match(fs.readFileSync(stateFile, "utf8"), /^phase: complete$/m);
    assert.match(fs.readFileSync(stateFile, "utf8"), /^task_generation: 9$/m);
  }
});

test("review changes reopen implementation and require a new verification cycle", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  write(stateFile, `workflow: standard
work_lane: lane-3
task_id: task-review-fix
task_generation: 8
phase: review
next_skill: codex-review-panel
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
loop_review_status: not-required
verify_result: pass
review_status: pending
checkpoint_status: done
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);

  execFileSync(process.execPath, [workflowState, project, "transition", "review-changes-requested"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const state = fs.readFileSync(stateFile, "utf8");
  assert.match(state, /phase: debugging/);
  assert.match(state, /next_skill: receiving-code-review/);
  assert.match(state, /verify_result: pending/);
  assert.match(state, /review_status: pending/);
  assert.match(state, /checkpoint_status: pending/);
});
