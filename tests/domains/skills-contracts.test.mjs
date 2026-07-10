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

test("brainstorming skill preserves upstream continuation loop", () => {
  const skill = fs.readFileSync(path.join(root, ".agents", "skills", "brainstorming", "SKILL.md"), "utf8");

  assert.match(skill, /## Continuation Loop/);
  assert.match(skill, /## Truth Hierarchy And Risk Lane/);
  assert.match(skill, /After every user response during brainstorming/);
  assert.match(skill, /ask the next single highest-impact question/);
  assert.match(skill, /Do not end a brainstorming turn by only saying that files were updated/);
  assert.match(skill, /compare 2-3 viable approaches/);
  assert.match(skill, /The spec should lock the What/);
  assert.match(skill, /WHEN \[条件\], THE SYSTEM SHALL \[行为\]/);
  assert.match(skill, /## Final Spec Gate/);
  assert.match(skill, /workflow-state transition spec-living/);
  assert.match(skill, /workflow-state transition spec-ready/);
  assert.match(skill, /workflow-state transition spec-approved/);
  assert.match(skill, /Pending written-spec approval/);
  assert.match(skill, /fresh session could write a plan from the spec file/);
  assert.match(skill, /written-spec approval/);
  assert.match(skill, /working-notes\.md/);
  assert.match(skill, /Do not store hidden chain-of-thought/);
  assert.match(skill, /"可以", "继续"/);
});

test("borrowed workflow skills retain required upstream gates", () => {
  const readSkill = (name) => fs.readFileSync(path.join(root, ".agents", "skills", name, "SKILL.md"), "utf8");

  const brainstorming = readSkill("brainstorming");
  assert.match(brainstorming, /## Blindspot Pass/);
  assert.match(brainstorming, /Separate verified facts from user decisions/);

  const writing = readSkill("writing-plans");
  assert.match(writing, /## Scope Check/);
  assert.match(writing, /## Test-First Default/);
  assert.match(writing, /## Simplicity Gate/);
  assert.match(writing, /## Work Class \/ Risk Lane/);
  assert.match(writing, /Can this be avoided/);
  assert.match(writing, /standard library already do it/);
  assert.match(writing, /native platform already do it/);
  assert.match(writing, /Do not add the Ponytail one-line\/minimum-implementation rungs/);
  assert.match(writing, /Lane 0/);
  assert.match(writing, /Lane 3/);
  assert.match(writing, /## 执行备注/);
  assert.match(writing, /2-5 minute steps/);
  assert.match(writing, /## 验收映射/);
  assert.match(writing, /## 执行模式/);
  assert.match(writing, /Traditional task-by-task execution/);
  assert.match(writing, /Codex Goal mode/);
  assert.match(writing, /## Goal 模式目标草案/);
  assert.match(writing, /## 运行约束/);
  assert.match(writing, /## 存档节奏/);
  assert.match(writing, /workflow-state transition plan-ready/);
  assert.match(writing, /vertical slices/);
  assert.match(writing, /blocking edges/);
  assert.match(writing, /expand-contract/);
  assert.match(writing, /independent source of truth/);
  assert.match(writing, /Artifact Readiness/);
  assert.match(writing, /requirements-only/);
  assert.match(writing, /implementation-ready/);
  assert.match(writing, /Product Contract/);
  assert.match(writing, /Planning Contract/);
  assert.match(writing, /Verification Contract/);
  assert.match(writing, /Definition of Done/);
  assert.match(writing, /zero launch-blocking open questions/);
  assert.match(writing, /happy path, edge cases, error paths, and integration/);

  const debugging = readSkill("systematic-debugging");
  assert.match(debugging, /Reproduction is the entry ticket to fixing/);
  assert.match(debugging, /reliable automated failing test or command/);
  assert.match(debugging, /manual reproduction and verification gap/);
  assert.doesNotMatch(debugging, /'"'"'/);

  const executing = readSkill("executing-plans");
  assert.match(executing, /Run the Simplicity Gate before adding code/);
  assert.match(executing, /can the approved outcome be reached by avoiding the new thing/);
  assert.match(executing, /does the standard library already do it/);
  assert.match(executing, /does the native platform already do it/);
  assert.match(executing, /already exist in the codebase/);
  assert.match(executing, /independent source of truth/);
  assert.match(executing, /dong-debt:/);
  assert.match(executing, /工作类别 \/ 风险等级/);
  assert.match(executing, /legacy English equivalents/);
  assert.match(executing, /Match execution depth to the lane/);
  assert.match(executing, /Run Test Discovery before editing implementation files/);
  assert.match(executing, /For behavior-changing tasks, add\/update the planned test/);
  assert.match(executing, /## Review And Shipping Gate/);
  assert.match(executing, /## Execution Modes/);
  assert.match(executing, /Traditional Task-By-Task Execution/);
  assert.match(executing, /Codex Goal mode/);
  assert.match(executing, /Goal Mode Objective/);
  assert.match(executing, /Runtime Constraints/);
  assert.match(executing, /Checkpoint Cadence/);
  assert.match(executing, /## Stop Conditions/);
  assert.match(executing, /create_goal/);
  assert.match(executing, /Do not simulate Goal mode/);
  assert.match(executing, /workflow-state check execution/);
  assert.match(executing, /workflow-state transition execution-complete/);
  assert.match(executing, /artifact readiness/i);
  assert.match(executing, /requirements-only/);
  assert.match(executing, /happy path, edge cases, error paths, and integration/);
  assert.match(executing, /callbacks, middleware, observers, and event handlers/);
  assert.match(executing, /trace at least two levels/);

  const router = readSkill("using-superpowers");
  assert.match(router, /written spec is approved/);
  assert.match(router, /Workflow State Gate/);
  assert.match(router, /workflow-state next/);
  assert.match(router, /workflow-state transition new-task/);
  assert.match(router, /resume_phase/);
  assert.match(router, /resume_skill/);
  assert.match(router, /Compaction And Session Recovery Gate/);
  assert.match(router, /handoff-summary\.md` first/);
  assert.match(router, /context-recovery-eval/);
  assert.match(router, /Active Wayfinder.*not recovered context/s);
  assert.match(router, /codex-simplicity-review/);
  assert.match(router, /can avoid building, standard library, native platform/);
  assert.match(router, /already exists in the codebase/);
  assert.match(router, /Use the lowest sufficient work lane/);
  assert.match(router, /truth hierarchy/);
  assert.match(router, /Decision Point Protocol/);
  assert.match(router, /Execution Mode/);
  assert.match(router, /Plan-then-execute without an explicit Goal mode request means Traditional task-by-task execution/);
  assert.match(router, /Codex Goal mode requires an explicit user choice/);
  assert.match(router, /actual goal mechanism/);
  assert.match(router, /working-notes\.md/);
  assert.match(router, /hidden chain-of-thought/);
  assert.match(router, /codex-skill-evolution/);
  assert.match(router, /codex-wayfinder/);
  assert.match(router, /codex-agent-architecture-audit/);
  assert.match(router, /codex-loop-design-check/);

  const governance = readSkill("codex-project-governance");
  assert.match(governance, /workflow-state\.yaml/);
  assert.match(governance, /workflow-state transition/);
  assert.match(governance, /codex-simplicity-review/);
  assert.match(governance, /Use this truth hierarchy/);
  assert.match(governance, /`spec\.md` is a current-task intent and acceptance record/);
  assert.match(governance, /lowest sufficient lane/);
  assert.match(governance, /Hook output includes a compact status line/);
  assert.match(governance, /discussion-state\.json/);
  assert.match(governance, /working-notes\.md/);
  assert.match(governance, /codex-skill-evolution/);
  assert.match(governance, /SkillOpt-Sleep/);
  assert.match(governance, /codex-wayfinder/);
  assert.match(governance, /codex-agent-architecture-audit/);
  assert.match(governance, /codex-loop-design-check/);

  const requestingReview = readSkill("requesting-code-review");
  assert.match(requestingReview, /## Mandatory Review Gate/);
  assert.match(requestingReview, /record the low-risk reason/);

  const reviewPanel = readSkill("codex-review-panel");
  assert.match(reviewPanel, /## Mandatory Panel Triggers/);
  assert.match(reviewPanel, /verification gaps, manual-only evidence/);
  assert.match(reviewPanel, /Simplicity: whether the diff should avoid building/);
  assert.match(reviewPanel, /delete`, `stdlib`, `native`, `yagni`, `shrink`, or `dong-debt/);
  assert.match(reviewPanel, /silent-pass verification mechanism/);
  assert.match(reviewPanel, /destructive paths/);
  assert.match(reviewPanel, /shared choke point/);
  assert.match(reviewPanel, /## Standards Verdict/);
  assert.match(reviewPanel, /## Spec Verdict/);
  assert.match(reviewPanel, /Do not merge, deduplicate, or rerank findings across these two axes/);

  const simplicity = readSkill("codex-simplicity-review");
  assert.match(simplicity, /## Simplicity Gate/);
  assert.match(simplicity, /Avoid building/);
  assert.match(simplicity, /Standard library/);
  assert.match(simplicity, /Native platform/);
  assert.match(simplicity, /Already in the codebase/);
  assert.match(simplicity, /Do not make one-line\/minimum-implementation checks mandatory/);
  assert.match(simplicity, /dong-debt: <ceiling>; revisit when <trigger>/);

  const worktree = readSkill("codex-worktree-governance");
  assert.match(worktree, /## Branch Finishing Menu/);
  assert.match(worktree, /Merge locally into <base-branch>/);
  assert.match(worktree, /Discard this work/);
  assert.match(worktree, /Never remove a `codex-managed-worktree`/);

  const checkpoint = readSkill("codex-git-checkpoint");
  assert.match(checkpoint, /## Branch Completion Boundary/);
  assert.match(checkpoint, /fixed finishing menu/);

  const evidence = readSkill("codex-evidence-capture");
  assert.match(evidence, /Direct product use can count as product evidence/);
  assert.match(evidence, /shipped CLI/);

  const skillEvolutionText = readSkill("codex-skill-evolution");
  assert.match(skillEvolutionText, /offline, validation-gated SkillOpt-Sleep runs/);
  assert.match(skillEvolutionText, /Do not run SkillOpt-Sleep from `Stop`, `PreCompact`, `PostToolUse`/);
  assert.match(skillEvolutionText, /Do not use `--auto-adopt`/);
  assert.match(skillEvolutionText, /adopt --confirm-reviewed/);
  assert.match(skillEvolutionText, /redact secrets before persisting/);
  assert.match(skillEvolutionText, /surface backend failures explicitly/i);
  assert.match(skillEvolutionText, /held-out evaluation tasks/);
  assert.match(skillEvolutionText, /judge must be independent/i);
  assert.match(skillEvolutionText, /unknown judge operations fail closed/i);
  assert.match(skillEvolutionText, /must not modify acceptance conditions/i);

  const contextBudget = readSkill("codex-context-budget");
  assert.match(contextBudget, /## Recovery Probe Evaluation/);
  assert.match(contextBudget, /file and symbol locations/);
  assert.match(contextBudget, /decisions and rejected paths/);
  assert.match(contextBudget, /risks and forbidden actions/);
  assert.match(contextBudget, /next action and verification evidence/);
  assert.match(contextBudget, /repeated re-fetches/);

  const wayfinder = readSkill("codex-wayfinder");
  assert.match(wayfinder, /## Destination/);
  assert.match(wayfinder, /## Decisions So Far/);
  assert.match(wayfinder, /## Frontier/);
  assert.match(wayfinder, /## Fog/);
  assert.match(wayfinder, /## Out Of Scope/);
  assert.match(wayfinder, /never resolve more than one frontier ticket per session/i);
  assert.match(wayfinder, /Research|Prototype|Grilling|Task/);
  assert.match(wayfinder, /HITL|AFK/);
  assert.match(wayfinder, /local Markdown/);

  const agentAudit = readSkill("codex-agent-architecture-audit");
  assert.match(agentAudit, /wrapper regression/i);
  assert.match(agentAudit, /memory contamination/i);
  assert.match(agentAudit, /tool discipline/i);
  assert.match(agentAudit, /hidden repair loops/i);
  assert.match(agentAudit, /rendering/i);
  assert.match(agentAudit, /persistence/i);
  assert.match(agentAudit, /code-first/i);

  const loopCheck = readSkill("codex-loop-design-check");
  assert.match(loopCheck, /machine-decidable/i);
  assert.match(loopCheck, /boundary conditions/i);
  assert.match(loopCheck, /retry cap/i);
  assert.match(loopCheck, /independent judge/i);
  assert.match(loopCheck, /must not modify the acceptance conditions/i);
  assert.match(loopCheck, /human/i);

  const manifest = readJson(path.join(root, "dong-skills.manifest.json"));
  assert.ok(manifest.project_skills.includes("codex-wayfinder"));
  assert.ok(manifest.project_skills.includes("codex-agent-architecture-audit"));
  assert.ok(manifest.project_skills.includes("codex-loop-design-check"));

  const workflowTemplate = fs.readFileSync(
    path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex-context", "workflow-state.yaml"),
    "utf8"
  );
  assert.match(workflowTemplate, /^task_id: task-1$/m);
  assert.match(workflowTemplate, /^task_generation: 1$/m);
  assert.match(workflowTemplate, /^resume_phase: none$/m);
  assert.match(workflowTemplate, /^resume_skill: none$/m);

  const solutionMemory = readSkill("codex-solution-memory");
  assert.match(solutionMemory, /## Evaluation Gate/);
  assert.match(solutionMemory, /After any verified non-trivial fix/);
  assert.match(solutionMemory, /Do not let "maybe later" be the implicit outcome/);
});
