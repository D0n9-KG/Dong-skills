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

function copySourceFixture(project) {
  fs.cpSync(root, project, {
    recursive: true,
    filter(source) {
      const rel = path.relative(root, source).replace(/\\/g, "/");
      return rel !== ".git" &&
        !rel.startsWith(".git/") &&
        rel !== ".codex-context/raw" &&
        !rel.startsWith(".codex-context/raw/");
    }
  });
  const contextRoot = path.join(project, ".codex-context");
  if (!fs.existsSync(contextRoot)) return;
  const pending = [contextRoot];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(full);
        continue;
      }
      if (!/\.(?:md|ya?ml|json|jsonl|txt)$/i.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8")
        .replace(/C:\\Users\\D0n9/gi, "C:\\Users\\[redacted]")
        .replace(/C:\/Users\/D0n9/gi, "C:/Users/[redacted]");
      fs.writeFileSync(full, text, "utf8");
    }
  }
}

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
Approved by user.

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
  syncApprovalHashes(project);

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
Approved by user.

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
Approved by user.

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
  syncApprovalHashes(project);

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
  const verificationFile = path.join(project, ".codex-context", "verification.md");
  write(verificationFile, "# Verification\n\n## Commands Run\n- Fixture verification passed.\n");
  const verificationHash = createHash("sha256")
    .update(fs.readFileSync(verificationFile))
    .digest("hex");
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
verification_evidence_hash: ${verificationHash}
review_evidence_hash: none
resume_phase: none
resume_skill: none
handoff_hash: null
updated_at: fixture
note: fixture
`);
  syncApprovalHashes(project);

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

test("health rejects delivery state without bound verification and review evidence", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const stateFile = path.join(project, ".codex-context", "workflow-state.yaml");
  fs.writeFileSync(
    stateFile,
    fs.readFileSync(stateFile, "utf8")
      .replace(/^phase:.*$/m, "phase: delivery")
      .replace(/^next_skill:.*$/m, "next_skill: verification-before-completion")
      .replace(/^verify_result:.*$/m, "verify_result: pass")
      .replace(/^review_status:.*$/m, "review_status: done")
      .replace(/^checkpoint_status:.*$/m, "checkpoint_status: pending")
      .replace(/^handoff_hash:.*$/m, "handoff_hash: null"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(project, ".codex-context", "verification.md"),
    "# Verification\n\n## Commands Run\n- `node --test`: pass.\n\n## Not Yet Verified\n- None.\n\n## Review Evidence\n- Review completed with no blocking findings.\n",
    "utf8"
  );

  let failed = false;
  try {
    execFileSync(process.execPath, [health, project], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /requires verification_evidence_hash/);
    assert.match(String(error.stdout), /requires review_evidence_hash/);
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
    assert.match(String(error.stdout), /commandWindows does not invoke Dong Skills hook launcher/);
  }
  assert.equal(failed, true);
});

test("health check rejects hook launchers that depend on project-root cwd", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const hooksFile = path.join(project, ".codex", "hooks.json");
  const config = readJson(hooksFile);

  for (const badCommand of [
    'node ".codex/hooks/launch-project-ops.mjs"',
    'node "$(git rev-parse --show-toplevel)/.codex/hooks/launch-project-ops.mjs"'
  ]) {
    for (const groups of Object.values(config.hooks)) {
      for (const group of groups) {
        for (const hookConfig of group.hooks || []) {
          hookConfig.command = badCommand;
          delete hookConfig.commandWindows;
        }
      }
    }
    write(hooksFile, JSON.stringify(config, null, 2));

    assert.throws(() => {
      execFileSync(process.execPath, [health, project], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    }, (error) => /depends on project-root cwd/i.test(String(error.stdout || "")), badCommand);
  }
});

test("health reports missing runtime support as a structured partial-upgrade failure", () => {
  const project = tempProject();
  copySourceFixture(project);
  fs.rmSync(path.join(project, ".codex", "scripts", "lib", "runtime.mjs"), { force: true });

  let output = "";
  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    output = String(error.stdout || "");
    return /Result: fail/.test(output);
  });
  assert.match(output, /hook runtime support is missing/i);
  assert.match(output, /Recent hook liveness: unavailable/i);
});

test("health reports workflow API mismatch as a structured partial-upgrade failure", () => {
  const project = tempProject();
  copySourceFixture(project);
  const workflowFile = path.join(project, ".codex", "scripts", "lib", "workflow.mjs");
  write(
    workflowFile,
    fs.readFileSync(workflowFile, "utf8").replace(
      "export function planLoopReviewFromMarkdown",
      "function planLoopReviewFromMarkdown"
    )
  );

  let output = "";
  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    output = String(error.stdout || "");
    return /Result: fail/.test(output);
  });
  assert.match(output, /workflow runtime|workflow API|export|parity/i);
});

test("source health detects bootstrap hooks configuration drift", () => {
  const project = tempProject();
  copySourceFixture(project);
  git(project, ["init"]);
  const assetHooks = path.join(
    project,
    ".agents",
    "skills",
    "codex-codebase-onboarding",
    "assets",
    "project-ops",
    ".codex",
    "hooks.json"
  );
  const config = readJson(assetHooks);
  delete config.hooks.PreToolUse;
  write(assetHooks, JSON.stringify(config, null, 2));

  let output = "";
  assert.throws(() => {
    execFileSync(process.execPath, [path.join(project, "scripts", "project-ops-health.mjs"), project], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, (error) => {
    output = String(error.stdout || "");
    return /Result: fail/.test(output);
  });
  assert.match(output, /\.codex[\\/]hooks\.json/i);
  assert.match(output, /parity/i);
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
  copySourceFixture(project);
  git(project, ["init"]);
  fs.symlinkSync(external, path.join(project, "linked-dir"), "junction");
  const out = execFileSync(process.execPath, [path.join(project, "scripts", "release-check.mjs"), project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("health check warns on semantic state drift without failing", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "handoff-summary.md"), `# Handoff 摘要

