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

test("Windows installer preserves existing UTF-8 Chinese AGENTS.md", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const originalChinese = "中文规则：保持原文。";
  write(path.join(project, "AGENTS.md"), `# Project Instructions\n\n${originalChinese}\n`);

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const agents = fs.readFileSync(path.join(project, "AGENTS.md"), "utf8");
  assert.match(agents, new RegExp(escapeRegExp(originalChinese)));
  assert.doesNotMatch(agents, /\uFFFD/);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-project-governance", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, "brainstorming", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
  const projectMarker = readJson(path.join(project, ".agents", "skills", ".dong-skills-project.json"));
  assert.equal(projectMarker.schema, "dong-skills.project-install.v2");
  assert.match(projectMarker.source_manifest_sha256, /^[a-f0-9]{64}$/);
  assert.match(projectMarker.content_receipt.skill_trees.brainstorming, /^[a-f0-9]{64}$/);
  assert.match(projectMarker.content_receipt.runtime_files[".codex/scripts/lib/core.mjs"], /^[a-f0-9]{64}$/);
  execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "project-ops-health.mjs"), project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(fs.existsSync(path.join(skillsRoot, ".dong-skills-source.json")), true);
  const sourceMarker = readJson(path.join(skillsRoot, ".dong-skills-source.json"));
  assert.deepEqual(sourceMarker.global_bootstrap_skills, ["codex-codebase-onboarding", "using-superpowers"]);
  assert.ok(sourceMarker.global_skills.includes("codex-skill-evolution"));
});

test("Windows installer preserves existing context facts while restoring missing template files", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const installArgs = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot
  ];

  execFileSync("powershell.exe", installArgs, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const verification = path.join(project, ".codex-context", "verification.md");
  const preserved = [
    "# 验证",
    "",
    "## 已验证",
    "- 204/204 tests passed.",
    "",
    "## Review Evidence",
    "- Ready; no blocking findings.",
    ""
  ].join("\n");
  write(verification, preserved);
  const missingTemplate = path.join(project, ".codex-context", "open-questions.md");
  fs.rmSync(missingTemplate);

  execFileSync("powershell.exe", installArgs, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.equal(fs.readFileSync(verification, "utf8"), preserved);
  assert.equal(fs.existsSync(missingTemplate), true);
});

test("Windows installer removes only managed Dong global skills and preserves non-Dong local skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");

  write(path.join(skillsRoot, "doc", "SKILL.md"), "---\nname: doc\n---\n\n# User doc skill\n");
  write(path.join(skillsRoot, "codex-project-governance", "SKILL.md"), "---\nname: codex-project-governance\n---\n\n# Codex Project Governance\nDong Skills old global copy.\n");
  write(path.join(skillsRoot, "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n\n# Brainstorming\nDong Skills old global copy.\n");
  write(path.join(skillsRoot, "codex-project-governance", ".dong-skill-managed.json"), JSON.stringify({
    managed_by: "Dong Skills",
    name: "codex-project-governance"
  }));
  write(path.join(skillsRoot, "brainstorming", ".dong-skill-managed.json"), JSON.stringify({
    managed_by: "Dong Skills",
    name: "brainstorming"
  }));

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.existsSync(path.join(skillsRoot, "doc", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-project-governance", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, "brainstorming", "SKILL.md")), false);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
});

test("Windows installer preserves same-name non-Dong global skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const userSkill = path.join(skillsRoot, "codex-project-governance", "SKILL.md");
  const userSkillText = "---\nname: codex-project-governance\n---\n\n# User governance helper\nThis is a personal unrelated skill.\n";
  write(userSkill, userSkillText);

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.readFileSync(userSkill, "utf8"), userSkillText);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-codebase-onboarding", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "using-superpowers", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, "codex-skill-evolution", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", "codex-project-governance", "SKILL.md")), true);
});

test("Windows installer preflights all project skill conflicts before replacing any skill", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");

  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const sentinel = path.join(project, ".agents", "skills", "brainstorming", "keep-on-failure.txt");
  write(sentinel, "must survive failed upgrade\n");
  const conflict = path.join(project, ".agents", "skills", "codex-skill-evolution");
  fs.rmSync(conflict, { recursive: true, force: true });
  const userSkill = "---\nname: codex-skill-evolution\n---\n\n# User-owned conflict\n";
  write(path.join(conflict, "SKILL.md"), userSkill);

  assert.throws(() => {
    execFileSync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
      "-TargetProjectRoot", project,
      "-TargetSkillsRoot", skillsRoot
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  }, /Command failed/);

  assert.equal(fs.readFileSync(sentinel, "utf8"), "must survive failed upgrade\n");
  assert.equal(fs.readFileSync(path.join(conflict, "SKILL.md"), "utf8"), userSkill);
});

test("Windows installer preserves unmarked user skills that mention Dong Skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  const userSkill = path.join(skillsRoot, "brainstorming", "SKILL.md");
  const sentinel = path.join(skillsRoot, "brainstorming", "owner.txt");
  const userSkillText = `---
name: brainstorming
description: user-owned skill
---

# User skill

This skill interoperates with Dong Skills but is not managed by it.
`;
  write(userSkill, userSkillText);
  write(sentinel, "user-owned-sentinel\n");

  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    installWindows,
    "-TargetProjectRoot",
    project,
    "-TargetSkillsRoot",
    skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.readFileSync(userSkill, "utf8"), userSkillText);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "user-owned-sentinel\n");
});

test("Windows installer removes retired managed project skills", () => {
  const project = tempProject();
  const skillsRoot = path.join(tempProject(), "skills");
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  const projectSkills = path.join(project, ".agents", "skills");
  const retired = path.join(projectSkills, "retired-dong-skill");
  write(path.join(retired, "SKILL.md"), "---\nname: retired-dong-skill\n---\n");
  write(path.join(retired, ".dong-skill-managed.json"), JSON.stringify({
    managed_by: "Dong Skills", name: "retired-dong-skill"
  }));
  const markerFile = path.join(projectSkills, ".dong-skills-project.json");
  const marker = readJson(markerFile);
  marker.installed_skills.push("retired-dong-skill");
  write(markerFile, `${JSON.stringify(marker, null, 2)}\n`);

  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

  assert.equal(fs.existsSync(retired), false);
});

test("Windows installer preview reports the complete plan without writing targets", () => {
  const project = tempProject();
  const skillsRoot = tempProject();
  const beforeProject = fs.readdirSync(project);
  const beforeSkills = fs.readdirSync(skillsRoot);

  const out = execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot,
    "-Preview"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills install preview/);
  assert.match(out, /No files were written/);
  assert.deepEqual(fs.readdirSync(project), beforeProject);
  assert.deepEqual(fs.readdirSync(skillsRoot), beforeSkills);
});

test("Windows installer rolls back the full install set after a late failure", () => {
  const project = tempProject();
  const skillsRoot = tempProject();
  const args = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
    "-TargetProjectRoot", project,
    "-TargetSkillsRoot", skillsRoot
  ];
  execFileSync("powershell.exe", args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const skillFile = path.join(project, ".agents", "skills", "brainstorming", "SKILL.md");
  const priorSkill = `${fs.readFileSync(skillFile, "utf8")}\ntransaction-rollback-sentinel\n`;
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

test("Windows installer serializes concurrent writes with a bounded lock", () => {
  const project = tempProject();
  const skillsRoot = tempProject();
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
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
        "-TargetProjectRoot", project,
        "-TargetSkillsRoot", skillsRoot,
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
