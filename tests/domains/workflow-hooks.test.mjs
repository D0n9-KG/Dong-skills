import * as support from "../project-ops-support.mjs";

const {
  assert,
  bootstrap,
  execFileSync,
  fs,
  git,
  health,
  hook,
  path,
  readJson,
  readyHealthFixture,
  runHook,
  setWorkflowPhase,
  tempProject,
  test,
  workflowState,
  write
} = support;

function hookConfigFiles() {
  return [
    path.join(support.root, ".codex", "hooks.json"),
    path.join(
      support.root,
      ".agents",
      "skills",
      "codex-codebase-onboarding",
      "assets",
      "project-ops",
      ".codex",
      "hooks.json"
    )
  ];
}

test("published hook configuration exposes only the minimal kernel", () => {
  for (const file of hookConfigFiles()) {
    const config = readJson(file);
    assert.deepEqual(
      Object.keys(config.hooks).sort(),
      ["PreCompact", "PreToolUse", "SessionStart", "Stop"]
    );
    for (const [eventName, groups] of Object.entries(config.hooks)) {
      assert.ok(Array.isArray(groups), eventName);
      for (const group of groups) {
        for (const entry of group.hooks || []) {
          assert.match(entry.command || "", /launch-project-ops\.mjs/);
          assert.match(entry.command || "", /process\.stdin/);
          assert.equal(entry.commandWindows, undefined);
          assert.doesNotMatch(entry.commandWindows || "", /EncodedCommand/i);
        }
      }
    }
  }
});

test("Windows hook command runs through the installed launcher", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      bootstrap,
      "-TargetProjectRoot",
      project
    ],
    {
      cwd: support.root,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const entry = readJson(path.join(project, ".codex", "hooks.json"))
    .hooks.SessionStart[0].hooks[0];
  const command = entry.commandWindows || entry.command_windows || entry.command;
  const hostWorkdir = tempProject();
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: hostWorkdir,
      input: JSON.stringify({ cwd: project, hook_event_name: "SessionStart" }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }
  );
  const parsed = JSON.parse(output.trim());
  assert.match(parsed.hookSpecificOutput.additionalContext, /Dong Skills project context/);
});

test("Windows hook command fails open when hook input cwd is not a Git worktree", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      bootstrap,
      "-TargetProjectRoot",
      project
    ],
    {
      cwd: support.root,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const entry = readJson(path.join(project, ".codex", "hooks.json"))
    .hooks.PreToolUse[0].hooks[0];
  const command = entry.commandWindows || entry.command_windows || entry.command;
  const outside = tempProject();
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: outside,
      input: JSON.stringify({
        cwd: outside,
        hook_event_name: "PreToolUse",
        tool_name: "shell_command",
        tool_input: { command: "Get-Content README.md" }
      }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }
  );
  assert.deepEqual(JSON.parse(output.trim()), {});
});

test("launcher dispatches from hook input cwd", () => {
  const source = tempProject();
  const target = tempProject();
  git(source, ["init"]);
  git(target, ["init"]);
  write(path.join(source, ".codex", "hooks", "project-ops.mjs"), "console.log(JSON.stringify({ root: 'source' }));\n");
  write(path.join(target, ".codex", "hooks", "project-ops.mjs"), "console.log(JSON.stringify({ root: 'target' }));\n");

  const launcher = path.join(support.root, ".codex", "hooks", "launch-project-ops.mjs");
  const output = execFileSync(process.execPath, [launcher], {
    cwd: source,
    input: JSON.stringify({ cwd: target, hook_event_name: "SessionStart" }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  assert.deepEqual(JSON.parse(output.trim()), { root: "target" });
});

test("workflow-state CLI remains available through project hook", () => {
  const project = tempProject();
  git(project, ["init"]);
  const initialized = execFileSync(process.execPath, [workflowState, project, "init"], {
    cwd: support.root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(initialized, /Initialized workflow state/);

  const status = execFileSync(process.execPath, [hook, "workflow-state", "status", project], {
    cwd: support.root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(status, /phase=/);
});

test("wayfinding blocks explicit current-project writes but permits canonical governance files", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");

  for (const command of [
    "Set-Content -LiteralPath work.txt -Value changed",
    "Remove-Item -LiteralPath work.txt",
    "Get-Content README.md > work.txt",
    "git add -- .",
    "git reset --hard",
    "git clean -fd",
    "git --git-dir=.git --work-tree=. add -- .",
    "git --git-dir=.git --work-tree=. reset --hard",
    "git --git-dir=.git --work-tree=. clean -fd",
    "git -C . commit -m checkpoint"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "kernel-negative",
      tool_name: "shell_command",
      tool_use_id: "negative-" + command.length,
      tool_input: { command }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }

  const governance = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "kernel-governance",
    tool_name: "apply_patch",
    tool_use_id: "governance-spec",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: .codex-context/spec.md\n*** End Patch"
    }
  });
  assert.deepEqual(governance, {});
});

test("execution permits the explicitly approved project write path", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "kernel-execution",
    tool_name: "apply_patch",
    tool_use_id: "execution-write",
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch"
    }
  });
  assert.notEqual(output.hookSpecificOutput?.permissionDecision, "deny");
});