## 2026-07-11 Dong Skills mutation refresh
- Stop hook reported infrastructure debt.

## Objective
Fixture objective.

## Latest User Instruction
Fixture instruction.

## Approved Scope / Spec
Fixture scope.

## Plan Status
Fixture plan.

## Files Modified
- fixture.txt

## Decisions Made
- Fixture decision.

## Verification Evidence
- Fixture verification.

## Git Checkpoint
- Latest commit: fixture
- Push state: no remote
- Files included: fixture.txt
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Continue.

## Files To Re-read First
- fixture.txt
`);
  write(path.join(ctx, "current-state.md"), `# 当前状态摘要

## Stop refresh
- Stop hook still reports runtime risk and recovery gate risk.
- Stop hook risk not yet resolved.
- Stop hook and PreCompact runtime issue remains.
- Stop hook runtime evidence remains.

## Final
- Stop freshness 回归通过。
`);
  write(path.join(ctx, "working-notes.md"), `# Working Notes

## Purpose
Fixture.

## Current Findings
Fixture.

## Current Hypothesis
Fixture.

## Rejected Paths
Fixture.

## Open Investigation Questions
Fixture.

## Next Verification Step
Fixture.

## Promotion Notes
Fixture.

## Stop issue 1
## Stop issue 2
## Stop issue 3
## Stop issue 4
## Stop issue 5
`);
  write(path.join(ctx, "open-questions.md"), `# Open Questions

## Dong Skills 升级后待确认
- one
## Dong Skills 升级后待确认
- two
## Dong Skills 升级后待确认
- three
`);

  const out = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Warnings:/);
  assert.match(out, /handoff-summary\.md top appears focused on Dong Skills maintenance/);
  assert.match(out, /current-state\.md contains many Stop\/hook\/runtime entries/);
  assert.match(out, /working-notes\.md looks like a closed Stop\/Git\/hook investigation log/);
  assert.match(out, /open-questions\.md has repeated headings/);
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
  assert.match(release, /COMMAND_MAX_BUFFER/);
  assert.match(release, /maxBuffer:\s*options\.maxBuffer\s*\|\|\s*COMMAND_MAX_BUFFER/);

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

test("source hook configuration exposes only the minimal event kernel", () => {
  const hooksFile = path.join(root, ".codex", "hooks.json");
  const hooks = readJson(hooksFile).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ["PreCompact", "PreToolUse", "SessionStart", "Stop"]);
  assert.ok(fs.statSync(hooksFile).size < 6_000, "hooks.json should stay below about 1,500 tokens");
  for (const entries of Object.values(hooks)) {
    for (const entry of entries) {
      for (const hookEntry of entry.hooks || []) {
        assert.doesNotMatch(hookEntry.commandWindows || "", /EncodedCommand/i);
      }
    }
  }
});

test("health accepts a minimal wayfinding handoff without delivery-only headings", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "spec.md"), fs.readFileSync(path.join(ctx, "spec.md"), "utf8")
    .replace("Approved by user.", "Living Draft / Not Approved."));
  write(path.join(ctx, "plan-progress.md"), fs.readFileSync(path.join(ctx, "plan-progress.md"), "utf8")
    .replace("Approved by user.", "pending")
    .replace("Approved by user for Traditional task-by-task execution.", "pending")
    .replace("implementation-ready", "requirements-only")
    .replace("Traditional task-by-task execution.", "pending"));
  write(path.join(ctx, "workflow-state.yaml"), `workflow: standard
work_lane: lane-1
task_id: task-wayfinding
task_generation: 1
document_hash_mode: approval-contract-v2
phase: wayfinding
next_skill: codex-wayfinder
auto_next: true
decision_required: none
spec_status: living-draft
plan_status: not-started
approved_spec_hash: none
approved_plan_hash: none
execution_mode: pending
execution_approval: pending
loop_review_status: pending
verify_result: pending
verification_gap_status: not-required
review_status: pending
checkpoint_status: pending
verification_evidence_hash: none
review_evidence_hash: none
resume_phase: none
resume_skill: none
debug_return_phase: none
debug_return_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: fixture
note: fixture
`);
  write(path.join(ctx, "handoff-summary.md"), `# Handoff

## 当前任务
审查一个处于 Wayfinder 的研究方向。

当前 Wayfinder: docs/codex/wayfinder/research-route.md

## 当前结论
尚无 approved spec 或方法正结果。

## 下一步动作
继续当前 frontier ticket。

## 优先重读文件
- .codex-context/workflow-state.yaml
`);
  write(path.join(ctx, "working-notes.md"), "# 工作笔记\n\n- 当前调查仍在进行。\n");

  const output = execFileSync(process.execPath, [health, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(output, /Result: pass/);
});
