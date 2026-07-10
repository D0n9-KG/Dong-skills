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
  readyHealthFixture,
  root,
  tempProject,
  test,
  write
} = support;

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
