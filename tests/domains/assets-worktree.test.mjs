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

test("Stop requires structured Git Checkpoint fields when worktree is dirty", () => {
  const project = tempProject();
  git(project, ["init"]);
  write(path.join(project, "work.txt"), "dirty\n");

  readyState(project, "- checkpoint noted but not structured\n");
  const vague = runHook(project, { hook_event_name: "Stop" });
  assert.equal(vague.decision, "block");
  assert.equal(Object.hasOwn(vague, "continue"), false);
  assert.equal(Object.hasOwn(vague, "stopReason"), false);
  assert.match(vague.reason, /Git Checkpoint missing field/);

  readyState(project, `- Latest commit: not ready
- Push state: not pushed because work is intentionally deferred
- Files included: none
- Files intentionally left uncommitted: work.txt
- Deferred reason: test fixture keeps dirty work uncommitted
- Next checkpoint: commit after fixture completes
`);
  const structured = runHook(project, { hook_event_name: "Stop" });
  assert.deepEqual(structured, {});
});

test("asset-governance archives temporary PreCompact notice and restores handoff", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const handoffFile = path.join(project, ".codex-context", "handoff-summary.md");
  write(handoffFile, `# Handoff 摘要

## PreCompact Emergency Notice
- Created: fixture
- Trigger: auto
- Raw snapshot: \`.codex-context/raw/precompact-auto-fixture.md\`

## PreCompact Issues
- fixture issue

---

## Objective
Preserved objective.

## Latest User Instruction
Continue.

## Approved Scope / Spec
Approved.

## Plan Status
Executing.

## Files Modified
- src/file.mjs

## Decisions Made
- Preserve normal handoff.

## Verification Evidence
- Fixture evidence.

## Git Checkpoint
- Latest commit: fixture
- Push state: no remote
- Files included: none
- Files intentionally left uncommitted: none
- Deferred reason: none
- Next checkpoint: none

## Next Action
Continue normally.

## Files To Re-read First
- src/file.mjs
`);

  const preview = execFileSync(process.execPath, [assetGovernance, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(preview, /Temporary PreCompact handoff notice: present/);
  assert.match(preview, /Temporary notice can be archived/);

  const applied = execFileSync(process.execPath, [assetGovernance, project, "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(applied, /Archived temporary notice/);
  const handoff = fs.readFileSync(handoffFile, "utf8");
  assert.doesNotMatch(handoff, /PreCompact Emergency Notice/);
  assert.match(handoff, /## Objective\nPreserved objective\./);
  const archiveFiles = fs.readdirSync(path.join(project, ".codex-context", "archive"));
  assert.ok(archiveFiles.some((name) => /^precompact-emergency-notice-.*\.md$/.test(name)));
});

test("state-prune archives old verification commands and keeps recent evidence", () => {
  const project = tempProject();
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "verification.md"), `# Verification

## Commands Run
- command 1
  - Result: pass
- command 2
  - Result: pass
- command 3
  - Result: pass
- command 4
  - Result: pass

## Not Yet Verified
- UI trust prompt.
`);

  const out = execFileSync(process.execPath, [statePrune, project, "--verification", "--archive", "--keep-latest", "2", "--reason", "test-bloat", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Archive: 2 item/);
  assert.match(out, /Active file update: \.codex-context\/verification\.md includes an Archived Evidence pointer/);

  const verification = fs.readFileSync(path.join(ctx, "verification.md"), "utf8");
  assert.doesNotMatch(verification, /command 1/);
  assert.doesNotMatch(verification, /command 2/);
  assert.match(verification, /command 3/);
  assert.match(verification, /command 4/);
  assert.match(verification, /UI trust prompt/);
  assert.match(verification, /## 已归档证据/);
  assert.match(verification, /verification-\d{4}-\d{2}-\d{2}-test-bloat\.md/);

  const archives = fs.readdirSync(path.join(ctx, "archive")).filter((name) => name.startsWith("verification-"));
  assert.equal(archives.length, 1);
  assert.match(archives[0], /test-bloat/);
  const archive = fs.readFileSync(path.join(ctx, "archive", archives[0]), "utf8");
  assert.match(archive, /command 1/);
  assert.match(archive, /command 2/);
});

test("state-prune accepts Chinese verification headings", () => {
  const project = tempProject();
  const ctx = path.join(project, ".codex-context");
  write(path.join(ctx, "verification.md"), `# 验证

## 已运行命令
- command 1
  - Result: pass
- command 2
  - Result: pass
- command 3
  - Result: pass
- command 4
  - Result: pass

## 尚未验证
- UI trust prompt.
`);

  const out = execFileSync(process.execPath, [statePrune, project, "--verification", "--archive", "--keep-latest", "2", "--reason", "test-bloat", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Archive: 2 item/);

  const verification = fs.readFileSync(path.join(ctx, "verification.md"), "utf8");
  assert.doesNotMatch(verification, /command 1/);
  assert.doesNotMatch(verification, /command 2/);
  assert.match(verification, /command 3/);
  assert.match(verification, /command 4/);
  assert.match(verification, /## 已归档证据/);
  assert.match(verification, /已将 2 条较旧命令记录归档/);
});

test("asset-governance prunes only excess precompact raw snapshots", () => {
  const project = tempProject();
  const raw = path.join(project, ".codex-context", "raw");
  fs.mkdirSync(raw, { recursive: true });
  write(path.join(raw, "observations.jsonl"), "{\"status\":\"unreviewed\"}\n");

  for (let index = 0; index < 7; index += 1) {
    const file = path.join(raw, `precompact-auto-2026-06-12T00-00-0${index}-000Z.md`);
    write(file, `snapshot ${index}\n`);
    const time = new Date(Date.now() - index * 10_000);
    fs.utimesSync(file, time, time);
  }

  const out = execFileSync(process.execPath, [assetGovernance, project, "--keep-precompact", "3", "--raw-days", "999", "--apply"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Deleted 4 snapshot/);

  const remaining = fs.readdirSync(raw);
  assert.equal(remaining.filter((name) => /^precompact-auto-/.test(name)).length, 3);
  assert.equal(remaining.includes("observations.jsonl"), true);
});

test("asset-governance reports dong-debt markers and missing revisit triggers", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "src", "shortcut.mjs"), `export function fastPath(value) {
  // dong-debt: global cache shared by every tenant; revisit when tenant-specific throughput matters
  return value;
}

export function naivePath(value) {
  // dong-debt: naive scan for now
  return value;
}
`);

  const out = execFileSync(process.execPath, [assetGovernance, project], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong debt markers: 2/);
  assert.match(out, /Dong debt markers without trigger: 1/);
  assert.match(out, /src\/shortcut\.mjs:2: triggered/);
  assert.match(out, /src\/shortcut\.mjs:7: no-trigger/);
  assert.match(out, /review with codex-simplicity-review/);
});

test("asset-governance reports semantic state drift and raw footprint", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const ctx = path.join(project, ".codex-context");

  write(path.join(ctx, "handoff-summary.md"), `# Handoff 摘要

## 2026-07-11 Dong Skills mutation refresh
- Stop hook reported infrastructure debt.

## 2026-07-11 Stop hook refresh
- Runtime recovery refresh.

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

## Final
- Stop freshness 回归通过。
- 已通过 Stop freshness 验证。
`);
  write(path.join(ctx, "working-notes.md"), `# 工作记录

## Stop issue 1
## Stop issue 2
## Stop issue 3
## Stop issue 4
## Stop issue 5
`);
  write(path.join(ctx, "open-questions.md"), `# 开放问题

## Dong Skills 升级后待确认
- one
## Dong Skills 升级后待确认
- two
## Dong Skills 升级后待确认
- three
`);
  write(path.join(ctx, "raw", "large.json"), "x".repeat(2 * 1024 * 1024));

  const out = execFileSync(process.execPath, [
    assetGovernance,
    project,
    "--raw-total-warn-mb",
    "1",
    "--raw-largest-warn-mb",
    "1"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Semantic state advisories: [1-9]/);
  assert.match(out, /Raw footprint: 2\.0 MB/);
  assert.match(out, /handoff-summary\.md appears focused on Dong Skills maintenance at the top/);
  assert.match(out, /current-state\.md contains many Stop\/hook\/runtime entries/);
  assert.match(out, /current-state\.md may contain both unresolved and resolved versions/);
  assert.match(out, /working-notes\.md looks like a closed Stop\/Git\/hook investigation log/);
  assert.match(out, /open-questions\.md has repeated headings/);
  assert.match(out, /\.codex-context\/raw footprint is 2\.0 MB/);
  assert.match(out, /large raw evidence files found/);
  assert.match(out, /Result: pass/);
});

test("asset-governance removes all nested PreCompact notices in one apply", () => {
  const project = tempProject();
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  execFileSync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bootstrap,
    "-TargetProjectRoot", project
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  git(project, ["add", "--all"]);
  git(project, ["commit", "-m", "baseline"]);
  write(path.join(project, "work.js"), "console.log(1);\n");
  const projectHook = path.join(project, ".codex", "hooks", "project-ops.mjs");
  const input = JSON.stringify({ hook_event_name: "PreCompact", cwd: project, trigger: "auto" });
  execFileSync(process.execPath, [projectHook], { cwd: project, input, stdio: ["pipe", "pipe", "pipe"] });
  execFileSync(process.execPath, [projectHook], { cwd: project, input, stdio: ["pipe", "pipe", "pipe"] });
  execFileSync(process.execPath, [path.join(project, ".codex", "scripts", "asset-governance.mjs"), project, "--apply"], {
    cwd: project,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const handoff = fs.readFileSync(path.join(project, ".codex-context", "handoff-summary.md"), "utf8");
  assert.doesNotMatch(handoff, /## PreCompact Emergency Notice/);
});

test("manual worktrees under a worktrees directory stay user-managed", () => {
  const project = tempProject();
  const worktree = path.join(project, "worktrees", "manual");
  git(project, ["init"]);
  git(project, ["config", "user.email", "test@example.com"]);
  git(project, ["config", "user.name", "Test User"]);
  write(path.join(project, "README.md"), "baseline\n");
  git(project, ["add", "README.md"]);
  git(project, ["commit", "-m", "baseline"]);
  git(project, ["worktree", "add", "-b", "feature/manual", worktree]);
  try {
    readyHealthFixture(worktree);
    const out = execFileSync(process.execPath, [health, worktree], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    assert.match(out, /Role: manual-worktree/);
    assert.match(out, /Cleanup owner: user/);
  } finally {
    git(project, ["worktree", "remove", worktree, "--force"]);
  }
});
