import * as support from "../project-ops-support.mjs";

const {
  assert,
  bootstrap,
  execFileSync,
  fs,
  git,
  installLockPath,
  installTransactionJournalPath,
  installWindows,
  path,
  readFileAfterUnlock,
  readJson,
  root,
  sleep,
  spawn,
  stopProcessTree,
  tempProject,
  test,
  write
} = support;

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

test("project bootstrap uses one lock for real and junction aliases", () => {
  const realProject = tempProject();
  const aliasRoot = tempProject();
  const junctionProject = path.join(aliasRoot, "project-junction");
  fs.symlinkSync(realProject, junctionProject, "junction");
  const lockFile = installLockPath(realProject);
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
    let error;
    try {
      execFileSync("powershell.exe", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
        "-TargetProjectRoot", junctionProject,
        "-LockTimeoutSeconds", "1"
      ], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      assert.fail("junction alias unexpectedly bypassed the active install lock");
    } catch (caught) {
      error = caught;
    }
    assert.match(String(error.message), /Command failed/);
    assert.match(String(error.stderr), /Another Dong Skills install is already modifying this target/);
  } finally {
    holder.kill();
  }
});

test("root installer recovers a process-terminated transaction on the next run", () => {
  const fixtureRoot = tempProject();
  const sourceCopy = path.join(fixtureRoot, "source");
  const project = path.join(fixtureRoot, "project");
  const globalSkills = path.join(fixtureRoot, "global-skills");
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(globalSkills, { recursive: true });
  fs.cpSync(root, sourceCopy, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/") &&
        rel !== ".codex-context" && !rel.startsWith(".codex-context/");
    }
  });

  const copiedInstaller = path.join(sourceCopy, "scripts", "install-windows.ps1");
  const args = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copiedInstaller,
    "-TargetSkillsRoot", globalSkills,
    "-TargetProjectRoot", project
  ];
  const journalFile = installTransactionJournalPath([project, globalSkills]);

  try {
    execFileSync("powershell.exe", args, {
      cwd: sourceCopy,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const manifest = readJson(path.join(sourceCopy, "dong-skills.manifest.json"));
    const firstSkill = manifest.global_skills[0];
    const target = path.join(globalSkills, firstSkill);
    const source = fs.readFileSync(copiedInstaller, "utf8");
    const needle = "      Move-Item -LiteralPath $target -Destination $backup";
    assert.ok(source.includes(needle), "installer crash injection point is missing");
    write(
      copiedInstaller,
      source.replace(needle, `${needle}\n      Stop-Process -Id $PID -Force`)
    );

    assert.throws(() => {
      execFileSync("powershell.exe", args, {
        cwd: sourceCopy,
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
    assert.equal(fs.existsSync(target), false);
    assert.equal(fs.existsSync(journalFile), true);
    assert.ok(
      fs.readdirSync(globalSkills).some((name) => name.startsWith(`.${firstSkill}.previous-`)),
      "crash fixture should leave the interrupted skill backup"
    );

    fs.copyFileSync(installWindows, copiedInstaller);
    execFileSync("powershell.exe", args, {
      cwd: sourceCopy,
      stdio: ["ignore", "pipe", "pipe"]
    });
    assert.equal(fs.existsSync(target), true);
    assert.equal(fs.existsSync(journalFile), false);
    assert.equal(
      fs.readdirSync(globalSkills).some((name) =>
        name.startsWith(`.${firstSkill}.previous-`) || name.startsWith(`.${firstSkill}.staging-`)),
      false
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(journalFile, { force: true });
  }
});

test("root installer resumes cleanup after process termination during transaction close", () => {
  const fixtureRoot = tempProject();
  const sourceCopy = path.join(fixtureRoot, "source");
  const project = path.join(fixtureRoot, "project");
  const globalSkills = path.join(fixtureRoot, "global-skills");
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(globalSkills, { recursive: true });
  fs.cpSync(root, sourceCopy, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/") &&
        rel !== ".codex-context" && !rel.startsWith(".codex-context/");
    }
  });

  const copiedInstaller = path.join(sourceCopy, "scripts", "install-windows.ps1");
  const args = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copiedInstaller,
    "-TargetSkillsRoot", globalSkills,
    "-TargetProjectRoot", project
  ];
  const journalFile = installTransactionJournalPath([project, globalSkills]);
  let backupRoot = "";

  try {
    execFileSync("powershell.exe", args, {
      cwd: sourceCopy,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const source = fs.readFileSync(copiedInstaller, "utf8");
    const needle = "    Remove-Item -LiteralPath $Transaction.BackupRoot -Recurse -Force";
    assert.ok(source.includes(needle), "transaction cleanup crash injection point is missing");
    write(
      copiedInstaller,
      source.replace(needle, `${needle}\n    Stop-Process -Id $PID -Force`)
    );

    assert.throws(() => {
      execFileSync("powershell.exe", args, {
        cwd: sourceCopy,
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
    assert.equal(fs.existsSync(journalFile), true);
    backupRoot = readJson(journalFile).backup_root;
    assert.equal(fs.existsSync(backupRoot), false);

    fs.copyFileSync(installWindows, copiedInstaller);
    execFileSync("powershell.exe", args, {
      cwd: sourceCopy,
      stdio: ["ignore", "pipe", "pipe"]
    });
    assert.equal(fs.existsSync(journalFile), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(journalFile, { force: true });
    if (backupRoot) fs.rmSync(backupRoot, { recursive: true, force: true });
  }
});

test("root installer does not roll back a closed transaction after cleanup error", () => {
  const fixtureRoot = tempProject();
  const sourceCopy = path.join(fixtureRoot, "source");
  const project = path.join(fixtureRoot, "project");
  const globalSkills = path.join(fixtureRoot, "global-skills");
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(globalSkills, { recursive: true });
  fs.cpSync(root, sourceCopy, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/") &&
        rel !== ".codex-context" && !rel.startsWith(".codex-context/");
    }
  });

  const copiedInstaller = path.join(sourceCopy, "scripts", "install-windows.ps1");
  const args = [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copiedInstaller,
    "-TargetSkillsRoot", globalSkills,
    "-TargetProjectRoot", project
  ];
  const journalFile = installTransactionJournalPath([project, globalSkills]);

  try {
    execFileSync("powershell.exe", args, {
      cwd: sourceCopy,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const manifest = readJson(path.join(sourceCopy, "dong-skills.manifest.json"));
    const firstSkill = manifest.global_skills[0];
    const sourceSkill = path.join(sourceCopy, ".agents", "skills", firstSkill, "SKILL.md");
    const targetSkill = path.join(globalSkills, firstSkill, "SKILL.md");
    write(targetSkill, `${fs.readFileSync(targetSkill, "utf8")}\nold-installed-sentinel\n`);

    const source = fs.readFileSync(copiedInstaller, "utf8");
    const closeIndex = source.indexOf("function Close-InstallTransaction");
    assert.notEqual(closeIndex, -1, "transaction close function is missing");
    const beforeClose = source.slice(0, closeIndex);
    const closeBlock = source.slice(closeIndex);
    const needle = "    Write-InstallTransactionJournal -Transaction $Transaction";
    assert.ok(closeBlock.includes(needle), "transaction close journal write is missing");
    write(
      copiedInstaller,
      `${beforeClose}${closeBlock.replace(needle, `${needle}\n    throw "injected cleanup failure"`)}`
    );

    assert.throws(() => {
      execFileSync("powershell.exe", args, {
        cwd: sourceCopy,
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
    assert.equal(
      fs.readFileSync(targetSkill, "utf8"),
      fs.readFileSync(sourceSkill, "utf8"),
      "a closed transaction must keep the newly installed skill"
    );
    assert.equal(fs.existsSync(journalFile), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    fs.rmSync(journalFile, { force: true });
  }
});

test("root installer fails closed on an unreadable transaction journal", () => {
  const project = tempProject();
  const globalSkills = path.join(project, "global-skills");
  const journalFile = installTransactionJournalPath([project, globalSkills]);
  const corruptJournal = "{ unreadable transaction journal\n";
  write(journalFile, corruptJournal);

  try {
    assert.throws(() => {
      execFileSync("powershell.exe", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
        "-TargetSkillsRoot", globalSkills,
        "-TargetProjectRoot", project
      ], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, /Command failed/);
    assert.equal(fs.readFileSync(journalFile, "utf8"), corruptJournal);
    assert.equal(
      fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")),
      false
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(journalFile, { force: true });
  }
});

test("root installer does not snapshot locked raw context artifacts", () => {
  const project = tempProject();
  const globalSkills = path.join(project, "global-skills");
  const rawFile = path.join(project, ".codex-context", "raw", "locked.txt");
  const signalFile = path.join(project, "raw-lock-ready");
  write(rawFile, "private raw artifact\n");
  fs.mkdirSync(globalSkills, { recursive: true });
  const escapedRaw = rawFile.replace(/'/g, "''");
  const escapedSignal = signalFile.replace(/'/g, "''");
  const holder = spawn("powershell.exe", [
    "-NoProfile",
    "-Command",
    `$stream = [System.IO.File]::Open('${escapedRaw}', 'Open', 'ReadWrite', 'None'); New-Item -ItemType File -Force -Path '${escapedSignal}' | Out-Null; Start-Sleep -Seconds 15; $stream.Dispose()`
  ], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let holderStopped = false;

  try {
    const deadline = Date.now() + 5000;
    while (!fs.existsSync(signalFile) && Date.now() < deadline) sleep(25);
    assert.equal(fs.existsSync(signalFile), true, "raw lock holder did not acquire the file");
    execFileSync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installWindows,
      "-TargetSkillsRoot", globalSkills,
      "-TargetProjectRoot", project
    ], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    assert.equal(
      fs.existsSync(path.join(project, ".agents", "skills", ".dong-skills-project.json")),
      true
    );
    stopProcessTree(holder.pid);
    holderStopped = true;
    assert.equal(readFileAfterUnlock(rawFile), "private raw artifact\n");
  } finally {
    if (!holderStopped) stopProcessTree(holder.pid);
    fs.rmSync(project, { recursive: true, force: true });
  }
});
