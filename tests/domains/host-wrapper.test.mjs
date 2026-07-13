import * as support from "../project-ops-support.mjs";

const {
  assert,
  execFileSync,
  fs,
  git,
  path,
  readJson,
  readyHealthFixture,
  root,
  runHook,
  setWorkflowPhase,
  tempProject,
  test,
  workflowState,
  write
} = support;

function acknowledgeSessionRecovery(project, sessionId) {
  const command = "node .codex/hooks/project-ops.mjs context-recovery-eval";
  const toolInput = { command };
  runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: `recovery-${sessionId}`,
    tool_input: toolInput
  });
  execFileSync(process.execPath, [path.join(root, "scripts", "context-recovery-eval.mjs"), project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    tool_name: "shell_command",
    tool_use_id: `recovery-${sessionId}`,
    tool_input: toolInput,
    tool_response: { is_error: false, exit_code: 0 }
  });
}

function committedExecutionProject() {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- Baseline.\n\n## Not Yet Verified\n- None.\n"
  );
  write(path.join(project, "work.txt"), "before\n");
  execFileSync(process.execPath, [workflowState, project, "hash", "--write"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  git(project, ["add", "-A"]);
  git(project, ["commit", "-m", "baseline"]);
  return project;
}

test("simple PowerShell read-only pipelines and Git diagnostics bypass recovery", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, { hook_event_name: "SessionStart", session_id: "read-pipeline", source: "resume" });

  for (const command of [
    "Get-Content README.md | Select-Object -First 1",
    "Get-ChildItem -Force | Select-Object Name,Length",
    "git status --short; git remote -v; git worktree list --porcelain"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "read-pipeline",
      tool_name: "shell_command",
      tool_use_id: `read-${command.length}`,
      tool_input: { command }
    });
    assert.deepEqual(output, {}, command);
  }
});

test("PowerShell pipeline transforms with executable expressions remain gated", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, { hook_event_name: "SessionStart", session_id: "unsafe-pipeline", source: "resume" });

  for (const command of [
    "Get-Content README.md | Select-Object $(Remove-Item work.txt)",
    "Get-Content README.md | Select-Object @{Name='x';Expression={Remove-Item work.txt}}",
    "Get-Content README.md | Select-Object & Remove-Item work.txt"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "unsafe-pipeline",
      tool_name: "shell_command",
      tool_use_id: `unsafe-${command.length}`,
      tool_input: { command }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }
});

test("verified work outside the project root is not governed by the current project phase", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "planning", "writing-plans");
  const external = tempProject();
  const externalFile = path.join(external, "work.txt");

  const patch = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    tool_name: "apply_patch",
    tool_use_id: "external-patch",
    tool_input: {
      patch: `*** Begin Patch\n*** Update File: ${externalFile.replace(/\\/g, "/")}\n*** End Patch`
    }
  });
  assert.deepEqual(patch, {});

  const verification = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "external-test",
    tool_input: {
      command: "node --test tests/domains/core.test.mjs"
    }
  });
  assert.deepEqual(verification, {});

  const shellMutation = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "external-shell-mutation",
    tool_input: {
      command: "Set-Content -LiteralPath work.txt -Value changed"
    }
  });
  assert.deepEqual(shellMutation, {});

  const opaqueRelativeCommand = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "external-opaque-relative-command",
    tool_input: {
      command: "node mutate-relative.mjs ..\\project\\work.txt"
    }
  });
  assert.equal(opaqueRelativeCommand.hookSpecificOutput?.permissionDecision, "deny");

  const externalControlPlane = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "external-control-plane",
    tool_input: {
      command: "node .codex/hooks/project-ops.mjs workflow-state transition debugging-start"
    }
  });
  assert.deepEqual(externalControlPlane, {});

  const externalScript = path.join(external, ".codex", "hooks", "project-ops.mjs").replace(/\\/g, "/");
  const absoluteCommand = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    tool_name: "shell_command",
    tool_use_id: "external-absolute-command",
    tool_input: {
      command: `node "${externalScript}" workflow-state transition new-task`
    }
  });
  assert.equal(absoluteCommand.hookSpecificOutput?.permissionDecision, "deny");
});

test("PostToolUse empty object response records state refreshes by content hash", () => {
  const project = committedExecutionProject();
  const sessionId = "empty-response-refresh";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);

  const mutation = {
    tool_name: "apply_patch",
    tool_use_id: "empty-response-project-mutation",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", session_id: sessionId, ...mutation });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    ...mutation,
    tool_response: { is_error: false }
  });

  const refresh = {
    tool_name: "apply_patch",
    tool_use_id: "empty-response-state-refresh",
    tool_input: { patch: "*** Begin Patch\n*** Update File: .codex-context/current-state.md\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", session_id: sessionId, ...refresh });
  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Refreshed ${name}.\n`, "utf8");
  }
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    ...refresh,
    tool_response: {}
  });

  const receipt = readJson(path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "change-state.json"
  ));
  assert.deepEqual(Object.keys(receipt.refreshed_hashes).sort(), [
    "artifact-index.md",
    "current-state.md",
    "handoff-summary.md",
    "verification.md"
  ]);
});

test("PostToolUse explicit failure does not credit state refreshes", () => {
  const project = committedExecutionProject();
  const sessionId = "failed-response-refresh";
  runHook(project, { hook_event_name: "SessionStart", session_id: sessionId, source: "resume" });
  acknowledgeSessionRecovery(project, sessionId);

  const mutation = {
    tool_name: "apply_patch",
    tool_use_id: "failed-response-project-mutation",
    tool_input: { patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", session_id: sessionId, ...mutation });
  write(path.join(project, "work.txt"), "after\n");
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    ...mutation,
    tool_response: { is_error: false }
  });

  const refresh = {
    tool_name: "apply_patch",
    tool_use_id: "failed-response-state-refresh",
    tool_input: { patch: "*** Begin Patch\n*** Update File: .codex-context/current-state.md\n*** End Patch" }
  };
  runHook(project, { hook_event_name: "PreToolUse", session_id: sessionId, ...refresh });
  for (const name of ["artifact-index.md", "current-state.md", "verification.md", "handoff-summary.md"]) {
    fs.appendFileSync(path.join(project, ".codex-context", name), `\n- Attempted refresh ${name}.\n`, "utf8");
  }
  runHook(project, {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    ...refresh,
    tool_response: { is_error: true }
  });

  const receipt = readJson(path.join(
    project,
    ".codex-context",
    "raw",
    "project-ops-runtime",
    "change-state.json"
  ));
  assert.deepEqual(receipt.refreshed_hashes, {});
});
