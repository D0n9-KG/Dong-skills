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

test("context-budget reports hot warm and cold context paths", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "AGENTS.md"), "# Project Instructions\n\nUse Dong Skills.\n");
  write(path.join(project, ".codex", "scripts", "lib", "core.mjs"), `export const fixture = ${JSON.stringify("runtime ".repeat(600))};\n`);

  const hookOut = execFileSync(process.execPath, [hook, "context-budget", project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const scriptOut = execFileSync(process.execPath, [contextBudgetScript, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  for (const out of [hookOut, scriptOut]) {
    assert.match(out, /Estimated total scanned:/);
    assert.match(out, /Hot recovery path:/);
    assert.match(out, /Warm on-demand path:/);
    assert.match(out, /Cold runtime\/bootstrap path:/);
    assert.match(out, /Hot budget status: ok/);
    assert.match(out, /Workflow next skill: executing-plans/);
    assert.match(out, /Largest hot files:/);
    assert.match(out, /Largest warm\/cold files:/);
    assert.match(out, /AGENTS\.md: .*recovery\/router path/);
    assert.match(out, /\.codex\/scripts\/lib\/core\.mjs: .*runtime\/bootstrap maintenance/);
  }
});

test("release check prefers pwsh for PowerShell parsing when available", () => {
  const source = fs.readFileSync(releaseCheck, "utf8");
  assert.match(source, /function findPowerShellHost\(\)/);
  assert.match(source, /const candidates = \["pwsh", "pwsh\.exe", "powershell\.exe"\]/);
  assert.match(source, /PowerShell parse \$\{rel\(root, file\)\} via \$\{host\}/);
});

test("health check reports linked worktree diagnostics without failing", () => {
  const project = tempProject();
  const worktree = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "README.md"), "# fixture\n");
  git(project, ["add", "README.md"]);
  git(project, ["commit", "-m", "init"]);

  try {
    git(project, ["worktree", "add", worktree, "-b", "feature/test"]);
    readyHealthFixture(worktree);

    const out = execFileSync(process.execPath, [health, worktree], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    assert.match(out, /Worktree:/);
    assert.match(out, /Role: manual-worktree/);
    assert.match(out, /Linked worktree: yes/);
    assert.match(out, /Branch: feature\/test/);
    assert.match(out, /Result: pass/);
  } finally {
    try {
      git(project, ["worktree", "remove", worktree, "--force"]);
    } catch {}
  }
});

test("health check requires state files to preserve approval gates", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "spec.md"), "# Spec\n\n## Problem\nFixture.\n");
  write(path.join(project, ".codex-context", "plan-progress.md"), "# Plan Progress\n\n## Active Plan\nFixture.\n");

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /spec\.md missing section: Approval Status or 审批状态/);
    assert.match(String(error.stdout), /spec\.md missing section: Truth Hierarchy or 事实优先级/);
    assert.match(String(error.stdout), /spec\.md missing section: Work Class \/ Risk Lane or 工作类别 \/ 风险等级/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Spec Approval or 规格审批/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Execution Approval or 执行审批/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Work Class \/ Risk Lane or 工作类别 \/ 风险等级/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Execution Mode or 执行模式/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Goal Mode Objective or Goal 模式目标/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Runtime Constraints or 运行约束/);
    assert.match(String(error.stdout), /plan-progress\.md missing section: Checkpoint Cadence or 存档节奏/);
  }
  assert.equal(failed, true);
});

test("health check accepts singular Goal section in spec", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "spec.md"), `# Spec

## Problem
Fixture.

## Goal
- Fixture.

## Approval Status
Approved by fixture.

## Truth Hierarchy
- Fixture hierarchy.

## Work Class / Risk Lane
- Lane 1 fixture.

## Approved Scope
- Fixture.

## Acceptance Criteria
- Fixture passes.

## Open Questions
- None.

## Next Step
Continue.
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check accepts Chinese state document headings", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");

  write(path.join(ctx, "spec.md"), `# 规格

## 问题
Fixture.

## 目标
- Fixture.

## 审批状态
Approved by fixture.

## 事实优先级
- Fixture hierarchy.

## 工作类别 / 风险等级
- Lane 1 fixture.