test("external, network, and unknown commands remain fail-open", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  const external = tempProject();
  const externalScript = path.join(external, "check.mjs");
  write(externalScript, "process.stdout.write('ok\\n');\n");

  for (const command of [
    "Invoke-RestMethod -Method Get -Uri http://127.0.0.1:8000/api/health",
    "curl.exe -s http://127.0.0.1:8000/api/health",
    "git fetch --all --prune",
    "git -C checkout status",
    "powershell.exe -NoProfile -EncodedCommand not-valid-base64!",
    "node " + JSON.stringify(externalScript)
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "kernel-external",
      tool_name: "shell_command",
      tool_use_id: "external-" + command.length,
      tool_input: { command }
    });
    assert.notEqual(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }
});

test("external aliases that resolve into the project remain governed", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  const aliasParent = tempProject();
  const alias = path.join(aliasParent, "project-alias");
  fs.symlinkSync(project, alias, process.platform === "win32" ? "junction" : "dir");

  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "alias-write",
    tool_name: "Write",
    tool_use_id: "alias-write-target",
    tool_input: { file_path: path.join(alias, "work.txt") }
  });
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
});

test("apply_patch move destinations inside the project remain governed", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  const outside = path.join(tempProject(), "outside.txt");

  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "move-destination",
    tool_name: "apply_patch",
    tool_use_id: "move-destination-inside",
    tool_input: {
      patch: `*** Begin Patch\n*** Update File: ${outside.replace(/\\/g, "/")}\n*** Move to: moved-inside.txt\n*** End Patch`
    }
  });
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
});

test("literal Windows shell wrappers preserve explicit project write detection", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");

  const encodedWrite = Buffer.from(
    "Set-Content -LiteralPath work.txt -Value changed",
    "utf16le"
  ).toString("base64");
  for (const command of [
    "cmd.exe /d /c del work.txt",
    "cmd.exe /d /c copy source.txt work.txt",
    "cmd.exe /d /c move source.txt work.txt",
    "cmd.exe /d /c ren source.txt work.txt",
    'powershell.exe -NoProfile -Command "Set-Content -LiteralPath work.txt -Value changed"',
    'powershell.exe -NoProfile -Command "copy source.txt work.txt"',
    'powershell.exe -NoProfile -Command "Copy-Item -Path source.txt work.txt"',
    `powershell.exe -NoProfile -EncodedCommand ${encodedWrite}`,
    "bash -lc 'rm work.txt'"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "wrapped-write",
      tool_name: "shell_command",
      tool_use_id: `wrapped-${command.length}`,
      tool_input: { command }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }
});

