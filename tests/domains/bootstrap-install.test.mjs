import * as support from "../project-ops-support.mjs";

const {
  assert,
  bootstrap,
  execFileSync,
  fs,
  git,
  health,
  hook,
  installWindows,
  path,
  readJson,
  root,
  sleep,
  solutions,
  tempProject,
  test,
  write
} = support;

function copySourceFixture(destination) {
  fs.cpSync(root, destination, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/") &&
        rel !== ".codex-context" && !rel.startsWith(".codex-context/");
    }
  });
}

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
  const workflowStateText = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(workflowStateText, /next_skill: codex-codebase-onboarding/);
  assert.doesNotMatch(workflowStateText, /^handoff_hash: null$/m);
  assert.match(workflowStateText, /^handoff_task_id: task-1$/m);
  assert.match(workflowStateText, /^handoff_task_generation: 1$/m);
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
  assert.match(context, /Dong Skills project context/);
  assert.match(context, /Workflow: phase=discovery/);
  assert.match(context, /handoff-summary\.md, workflow-state\.yaml, and current-state\.md/);
});

test("fresh bootstrap permits the first governance edit without a recovery receipt", () => {
  const project = tempProject();
  execFileSync("git", ["init"], {
    cwd: project,
    stdio: ["ignore", "ignore", "pipe"]
  });

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
  const runInstalledHook = (input) => {
    const output = execFileSync(process.execPath, [installedHook], {
      cwd: project,
      input: JSON.stringify({ cwd: project, ...input }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return output ? JSON.parse(output) : {};
  };

  runInstalledHook({
    hook_event_name: "SessionStart",
    session_id: "fresh-bootstrap-session",
    source: "startup"
  });

  const editPre = runInstalledHook({
    hook_event_name: "PreToolUse",
    session_id: "fresh-bootstrap-session",
    tool_name: "apply_patch",
    tool_use_id: "fresh-bootstrap-edit",
    tool_input: {
      patch: [
        "*** Begin Patch",
        "*** Update File: .codex-context/current-state.md",
        "@@",
        "-尚未记录任务级指令；等待用户提供或确认当前项目目标。",
        "+已收到首次项目检查指令。",
        "*** End Patch"
      ].join("\n")
    }
  });
  assert.notEqual(editPre.hookSpecificOutput?.permissionDecision, "deny");
});

test("installed global entry bootstraps from its verified snapshot after source relocation", () => {
  const fixture = tempProject();
  const source = path.join(fixture, "source");
  const relocated = path.join(fixture, "source-relocated");
  const installedProject = path.join(fixture, "installed-project");
  const targetProject = path.join(fixture, "target-project");
  const skillsRoot = path.join(fixture, "global-skills");
  fs.mkdirSync(installedProject, { recursive: true });
  fs.mkdirSync(targetProject, { recursive: true });
  copySourceFixture(source);
  const copiedInstaller = path.join(source, "scripts", "install-windows.ps1");

  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copiedInstaller,
    "-TargetProjectRoot", installedProject,
    "-TargetSkillsRoot", skillsRoot
  ], { cwd: source, stdio: ["ignore", "pipe", "pipe"] });
  fs.renameSync(source, relocated);

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
  ], { cwd: fixture, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.existsSync(path.join(targetProject, ".agents", "skills", ".dong-skills-project.json")), true);
  assert.equal(
    fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "assets", "project-skills", "brainstorming", "SKILL.project.md")),
    true
  );
  assert.equal(
    fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "assets", "project-skills", "brainstorming", "SKILL.md")),
    false
  );
  assert.equal(fs.existsSync(path.join(targetProject, ".agents", "skills", "brainstorming", "SKILL.md")), true);
  const sourceMarker = readJson(path.join(skillsRoot, ".dong-skills-source.json"));
  const projectMarker = readJson(path.join(targetProject, ".agents", "skills", ".dong-skills-project.json"));
  assert.match(sourceMarker.distribution_id, /^[a-f0-9]{64}$/);
  assert.equal(projectMarker.distribution_id, sourceMarker.distribution_id);
  execFileSync(process.execPath, [path.join(targetProject, ".codex", "scripts", "project-ops-health.mjs"), targetProject], {
    cwd: targetProject,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
});

test("installed global entry refuses a changed source instead of mixing distributions", () => {
  const fixture = tempProject();
  const source = path.join(fixture, "source");
  const installedProject = path.join(fixture, "installed-project");
  const targetProject = path.join(fixture, "target-project");
  const skillsRoot = path.join(fixture, "global-skills");
  fs.mkdirSync(installedProject, { recursive: true });
  fs.mkdirSync(targetProject, { recursive: true });
  copySourceFixture(source);
  const copiedInstaller = path.join(source, "scripts", "install-windows.ps1");
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copiedInstaller,
    "-TargetProjectRoot", installedProject,
    "-TargetSkillsRoot", skillsRoot
  ], { cwd: source, stdio: ["ignore", "pipe", "pipe"] });

  fs.appendFileSync(
    path.join(source, ".agents", "skills", "brainstorming", "SKILL.md"),
    "\nSOURCE CHANGED AFTER GLOBAL INSTALL\n",
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
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installedBootstrap,
      "-TargetProjectRoot", targetProject
    ], {
      cwd: fixture,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
  assert.equal(fs.existsSync(path.join(targetProject, ".agents", "skills", ".dong-skills-project.json")), false);
});

test("bootstrap migrates a historical workflow schema before health validation", () => {
  const project = tempProject();
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: discovery
next_skill: codex-codebase-onboarding
auto_next: true
decision_required: none
spec_status: not-started
plan_status: not-started
execution_mode: pending
execution_approval: pending
verify_result: pending
review_status: pending
checkpoint_status: pending
handoff_hash: null
updated_at: historical-fixture
note: historical-fixture
`);

  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const migrated = fs.readFileSync(path.join(project, ".codex-context", "workflow-state.yaml"), "utf8");
  assert.match(migrated, /^work_lane: lane-1$/m);
  assert.match(migrated, /^task_id: task-1$/m);
  assert.match(migrated, /^task_generation: 1$/m);
  assert.match(migrated, /^verification_gap_status: not-required$/m);
  assert.match(migrated, /^verification_evidence_hash: none$/m);
  assert.match(migrated, /^review_evidence_hash: none$/m);
  assert.match(migrated, /^resume_phase: none$/m);
  assert.match(migrated, /^resume_skill: none$/m);
  execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
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
