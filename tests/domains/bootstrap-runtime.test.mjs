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
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "context-recovery-eval.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "solutions.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "session-history.mjs")), true);
  assert.equal(fs.existsSync(path.join(project, ".codex", "scripts", "skill-forward-eval.mjs")), true);
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

test("custom global skills install can bootstrap another project", () => {
  const installedProject = tempProject();
  const targetProject = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const alternateSource = tempProject();
  const sentinel = "CUSTOM TARGET SKILLS SOURCE";

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    installedProject,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  fs.cpSync(
    path.join(root, ".agents", "skills"),
    path.join(alternateSource, ".agents", "skills"),
    { recursive: true }
  );
  fs.copyFileSync(
    path.join(root, "dong-skills.manifest.json"),
    path.join(alternateSource, "dong-skills.manifest.json")
  );
  fs.appendFileSync(
    path.join(alternateSource, ".agents", "skills", "brainstorming", "SKILL.md"),
    `\n${sentinel}\n`,
    "utf8"
  );
  const customMarkerFile = path.join(skillsRoot, ".dong-skills-source.json");
  const customMarker = readJson(customMarkerFile);
  customMarker.source_repo = alternateSource;
  write(customMarkerFile, `${JSON.stringify(customMarker, null, 2)}\n`);

  const installedBootstrap = path.join(
    skillsRoot,
    "codex-codebase-onboarding",
    "scripts",
    "bootstrap-project-ops.ps1"
  );
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installedBootstrap,
    "-TargetProjectRoot",
    targetProject
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.existsSync(path.join(targetProject, ".agents", "skills", ".dong-skills-project.json")), true);
  assert.match(
    fs.readFileSync(path.join(targetProject, ".agents", "skills", "brainstorming", "SKILL.md"), "utf8"),
    new RegExp(sentinel)
  );
  execFileSync(process.execPath, [path.join(targetProject, ".codex", "scripts", "project-ops-health.mjs"), targetProject], {
    cwd: targetProject,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
});

test("installed bootstrap rejects tampered global entry skill content", () => {
  const installedProject = tempProject();
  const targetProject = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    installedProject,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  fs.appendFileSync(
    path.join(skillsRoot, "using-superpowers", "SKILL.md"),
    "\nTampered global entry skill.\n",
    "utf8"
  );
  const installedBootstrap = path.join(
    skillsRoot,
    "codex-codebase-onboarding",
    "scripts",
    "bootstrap-project-ops.ps1"
  );
  assert.throws(() => {
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      installedBootstrap,
      "-TargetProjectRoot",
      targetProject
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  }, /Command failed/);
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

test("bootstrapped health rejects a no-op project hook", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  write(path.join(project, ".codex", "hooks", "project-ops.mjs"), "console.log('noop');\n");

  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("bootstrapped health rejects tampered managed skill content", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  fs.appendFileSync(
    path.join(project, ".agents", "skills", "brainstorming", "SKILL.md"),
    "\nTampered after installation.\n",
    "utf8"
  );

  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("bootstrapped health rejects tampered managed runtime content", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  fs.appendFileSync(
    path.join(project, ".codex", "scripts", "lib", "core.mjs"),
    "\n// Tampered after installation.\n",
    "utf8"
  );

  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("bootstrapped health rejects a legacy marker paired with the v2 runtime contract", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const markerFile = path.join(project, ".agents", "skills", ".dong-skills-project.json");
  const marker = readJson(markerFile);
  marker.schema = "dong-skills.project-install.v1";
  delete marker.content_receipt;
  delete marker.source_manifest_sha256;
  write(markerFile, `${JSON.stringify(marker, null, 2)}\n`);

  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("bootstrap removes retired managed skills and Dong hook groups", () => {
  const project = tempProject();
  git(project, ["init"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  const skillsRoot = path.join(project, ".agents", "skills");
  const retired = path.join(skillsRoot, "retired-dong-skill");
  write(path.join(retired, "SKILL.md"), "---\nname: retired-dong-skill\n---\n");
  write(path.join(retired, ".dong-skill-managed.json"), JSON.stringify({
    managed_by: "Dong Skills", name: "retired-dong-skill"
  }));
  const projectMarker = readJson(path.join(skillsRoot, ".dong-skills-project.json"));
  projectMarker.installed_skills.push("retired-dong-skill");
  write(path.join(skillsRoot, ".dong-skills-project.json"), JSON.stringify(projectMarker, null, 2));
  const hooksFile = path.join(project, ".codex", "hooks.json");
  const hooks = readJson(hooksFile);
  hooks.hooks.LegacyDongEvent = [{ hooks: [{ command: "node .codex/hooks/project-ops.mjs" }] }];
  write(hooksFile, JSON.stringify(hooks, null, 2));

  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(fs.existsSync(retired), false);
  assert.equal(readJson(hooksFile).hooks.LegacyDongEvent.length, 0);
});

test("project bootstrap preview reports its plan without writing targets", () => {
  const project = tempProject();
  const beforeProject = fs.readdirSync(project);

  const out = execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project,
    "-Preview"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills bootstrap preview/);
  assert.match(out, /No files were written/);
  assert.deepEqual(fs.readdirSync(project), beforeProject);
});

test("project bootstrap rolls back the full install set after a late failure", () => {
  const project = tempProject();
  const args = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ];
  execFileSync("powershell.exe", args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const skillFile = path.join(project, ".agents", "skills", "brainstorming", "SKILL.md");
  const priorSkill = `${fs.readFileSync(skillFile, "utf8")}\nbootstrap-rollback-sentinel\n`;
  write(skillFile, priorSkill);
  const hooksFile = path.join(project, ".codex", "hooks.json");
  write(hooksFile, "{ malformed hooks json");

  assert.throws(() => {
    execFileSync("powershell.exe", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  assert.equal(fs.readFileSync(skillFile, "utf8"), priorSkill);
  assert.equal(fs.readFileSync(hooksFile, "utf8"), "{ malformed hooks json");
});

test("project bootstrap serializes concurrent writes with a bounded lock", () => {
  const project = tempProject();
  const lockFile = installLockPath(project);
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  fs.rmSync(lockFile, { force: true });

  const escapedLock = lockFile.replace(/'/g, "''");
  const holder = spawn("powershell.exe", [
    "-NoProfile",
    "-Command",
    `$stream = [System.IO.File]::Open('${escapedLock}', 'OpenOrCreate', 'ReadWrite', 'None'); Write-Output 'LOCKED'; Start-Sleep -Seconds 10; $stream.Dispose()`
  ], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const deadline = Date.now() + 5000;
    while (!fs.existsSync(lockFile) && Date.now() < deadline) sleep(25);
    assert.equal(fs.existsSync(lockFile), true, "lock holder did not create the lock file");

    assert.throws(() => {
      execFileSync("powershell.exe", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
        "-TargetProjectRoot", project,
        "-LockTimeoutSeconds", "1"
      ], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
  } finally {
    holder.kill();
  }
});