test("deterministic writes and Git operations outside the project remain fail-open", () => {
  const project = tempProject();
  readyHealthFixture(project);
  setWorkflowPhase(project, "wayfinding", "codex-wayfinder");
  const external = tempProject();
  git(external, ["init"]);
  const encodedExternalWrite = Buffer.from(
    `Set-Content -LiteralPath ${JSON.stringify(path.join(external, "encoded-outside.txt"))} -Value changed`,
    "utf16le"
  ).toString("base64");

  for (const command of [
    `Set-Content -LiteralPath ${JSON.stringify(path.join(external, "outside.txt"))} -Value changed`,
    `Set-Content -LiteralPath ${JSON.stringify(path.join(external, "outside-with-project-value.txt"))} -Value ${JSON.stringify(path.join(project, "README.md"))}`,
    `Copy-Item -LiteralPath ${JSON.stringify(path.join(project, "README.md"))} -Destination ${JSON.stringify(path.join(external, "copied.txt"))}`,
    `powershell.exe -NoProfile -EncodedCommand ${encodedExternalWrite}`,
    `git -C ${JSON.stringify(external)} reset --hard`,
    `git --git-dir=${JSON.stringify(path.join(external, ".git"))} --work-tree=${JSON.stringify(external)} add -- .`,
    `powershell.exe -NoProfile -Command "git --git-dir='${path.join(external, ".git").replace(/\\/g, "/")}' --work-tree='${external.replace(/\\/g, "/")}' add -- ."`
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "external-write",
      tool_name: "shell_command",
      tool_use_id: `external-write-${command.length}`,
      tool_input: { command }
    });
    assert.notEqual(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }

  const patchOutput = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "external-patch-workdir",
    tool_name: "apply_patch",
    tool_use_id: "external-patch-workdir",
    workdir: external,
    tool_input: {
      patch: "*** Begin Patch\n*** Update File: work.txt\n*** End Patch"
    }
  });
  assert.notEqual(patchOutput.hookSpecificOutput?.permissionDecision, "deny");

  const inside = path.join(project, "moved-inside.txt");
  const relativeInside = path.relative(external, inside);
  const relativeProject = path.relative(external, project);
  for (const command of [
    `Move-Item outside.txt ${JSON.stringify(relativeInside)}`,
    `Copy-Item outside.txt ${JSON.stringify(relativeInside)}`,
    `mv outside.txt ${JSON.stringify(relativeInside)}`,
    `cp outside.txt ${JSON.stringify(relativeInside)}`,
    `Move-Item outside.txt -Destination:${JSON.stringify(relativeInside)}`,
    `Copy-Item -Path:outside.txt -Destination:${JSON.stringify(relativeInside)}`,
    `cp --target-directory=${JSON.stringify(relativeProject)} outside.txt`
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "external-two-path-write",
      tool_name: "shell_command",
      tool_use_id: `external-two-path-${command.length}`,
      tool_input: { command, workdir: external }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
  }
});

test("workflow state protection is case-insensitive and covers cmd delete aliases", () => {
  const project = tempProject();
  readyHealthFixture(project);

  for (const command of [
    "Set-Content .codex-context\\WORKFLOW-STATE.yaml 'phase: complete'",
    "del .codex-context\\workflow-state.yaml",
    "Remove-Item -Recurse -Force .codex-context",
    "Remove-Item -Recurse -Force .codex-context/*.yaml",
    "Remove-Item -Recurse -Force .",
    "cmd.exe /d /c rmdir /s /q .codex-context",
    "rm -rf .codex-context",
    "rm -rf *",
    "Move-Item .codex-context backup-context",
    "Rename-Item .codex-context backup-context",
    "git checkout HEAD -- .codex-context/workflow-state.yaml",
    "git -C . checkout HEAD -- .codex-context/workflow-state.yaml",
    "git.exe restore -- .codex-context/workflow-state.yaml",
    "Rename-Item .codex-context/candidate.yaml workflow-state.yaml",
    "Rename-Item -LiteralPath .codex-context/candidate.yaml workflow-state.yaml",
    "Rename-Item -LiteralPath:.codex-context/candidate.yaml -NewName:workflow-state.yaml",
    "cmd.exe /d /c ren .codex-context\\candidate.yaml workflow-state.yaml",
    "Set-Content -LiteralPath:.codex-context\\workflow-state.yaml -Value 'phase: complete'",
    "Remove-Item -LiteralPath:.codex-context\\workflow-state.yaml"
  ]) {
    const output = runHook(project, {
      hook_event_name: "PreToolUse",
      session_id: "workflow-state-protection",
      tool_name: "shell_command",
      tool_use_id: `workflow-state-${command.length}`,
      tool_input: { command }
    });
    assert.equal(output.hookSpecificOutput?.permissionDecision, "deny", command);
    assert.match(output.hookSpecificOutput.permissionDecisionReason, /workflow-state\.yaml/i);
  }
});

test("workflow state protection resolves relative targets from the tool workdir", () => {
  const project = tempProject();
  readyHealthFixture(project);

  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "workflow-state-workdir",
    tool_name: "shell_command",
    tool_use_id: "workflow-state-relative-workdir",
    tool_input: {
      command: "Set-Content -LiteralPath workflow-state.yaml -Value 'phase: complete'",
      workdir: path.join(project, ".codex-context")
    }
  });
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /workflow-state\.yaml/i);
});