## 已批准范围
- Fixture.

## 验收标准
- Fixture passes.

## 开放问题
- 无。

## 下一步
Continue.
`);

  write(path.join(ctx, "plan-progress.md"), `# 计划进度

## 当前计划
Fixture.

## 规格审批
Approved by fixture.

## 执行审批
Approved by user for Traditional task-by-task execution.

## 计划就绪度
implementation-ready

## 执行模式
Traditional task-by-task execution.

## 工作类别 / 风险等级
Lane 1 fixture.

## Goal 模式目标
未选择。

## 运行约束
- Follow the fixture plan.

## 存档节奏
- Checkpoint after verified fixture work.

## 任务
- [x] Fixture task.

## 当前步骤
无。

## 验证
- Fixture check.

## 范围外
- 无。
`);

  write(path.join(ctx, "working-notes.md"), `# 工作笔记

## 用途
Fixture investigation notes.

## 当前发现
- Fixture finding.

## 当前假设
- Fixture hypothesis.

## 已排除路径
- 无。

## 开放调查问题
- 无。

## 下一步验证
- Fixture verification.

## 提升记录
- 无。
`);

  write(path.join(ctx, "worktree-state.md"), `# Worktree 状态

## 当前工作区
- Role: primary-checkout

## 主检出区
- Path: fixture

## 分支状态
- Branch: fixture

## 所有权与清理
- Cleanup owner: none

## Hook 根目录记录
- Actual Git root: fixture

## 恢复指令
- Re-detect before cleanup.
`);

  write(path.join(ctx, "handoff-summary.md"), `# Handoff 摘要

## 目标
Test.

## 最新用户指令
Test.

## 已批准范围 / 规格
Test.

## 计划状态
Test.

## 已修改文件
None.

## 已做决策
None.

## 验证证据
Fixture.

## Git 存档
- 最新提交: fixture
- 推送状态: not pushed
- 已包含文件: none
- 有意保留未提交的文件: none
- 暂缓原因: none
- 下次存档: none

## 下一步动作
Continue.

## 优先重读文件
- .codex-context/handoff-summary.md
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check accepts codex-simplicity-review as workflow next skill", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
task_id: task-1
task_generation: 1
phase: review
next_skill: codex-simplicity-review
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: traditional
execution_approval: approved-traditional
verify_result: pass
review_status: pending
checkpoint_status: pending
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check rejects invalid workflow state", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, ".codex-context", "workflow-state.yaml"), `workflow: standard
phase: flying
next_skill: freestyle-agent
auto_next: true
decision_required: none
spec_status: approved
plan_status: approved
execution_mode: improvise
execution_approval: approved-traditional
verify_result: pending
review_status: pending
checkpoint_status: pending
`);

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /workflow-state\.yaml invalid phase: flying/);
    assert.match(String(error.stdout), /workflow-state\.yaml invalid next_skill: freestyle-agent/);
    assert.match(String(error.stdout), /workflow-state\.yaml invalid execution_mode: improvise/);
  }
  assert.equal(failed, true);
});

test("release check reports text readability mojibake markers", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const marker = String.fromCodePoint(0x93b8);
  write(path.join(project, "README.md"), `# Fixture

This line contains ${marker}
`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL text readability scan/);
    assert.match(String(error.stdout), /README\.md:3: Chinese mojibake marker/);
  }
  assert.equal(failed, true);
});

test("release check fails when hot context budget exceeds fail threshold", () => {
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

  fs.appendFileSync(path.join(project, "AGENTS.md"), `\n\n## Oversized Fixture\n\n${"context ".repeat(36_000)}\n`, "utf8");

  const installedHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  let failed = false;
  try {
    execFileSync(process.execPath, [installedHook, "release-check"], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL context budget scan/);
    assert.match(String(error.stdout), /Hot budget status: fail/);
  }
  assert.equal(failed, true);
});

test("release check scans tests for secrets", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const fakeToken = ["ghp", "A".repeat(24)].join("_");
  write(path.join(project, "tests", "secret.test.mjs"), `// ${fakeToken}\n`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL privacy scan/);
    assert.match(String(error.stdout), /tests\/secret\.test\.mjs:1: GitHub token/);
  }
  assert.equal(failed, true);
});

