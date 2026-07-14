import * as support from "../project-ops-support.mjs";

const {
  assert,
  fs,
  git,
  path,
  readyHealthFixture,
  runHook,
  setWorkflowPhase,
  tempProject,
  test,
  write
} = support;

test("simple PowerShell read-only pipelines and Git diagnostics bypass recovery", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, { hook_event_name: "SessionStart", session_id: "read-pipeline", source: "resume" });

  for (const command of [
    "Get-Content README.md | Select-Object -First 1",
    "Get-ChildItem -Force | Select-Object Name,Length",
    "Get-Process node -ErrorAction SilentlyContinue | Select-Object Id,CPU,StartTime,Path",
    "$files=@('README.md','.codex-context/spec.md'); Get-FileHash -Algorithm SHA256 -LiteralPath $files | Select-Object Path,Hash | Format-Table -AutoSize",
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
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  runHook(project, { hook_event_name: "SessionStart", session_id: "unsafe-pipeline", source: "resume" });

  for (const command of [
    "Get-Content README.md | Select-Object $(Remove-Item work.txt)",
    "Get-Content README.md | Select-Object @{Name='x';Expression={Remove-Item work.txt}}",
    "Get-Content README.md | Select-Object & Remove-Item work.txt",
    "$files=@($(Remove-Item work.txt)); Get-FileHash -LiteralPath $files"
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
  git(external, ["init"]);
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

  const externalGitCheckpoint = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "external-git-checkpoint",
    tool_input: {
      command: "git add -- .; git commit -m checkpoint; git reset --hard"
    }
  });
  assert.deepEqual(externalGitCheckpoint, {});

  const wrappedExternalGitCheckpoint = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "wrapped-external-git-checkpoint",
    tool_input: {
      command: 'powershell.exe -NoProfile -Command "git add -- ."'
    }
  });
  assert.deepEqual(wrappedExternalGitCheckpoint, {});

  const explicitExternalGitCheckpoint = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    tool_name: "shell_command",
    tool_use_id: "explicit-external-git-checkpoint",
    tool_input: {
      command: `git -C "${external.replace(/\\/g, "/")}" add -- .`
    }
  });
  assert.deepEqual(explicitExternalGitCheckpoint, {});

  const ambiguousBareGitCheckpoint = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    tool_name: "shell_command",
    tool_use_id: "ambiguous-bare-git-checkpoint",
    tool_input: {
      command: "git add -- ."
    }
  });
  assert.equal(ambiguousBareGitCheckpoint.hookSpecificOutput?.permissionDecision, "deny");

  const redirectedGit = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    workdir: external,
    tool_name: "shell_command",
    tool_use_id: "redirected-git-checkpoint",
    tool_input: {
      command: `git -C "${project.replace(/\\/g, "/")}" add -- .`
    }
  });
  assert.equal(redirectedGit.hookSpecificOutput?.permissionDecision, "deny");

  const aliasParent = tempProject();
  const projectAlias = path.join(aliasParent, "project-alias");
  fs.symlinkSync(project, projectAlias, process.platform === "win32" ? "junction" : "dir");
  const aliasRedirectedGit = runHook(projectAlias, {
    hook_event_name: "PreToolUse",
    session_id: "external-work",
    tool_name: "shell_command",
    tool_use_id: "alias-redirected-git-checkpoint",
    tool_input: {
      command: `git -C "${project.replace(/\\/g, "/")}" add -- .`
    }
  });
  assert.equal(aliasRedirectedGit.hookSpecificOutput?.permissionDecision, "deny");

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
  assert.deepEqual(opaqueRelativeCommand, {});

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
  assert.deepEqual(absoluteCommand, {});
});

test("minimal guardrails allow diagnostics, network control, and external scripts", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  const external = tempProject();
  const externalScript = path.join(external, "check-deps.mjs");
  write(externalScript, "process.stdout.write('ok\\n');\n");

  for (const command of [
    "node .codex/hooks/project-ops.mjs context-budget",
    "Invoke-RestMethod -Method Get -Uri http://127.0.0.1:8000/api/health",
    "curl.exe -s http://127.0.0.1:8000/api/health",
    "curl.exe -s -X POST --data-raw https://example.com http://127.0.0.1:3456/new",
    `node "${externalScript.replace(/\\\\/g, "/")}"`,
    "if (Test-Path AGENTS.md) { Get-Content -Raw AGENTS.md }; Get-ChildItem .codex-context | Select-Object Name,Length"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "minimal-positive",
      tool_name: "shell_command",
      tool_use_id: `positive-${command.length}`,
      tool_input: { command }
    });
    assert.notEqual(
      output.hookSpecificOutput?.permissionDecision,
      "deny",
      `${command} should not be governed as a current-project mutation`
    );
  }
});

test("minimal guardrails still deny explicit current-project writes before execution approval", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");

  for (const command of [
    "Set-Content -LiteralPath work.txt -Value changed",
    "Remove-Item -LiteralPath work.txt",
    "Get-Content README.md > work.txt"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "minimal-negative",
      tool_name: "shell_command",
      tool_use_id: `negative-${command.length}`,
      tool_input: { command }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }

  const patchOutput = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "minimal-negative",
    tool_name: "apply_patch",
    tool_use_id: "negative-apply-patch",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch"
    }
  });
  assert.equal(patchOutput.hookSpecificOutput?.permissionDecision, "deny");
});

test("Stop is advisory-only even when project state is unfinished", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "unfinished change\n");

  const first = runHook(project, { hook_event_name: "Stop", session_id: "minimal-stop" });
  const second = runHook(project, { hook_event_name: "Stop", session_id: "minimal-stop" });

  assert.notEqual(first.decision, "block");
  assert.notEqual(second.decision, "block");
  const runtimeDir = path.join(project, ".codex-context", "raw", "project-ops-runtime");
  assert.deepEqual(fs.readdirSync(runtimeDir), ["liveness.json"]);
  const liveness = JSON.parse(fs.readFileSync(path.join(runtimeDir, "liveness.json"), "utf8"));
  assert.match(liveness.events.Stop, /^\d{4}-\d{2}-\d{2}T/);
});

test("PreCompact preserves handoff and overwrites one bounded latest snapshot", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const handoff = path.join(project, ".codex-context", "handoff-summary.md");
  const before = fs.readFileSync(handoff, "utf8");

  runHook(project, { hook_event_name: "PreCompact", trigger: "auto", session_id: "minimal-compact" });
  runHook(project, { hook_event_name: "PreCompact", trigger: "auto", session_id: "minimal-compact" });

  assert.equal(fs.readFileSync(handoff, "utf8"), before);
  const rawDir = path.join(project, ".codex-context", "raw");
  const snapshots = fs.readdirSync(rawDir).filter((name) => name.startsWith("precompact"));
  assert.deepEqual(snapshots, ["precompact-latest.md"]);
  assert.ok(fs.statSync(path.join(rawDir, "precompact-latest.md")).size <= 64 * 1024);
});
