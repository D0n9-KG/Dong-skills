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
  skillForwardEval,
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

test("session-history CLI accepts an explicit project root argument", () => {
  const project = tempProject();
  git(project, ["init"]);

  const out = execFileSync(process.execPath, [hook, "session-history", project, "scan", "--days", "1", "--keywords", "test"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills session history scan/);
  assert.match(out.replace(/\\/g, "/"), new RegExp(`Root: ${escapeRegExp(project.replace(/\\/g, "/"))}`));
});

test("learning observations redact private key bodies and URL userinfo", () => {
  const project = tempProject();
  const prompt = [
    "remember this rule",
    "-----BEGIN PRIVATE KEY----- codex-release-check: allow-secret-fixture",
    "ABCDEF1234567890SECRET",
    "-----END PRIVATE KEY-----",
    "https://user:pass@example.com/path?token=abc#frag" // codex-release-check: allow-secret-fixture
  ].join("\n");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: prompt
  });

  const obs = fs.readFileSync(path.join(project, ".codex-context", "raw", "observations.jsonl"), "utf8");
  assert.doesNotMatch(obs, /ABCDEF1234567890SECRET/);
  assert.doesNotMatch(obs, /user:pass@example\.com/);
  assert.match(obs, /\[redacted-private-key\]/);
  assert.match(obs, /example\.com/);
});

test("learning observations redact common PII and platform tokens", () => {
  const project = tempProject();
  const email = ["alice", "private.test"].join("@");
  const phone = ["+1", "(415)", "555-1212"].join(" ");
  const githubToken = ["ghp", "A".repeat(24)].join("_");
  const anthropicKey = ["sk-ant", "B".repeat(28)].join("-");
  const prompt = [
    "remember this rule",
    `C:\\Users\\Alice ${email} ${phone} ${githubToken} ${anthropicKey}`
  ].join(" ");

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: prompt
  });

  const obs = fs.readFileSync(path.join(project, ".codex-context", "raw", "observations.jsonl"), "utf8");
  const event = JSON.parse(obs.trim());
  assert.doesNotMatch(event.prompt_excerpt, /Alice/);
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(email)));
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(githubToken)));
  assert.doesNotMatch(event.prompt_excerpt, new RegExp(escapeRegExp(anthropicKey)));
  assert.ok(event.prompt_excerpt.includes("C:\\Users\\[redacted]"));
  assert.match(event.prompt_excerpt, /\[redacted-email\]/);
  assert.match(event.prompt_excerpt, /\[redacted-phone\]/);
  assert.match(event.prompt_excerpt, /\[redacted-github-token\]/);
  assert.match(event.prompt_excerpt, /\[redacted-anthropic-key\]/);
});

test("learning observations preserve Chinese UTF-8 and dedupe status follow-ups by topic", () => {
  const project = tempProject();

  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "记住：Dong Skills 优化沉淀应该写到真实源仓库，不要写进安装副本。"
  });
  runHook(project, {
    hook_event_name: "UserPromptSubmit",
    user_prompt: "确认一下，刚才这个 Dong Skills 优化沉淀放到哪里了？"
  });

  const obsFile = path.join(project, ".codex-context", "raw", "observations.jsonl");
  const lines = fs.readFileSync(obsFile, "utf8").trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  const event = JSON.parse(lines[0]);
  assert.equal(event.topic, "dong-skills-meta-learning");
  assert.match(event.prompt_excerpt, /优化沉淀/);
  const mojibakeMarkerPattern = new RegExp(["\\u93b8", "\\u5a0c", "\\u7a69"].join("|"), "u");
  assert.doesNotMatch(event.prompt_excerpt, mojibakeMarkerPattern);

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Grouped pending observations:/);
  assert.match(out, /topic: dong-skills-meta-learning, observations: 1/);
});

test("learning-status reports Dong Skills fallback outbox", () => {
  const project = tempProject();
  write(path.join(project, ".codex-context", "dong-skills-outbox.md"), `# Dong Skills Improvement Outbox

## Pending Improvements

### 2026-06-13 - Route skill improvements

Status: pending
Signal: test
`);

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: "", DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills meta-learning:/);
  assert.match(out, /Target: not found; use fallback outbox/);
  assert.match(out, /Fallback outbox: \.codex-context\/dong-skills-outbox\.md/);
  assert.match(out, /Pending outbox items: 1/);
  assert.match(out, /Installed skill copies are not treated as the Dong Skills source repo/);
});