test("privacy scan distinguishes code references from literal secret values", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(
    path.join(project, ".codex", "hooks", "project-ops.mjs"),
    "if (process.argv[2] === \"context-budget\") process.stdout.write(\"Hot budget status: ok\\n\");\n"
  );
  const fixture = path.join(project, "tests", "privacy-reference.test.mjs");
  write(fixture, "const session = runHook(project, input);\n");

  const passOut = execFileSync(process.execPath, [releaseCheck, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(passOut, /PASS privacy scan/);

  write(fixture, "const session = \"literal-secret-value\";\n");
  assert.throws(() => {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => /tests\/privacy-reference\.test\.mjs:1: key\/value secret/.test(String(error.stdout || "")));
});

test("release check rejects oversized text assets", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "docs", "huge.md"), `# Huge\n\n${"x".repeat(513 * 1024)}\n`);

  let failed = false;
  try {
    execFileSync(process.execPath, [releaseCheck, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /FAIL large file scan/);
    assert.match(String(error.stdout), /docs\/huge\.md:/);
  }
  assert.equal(failed, true);
});

test("health check rejects Windows encoded commands that do not invoke project hook", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const hooksFile = path.join(project, ".codex", "hooks.json");
  const config = readJson(hooksFile);
  const badCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${Buffer.from("Write-Output 'not a project hook'", "utf16le").toString("base64")}`;

  for (const groups of Object.values(config.hooks)) {
    for (const group of groups) {
      for (const hookConfig of group.hooks || []) {
        hookConfig.commandWindows = badCommand;
      }
    }
  }
  write(hooksFile, JSON.stringify(config, null, 2));

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /encoded command does not invoke Dong Skills hook launcher/);
  }
  assert.equal(failed, true);
});

test("source release check fails when the test suite is missing", () => {
  const project = tempProject();
  fs.cpSync(root, project, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/");
    }
  });
  fs.rmSync(path.join(project, "tests"), { recursive: true, force: true });

  let output = "";
  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, "scripts", "release-check.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    output = String(error.stdout || "");
    return /Result: fail/.test(output);
  });
  assert.match(output, /test suite presence/);
});

test("release check skips directory junctions without crashing", () => {
  if (process.platform !== "win32") return;
  const project = tempProject();
  const external = tempProject();
  fs.cpSync(root, project, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/");
    }
  });
  git(project, ["init"]);
  fs.symlinkSync(external, path.join(project, "linked-dir"), "junction");
  const out = execFileSync(process.execPath, [path.join(project, "scripts", "release-check.mjs"), project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("source health rejects skill directories omitted from the manifest", () => {
  const project = tempProject();
  fs.cpSync(root, project, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" && !rel.startsWith(".git/");
    }
  });
  git(project, ["init"]);
  write(
    path.join(project, ".agents", "skills", "unlisted-dong-skill", "SKILL.md"),
    "---\nname: unlisted-dong-skill\n---\n\n# Unlisted\n"
  );

  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("source release uses the parallel domain test runner", () => {
  const runner = path.join(root, "scripts", "run-domain-tests.mjs");
  const release = fs.readFileSync(path.join(root, "scripts", "release-check.mjs"), "utf8");
  const domainFiles = fs.readdirSync(path.join(root, "tests", "domains"))
    .filter((name) => name.endsWith(".test.mjs"));

  assert.equal(fs.existsSync(runner), true);
  assert.ok(domainFiles.length >= 5);
  assert.match(release, /domain-sharded tests/);
  assert.match(release, /run-domain-tests\.mjs/);

  const owners = new Map();
  for (const name of domainFiles) {
    const content = fs.readFileSync(path.join(root, "tests", "domains", name), "utf8");
    const tests = [...content.matchAll(/^test\("([^"]+)"/gm)].map((match) => match[1]);
    assert.ok(tests.length > 0, `${name} should contain tests`);
    for (const testName of tests) {
      assert.equal(owners.has(testName), false, `${testName} appears in multiple domain files`);
      owners.set(testName, name);
    }
  }
  assert.ok(owners.size >= 99);
});