test("workflow state protection treats a project ancestor as an overlapping target", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const output = runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "workflow-state-ancestor",
    tool_name: "shell_command",
    tool_use_id: "workflow-state-ancestor",
    tool_input: {
      command: `Remove-Item -Recurse -Force ${JSON.stringify(path.dirname(project))}`
    }
  });
  assert.equal(output.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /workflow-state\.yaml/i);
});

test("SessionStart, PreToolUse, and Stop record current-runtime liveness", () => {
  const project = tempProject();
  readyHealthFixture(project);
  runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "liveness-session",
    source: "startup"
  });
  runHook(project, {
    hook_event_name: "PreToolUse",
    session_id: "liveness-session",
    tool_name: "shell_command",
    tool_use_id: "liveness-read",
    tool_input: { command: "Get-Content README.md | Select-Object -First 1" }
  });
  runHook(project, { hook_event_name: "Stop", session_id: "liveness-session" });

  const output = execFileSync(process.execPath, [health, project], {
    cwd: support.root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /Critical event coverage: complete/);
  assert.match(output, /Missing critical events: none/);
});

test("Stop is advisory-only and repeated calls do not create a loop", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "work.txt"), "unfinished\n");
  const first = runHook(project, { hook_event_name: "Stop", session_id: "stop-session" });
  const second = runHook(project, { hook_event_name: "Stop", session_id: "stop-session" });
  assert.notEqual(first.decision, "block");
  assert.notEqual(second.decision, "block");
});

test("PreCompact preserves handoff and overwrites one bounded snapshot", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const handoff = path.join(project, ".codex-context", "handoff-summary.md");
  const before = fs.readFileSync(handoff, "utf8");
  runHook(project, { hook_event_name: "PreCompact", trigger: "auto", session_id: "compact-session" });
  runHook(project, { hook_event_name: "PreCompact", trigger: "auto", session_id: "compact-session" });

  assert.equal(fs.readFileSync(handoff, "utf8"), before);
  const raw = path.join(project, ".codex-context", "raw");
  assert.deepEqual(
    fs.readdirSync(raw).filter((name) => name.startsWith("precompact")),
    ["precompact-latest.md"]
  );
  assert.ok(fs.statSync(path.join(raw, "precompact-latest.md")).size <= 64 * 1024);
  const session = runHook(project, {
    hook_event_name: "SessionStart",
    session_id: "compact-recovery-pointer",
    source: "compact"
  });
  assert.match(session.hookSpecificOutput.additionalContext, /raw\/precompact-latest\.md/);
});

test("PreCompact remains non-blocking when its raw snapshot cannot be written", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const raw = path.join(project, ".codex-context", "raw");
  fs.rmSync(raw, { recursive: true, force: true });
  write(raw, "not a directory\n");

  const output = runHook(project, {
    hook_event_name: "PreCompact",
    trigger: "auto",
    session_id: "compact-write-failure"
  });
  assert.equal(output.continue, true);
  assert.match(output.systemMessage || "", /snapshot.*not.*written|snapshot.*unavailable/i);
});

test("PreCompact enforces its snapshot cap in UTF-8 bytes", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex-context", "handoff-summary.md"),
    `# Handoff Summary\n\n## Objective\n${"颗粒流时代信息".repeat(12000)}\n`
  );

  runHook(project, {
    hook_event_name: "PreCompact",
    trigger: "auto",
    session_id: "compact-multibyte-cap"
  });

  const snapshot = path.join(project, ".codex-context", "raw", "precompact-latest.md");
  assert.ok(fs.statSync(snapshot).size <= 64 * 1024);
  assert.doesNotMatch(fs.readFileSync(snapshot, "utf8"), /\uFFFD/);
});

test("retired hook events fail open during host configuration rollover", () => {
  const project = tempProject();
  for (const eventName of ["UserPromptSubmit", "PostToolUse", "PostCompact", "SubagentStart", "SubagentStop"]) {
    const output = runHook(project, { cwd: project, hook_event_name: eventName });
    assert.deepEqual(output, {}, eventName);
  }
});

test("unknown hook events fail visibly", () => {
  const project = tempProject();
  const result = (() => {
    try {
      execFileSync(process.execPath, [hook], {
        cwd: project,
        input: JSON.stringify({ cwd: project, hook_event_name: "FutureUnknownEvent" }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      return null;
    } catch (error) {
      return error;
    }
  })();
  assert.ok(result);
  assert.match(String(result.stderr), /Unsupported hook event: FutureUnknownEvent/);
});