test("learning-status locates Dong Skills source repo from environment", () => {
  const project = tempProject();
  const source = tempProject();
  write(path.join(source, "docs", "improvements", "backlog.md"), "# Dong Skills Improvement Backlog\n");
  write(path.join(source, ".agents", "skills", "codex-learning-memory", "SKILL.md"), "---\nname: codex-learning-memory\n---\n");

  const out = execFileSync(process.execPath, [hook, "learning-status", project], {
    cwd: project,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: source, DONG_SKILLS_HOME: "" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills meta-learning:/);
  assert.match(out, /Target source: DONG_SKILLS_REPO/);
  assert.match(out, /docs[\\/]improvements[\\/]backlog\.md/);
  assert.match(out, /Pending outbox items: 0/);
});

test("skill-evolution collects backlog candidates into reviewed-task draft", () => {
  const project = tempProject();
  readyHealthFixture(project);
  write(path.join(project, "docs", "improvements", "backlog.md"), `# Backlog

## Items

### 2026-06-30 - Brainstorming should continue one question at a time

Status: accepted
Priority: P0
Affected area: brainstorming / SkillOpt

Signal:
The brainstorming skill sometimes stops after updating files instead of asking the next focused question.
`);
  write(path.join(project, ".agents", "skills", "codex-skill-evolution", "SKILL.md"), "---\nname: codex-skill-evolution\n---\n");
  write(path.join(project, ".agents", "skills", "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n");

  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  const out = execFileSync(process.execPath, [skillEvolution, project, "collect-candidates", "--output", tasksFile], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: project, DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Tasks: 1/);
  const payload = readJson(tasksFile);
  assert.equal(payload.format, "skillopt_sleep.tasks.v1");
  assert.equal(payload.reviewed, false);
  assert.equal(payload.tasks.length, 1);
  assert.match(payload.tasks[0].intent, /Brainstorming should continue/);
  assert.equal(payload.tasks[0].reference_kind, "rule");
  assert.equal(payload.tasks[0].judge.checks.some((check) => check.arg === "ask one focused next question"), true);
});

test("skill-evolution redacts secrets before persisting candidate tasks", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const secret = ["sk", "test", "secret", "1234567890"].join("-");
  const keyName = ["OPENAI", "API", "KEY"].join("_");
  write(path.join(project, "docs", "improvements", "backlog.md"), `# Backlog

### 2026-07-10 - Skill evolution diagnostics need privacy ${keyName}=${secret}

Status: accepted
Priority: P1
Affected area: skill evolution

Signal:
Persisted candidate diagnostics must be sanitized.
`);
  write(path.join(project, ".agents", "skills", "codex-skill-evolution", "SKILL.md"), "---\nname: codex-skill-evolution\n---\n");

  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  execFileSync(process.execPath, [skillEvolution, project, "collect-candidates", "--output", tasksFile], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: project, DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const persisted = fs.readFileSync(tasksFile, "utf8");
  assert.doesNotMatch(persisted, new RegExp(escapeRegExp(secret)));
  assert.match(persisted, /\[REDACTED\]/);
});

test("skill-evolution uses Dong Skills source repo when invoked from a business project", () => {
  const source = tempProject();
  const business = tempProject();
  write(path.join(source, "docs", "improvements", "backlog.md"), `# Backlog

### 2026-06-30 - Hook status should explain stale handoff evidence

Status: accepted
Priority: P1
Affected area: hooks / checkpoint
`);
  write(path.join(source, ".agents", "skills", "codex-skill-evolution", "SKILL.md"), "---\nname: codex-skill-evolution\n---\n");
  write(path.join(source, ".agents", "skills", "brainstorming", "SKILL.md"), "---\nname: brainstorming\n---\n");
  write(path.join(business, ".codex-context", "dong-skills-outbox.md"), `# Dong Skills Outbox

### 2026-06-30 - Brainstorming should ask one next question

Status: pending
Priority: P0
Affected area: brainstorming
`);

  const tasksFile = path.join(source, ".codex-context", "raw", "skill-evolution-tasks.json");
  const out = execFileSync(process.execPath, [skillEvolution, business, "collect-candidates"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DONG_SKILLS_REPO: source, DONG_SKILLS_HOME: "", DONG_SKILLS_DISABLE_SOURCE_MARKER: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, new RegExp(`Dong Skills repo: ${escapeRegExp(source)}`));
  assert.match(out, /Repo source: DONG_SKILLS_REPO/);
  assert.match(out, /Tasks: 2/);
  assert.equal(fs.existsSync(tasksFile), true);
  assert.equal(fs.existsSync(path.join(business, ".codex-context", "raw", "skill-evolution-tasks.json")), false);
  const payload = readJson(tasksFile);
  assert.equal(payload.project, source);
  assert.equal(payload.invocation_project, business);
  assert.equal(payload.tasks.length, 2);
  assert.equal(payload.tasks.some((task) => task.source_sessions.some((sourcePath) => sourcePath.includes("dong-skills-outbox.md"))), true);
});

test("skill-evolution safety gates reject unreviewed run and unconfirmed adopt", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  write(tasksFile, JSON.stringify({
    format: "skillopt_sleep.tasks.v1",
    project,
    reviewed: false,
    tasks: []
  }, null, 2));

  assert.throws(() => {
    execFileSync(process.execPath, [skillEvolution, project, "run", "--tasks-file", tasksFile, "--backend", "mock"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  assert.throws(() => {
    execFileSync(process.execPath, [skillEvolution, project, "adopt"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("project hook dispatches skill-evolution status", () => {
  const project = tempProject();
  readyHealthFixture(project);

  const out = execFileSync(process.execPath, [hook, "skill-evolution", project, "status"], {
    cwd: project,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.match(out, /Dong Skills SkillOpt-Sleep integration status/);
  assert.match(out, /SkillOpt-Sleep available:/);
  assert.match(out, /Safety:/);
});

test("solutions validator accepts structured docs and rejects missing frontmatter", () => {
  const project = tempProject();
  write(path.join(project, "docs", "solutions", "runtime-errors", "good.md"), `---
title: "Good runtime fix"
date: 2026-06-09
track: bug
category: runtime-errors
problem_type: runtime-fix
status: active
scope: worker
tags: [worker, runtime]
verified_by: "node --test worker"
---

# Good runtime fix

## Problem

Verified fix.
`);
  write(path.join(project, "docs", "solutions", "runtime-errors", "bad.md"), "# Missing frontmatter\n");

  assert.throws(() => {
    execFileSync(process.execPath, [solutions, project, "validate"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  fs.rmSync(path.join(project, "docs", "solutions", "runtime-errors", "bad.md"));
  const out = execFileSync(process.execPath, [solutions, project, "validate"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
});

test("skill-evolution real runs require held-out tasks and supported judge operations", () => {
  const project = tempProject();
  readyHealthFixture(project);
  const tasksFile = path.join(project, ".codex-context", "raw", "skill-evolution-tasks.json");
  const baseTask = {
    project,
    intent: "Preserve Dong Skills gates",
    reference_kind: "rule",
    judge: {
      kind: "rule",
      checks: [{ op: "contains", arg: "phase gate" }]
    },
    origin: "real"
  };

  write(tasksFile, JSON.stringify({
    format: "skillopt_sleep.tasks.v1",
    project,
    reviewed: true,
    tasks: [
      { ...baseTask, id: "train-1", split: "train" }
    ]
  }, null, 2));

  assert.throws(() => {
    execFileSync(process.execPath, [
      skillEvolution, project, "run", "--tasks-file", tasksFile, "--backend", "mock"
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(tasksFile, JSON.stringify({
    format: "skillopt_sleep.tasks.v1",
    project,
    reviewed: true,
    tasks: [
      { ...baseTask, id: "train-1", split: "train" },
      {
        ...baseTask,
        id: "held-out-1",
        split: "val",
        judge: { kind: "rule", checks: [{ op: "unknown-pass-through", arg: "bad" }] }
      }
    ]
  }, null, 2));

  assert.throws(() => {
    execFileSync(process.execPath, [
      skillEvolution, project, "run", "--tasks-file", tasksFile, "--backend", "mock"
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("skill forward eval separates backend input, recorded outputs, and independent assertions", () => {
  const project = tempProject();
  const scenarioFile = path.join(project, "scenario.json");
  const backendFile = path.join(project, "backend.mjs");
  const outputDir = path.join(project, "outputs");
  const scenario = {
    schema: "dong-skills.forward-eval.v1",
    name: "fixture-forward-eval",
    reviewed: true,
    cases: [
      {
        id: "train-case",
        split: "train",
        skills: ["using-superpowers"],
        prompt: "How should a requirements-only plan be handled?",
        expected: {
          required_all: ["implementation-ready"],
          forbidden: ["start coding now"]
        }
      },
      {
        id: "held-out-case",
        split: "held-out",
        skills: ["executing-plans"],
        prompt: "Can Goal mode start while Loop Review is pending?",
        expected: {
          required_any: [["loop review", "loop_review_status"]],
          forbidden: ["launch immediately"]
        }
      }
    ]
  };
  write(scenarioFile, JSON.stringify(scenario, null, 2));
  write(backendFile, `import fs from "node:fs";
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const allowedRequestKeys = ["case_id", "prompt", "scenario", "schema", "skills"];
const requestKeys = Object.keys(input).sort();
const skillKeysValid = Array.isArray(input.skills) &&
  input.skills.every((skill) =>
    JSON.stringify(Object.keys(skill).sort()) === JSON.stringify(["content", "name", "path"]));
if (JSON.stringify(requestKeys) !== JSON.stringify(allowedRequestKeys) || !skillKeysValid) {
  process.stderr.write("expectations leaked to backend");
  process.exit(2);
}
const outputs = {
  "train-case": "Return to planning until the artifact is implementation-ready.",
  "held-out-case": "Do not launch. Loop Review and loop_review_status must be approved first."
};
process.stdout.write(JSON.stringify({ output: outputs[input.case_id] || "" }));
`);

  const out = execFileSync(process.execPath, [
    skillForwardEval,
    scenarioFile,
    "--root", root,
    "--backend", process.execPath,
    "--backend-arg", backendFile,
    "--output-dir", outputDir
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);
  assert.equal(fs.existsSync(path.join(outputDir, "train-case.txt")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "held-out-case.txt")), true);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert.equal(summary.ok, true);
  assert.equal(summary.held_out_count, 1);

  const hookOutputDir = path.join(project, "hook-outputs");
  const hookOut = execFileSync(process.execPath, [
    hook,
    "skill-forward-eval",
    root,
    scenarioFile,
    "--backend", process.execPath,
    "--backend-arg", backendFile,
    "--output-dir", hookOutputDir
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(hookOut, /Result: pass/);
  assert.equal(readJson(path.join(hookOutputDir, "summary.json")).ok, true);

  write(path.join(outputDir, "held-out-case.txt"), "Launch immediately.\n");
  assert.throws(() => {
    execFileSync(process.execPath, [
      skillForwardEval,
      scenarioFile,
      "--root", root,
      "--read-output-dir", outputDir
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  const trainOnly = {
    ...scenario,
    cases: [scenario.cases[0]]
  };
  write(scenarioFile, JSON.stringify(trainOnly, null, 2));
  assert.throws(() => {
    execFileSync(process.execPath, [
      skillForwardEval,
      scenarioFile,
      "--root", root,
      "--backend", "dong-skills-backend-does-not-exist"
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);

  write(scenarioFile, JSON.stringify(scenario, null, 2));
  assert.throws(() => {
    execFileSync(process.execPath, [
      skillForwardEval,
      scenarioFile,
      "--root", root,
      "--backend", "dong-skills-backend-does-not-exist",
      "--output-dir", path.join(project, "missing-backend")
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});

test("bundled forward eval accepts equivalent planning language without weakening execution gates", () => {
  const project = tempProject();
  const outputDir = path.join(project, "outputs");
  const scenarioFile = path.join(root, "evals", "skill-forward", "complex-project-gates.json");
  const outputs = {
    "requirements-only-plan":
      "暂停编码，先补全可执行计划（文件路径、步骤、验证命令和 Definition of Done），再请求执行审批。",
    "post-compaction-recovery":
      "先读取 handoff-summary.md，再核对 workflow-state.yaml 并运行 workflow-state next；随后读取 Wayfinder summary 并打开 Active Wayfinder 实际地图。",
    "goal-loop-review-pending":
      "不可以创建 goal；先完成 Loop Review 并将 loop_review_status 标记为 approved。",
    "state-document-readiness-conflict":
      "requirements-only 必须 fail closed，返回 writing-plans，补到 implementation-ready 后再执行。"
  };
  for (const [id, output] of Object.entries(outputs)) {
    write(path.join(outputDir, `${id}.txt`), `${output}\n`);
  }

  const out = execFileSync(process.execPath, [
    skillForwardEval,
    scenarioFile,
    "--root", root,
    "--read-output-dir", outputDir
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.match(out, /Result: pass/);

  write(path.join(outputDir, "requirements-only-plan.txt"), "直接开始实现。\n");
  assert.throws(() => {
    execFileSync(process.execPath, [
      skillForwardEval,
      scenarioFile,
      "--root", root,
      "--read-output-dir", outputDir
    ], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }, /Command failed/);
});
