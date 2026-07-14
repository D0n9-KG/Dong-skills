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

  const onboarding = readSkill("codex-codebase-onboarding");
  assert.match(onboarding, /Do not edit `workflow-state\.yaml` directly/);
  assert.match(onboarding, /workflow-state transition wayfinder-start/);
  assert.match(onboarding, /workflow-state transition brainstorming-start/);
  assert.match(onboarding, /preserve the current workflow phase/i);

  const wayfinder = readSkill("codex-wayfinder");
  assert.match(wayfinder, /workflow-state transition wayfinder-start/);
  assert.match(wayfinder, /workflow-state transition wayfinder-complete/);

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
  assert.match(writing, /workflow-state transition spec-skipped/);
  assert.match(writing, /Public entry points and private internals/);
  assert.match(writing, /forbidden deep imports/);
  assert.match(writing, /ticket-like execution/);

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
  assert.match(executing, /package\/module boundaries/);
  assert.match(executing, /public entry point\/private internals/);
  assert.match(executing, /unauthorized deep imports/);
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
  assert.match(executing, /goal or workflow mechanism/);
  assert.match(executing, /Do not simulate Goal mode/);
  assert.match(executing, /narrating an internal loop/);
  assert.match(executing, /workflow-state check execution/);
  assert.match(executing, /workflow-state transition execution-complete/);
  assert.match(executing, /workflow-state transition debugging-start/);
  assert.match(executing, /workflow-state transition debugging-resolved/);
  assert.match(executing, /scope, requirements, goals, acceptance criteria, or priority/);
  assert.match(executing, /workflow-state transition blocked/);
  assert.match(executing, /workflow-state transition resume/);
  assert.match(executing, /artifact readiness/i);
  assert.match(executing, /requirements-only/);
  assert.match(executing, /happy path, edge cases, error paths, and integration/);
  assert.match(executing, /callbacks, middleware, observers, and event handlers/);
  assert.match(executing, /trace at least two levels/);

  const router = readSkill("using-superpowers");
  assert.ok(Buffer.byteLength(router, "utf8") < 4_000);
  assert.ok(router.split(/\r?\n/).length < 100);
  assert.match(router, /Lightweight fallback router/);
  assert.match(router, /workflow-state next/);
  assert.match(router, /load that skill and stop reading this router/);
  assert.match(router, /Do not preload a chain of skills/);
  assert.match(router, /one workflow owner/i);
  assert.match(router, /codex-wayfinder/);
  assert.match(router, /brainstorming/);
  assert.match(router, /writing-plans/);
  assert.match(router, /executing-plans/);
  assert.match(router, /systematic-debugging/);
  assert.match(router, /verification-before-completion/);
  assert.match(router, /codex-project-governance/);
  assert.match(router, /lowest sufficient work lane/i);
  assert.match(router, /approved written scope and execution mode/);
  assert.match(router, /Reads, research, diagnostics, and discussion do not need execution ceremony/);
  assert.match(router, /Latest user instruction and fresh evidence/);
  assert.match(router, /pure continuation or status question does not reopen scope/);
  assert.match(router, /hidden chain-of-thought/);
  assert.doesNotMatch(router, /PostToolUse|freshness|bounded continuation|recovery receipt/i);

  const governance = readSkill("codex-project-governance");
  assert.ok(Buffer.byteLength(governance, "utf8") < 6_000);
  assert.ok(governance.split(/\r?\n/).length < 120);
  assert.match(governance, /workflow-state\.yaml/);
  assert.match(governance, /workflow-state next/);
  assert.match(governance, /load it and return/);
  assert.match(governance, /codex-simplicity-review/);
  assert.match(governance, /Use this truth hierarchy/);
  assert.match(governance, /`spec\.md` is current-task intent, not permanent system truth/);
  assert.match(governance, /lowest sufficient lane/);
  assert.match(governance, /workflow-state decision <transition>/);
  assert.match(governance, /handoff-summary\.md.*workflow-state\.yaml.*current-state\.md/s);
  assert.match(governance, /Do not make the model re-prove routine reasoning through checklists/);
  assert.match(governance, /repeatable procedures, project-specific expertise, or risk boundaries/);
  assert.match(governance, /Hooks are a minimal mechanical backstop/);
  assert.match(governance, /must not infer scope from natural language, track every read, or block Stop/);
  assert.match(governance, /fresh evidence proportional to risk/);
  assert.match(governance, /Update only state files that gained new durable facts/);
  assert.match(governance, /Ordinary reads and diagnostics create no state debt/);
  assert.match(governance, /codex-wayfinder/);
  assert.match(governance, /workflow-state transition debugging-start/);
  assert.match(governance, /debugging-resolved/);
  assert.doesNotMatch(governance, /PostToolUse|freshness|bounded continuation|recovery receipt|SubagentStop/i);

  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const agentsSnippet = fs.readFileSync(path.join(root, "AGENTS.project-ops.snippet.md"), "utf8");
  const bootstrapAgentsSnippet = fs.readFileSync(
    path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "AGENTS.project-ops.snippet.md"),
    "utf8"
  );
  assert.equal(agentsSnippet, bootstrapAgentsSnippet);
  const rootAgents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  const managedBlock = rootAgents.match(/<!-- codex-project-ops:start -->\s*([\s\S]*?)\s*<!-- codex-project-ops:end -->/);
  assert.ok(managedBlock, "root AGENTS.md must contain the Dong Skills managed block");
  const normalizeManagedText = (value) => String(value).replace(/\r\n?/g, "\n").trim();
  assert.equal(normalizeManagedText(managedBlock[1]), normalizeManagedText(agentsSnippet));
  assert.ok(Buffer.byteLength(agentsSnippet, "utf8") < 8_000);
  assert.ok(agentsSnippet.split(/\r?\n/).length < 100);
  assert.match(agentsSnippet, /progressive disclosure/);
  assert.match(agentsSnippet, /load only the one skill needed/);
  assert.match(agentsSnippet, /latest user instruction/);
  assert.match(agentsSnippet, /workflow-state next/);
  assert.match(agentsSnippet, /codex-wayfinder/);
  assert.match(agentsSnippet, /brainstorming/);
  assert.match(agentsSnippet, /writing-plans/);
  assert.match(agentsSnippet, /SessionStart/);
  assert.match(agentsSnippet, /PreToolUse/);
  assert.match(agentsSnippet, /PreCompact/);
  assert.match(agentsSnippet, /Stop.*advisory only/is);
  assert.match(agentsSnippet, /Installed copies .* are distribution artifacts/is);
  assert.match(agentsSnippet, /fresh verification proportional to risk/);
  assert.doesNotMatch(agentsSnippet, /PostToolUse|UserPromptSubmit|SubagentStop|bounded continuation/);
  assert.match(readme, /root\/bootstrap parity/);
  assert.match(readme, /prototype-as-primary-source/);
  assert.match(readme, /deep-module boundary/);
  assert.match(readme, /local-ticket\/frontier/);

  const requestingReview = readSkill("requesting-code-review");
  assert.match(requestingReview, /## Mandatory Review Gate/);
  assert.match(requestingReview, /record the low-risk reason/);
  assert.match(requestingReview, /workflow-state transition review-complete/);
  assert.match(requestingReview, /workflow-state transition review-skipped/);
  assert.match(requestingReview, /Review Evidence/);
  assert.match(requestingReview, /content hash/);

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
  assert.match(reviewPanel, /first real project mutation automatically reopens debugging and invalidates prior verification\/review evidence/);
  assert.match(reviewPanel, /Review Evidence/);
  assert.match(reviewPanel, /rejects delivery if it changes after review closure/);

  const verificationEvidenceLoop = readSkill("codex-verification-loop");
  assert.match(verificationEvidenceLoop, /verification-pass/);
  assert.match(verificationEvidenceLoop, /verification-gap-recorded/);
  assert.match(verificationEvidenceLoop, /SHA-256 hash/);

  const completionVerification = readSkill("verification-before-completion");
  assert.match(completionVerification, /verification_evidence_hash/);
  assert.match(completionVerification, /review_evidence_hash/);

  const receivingReview = readSkill("receiving-code-review");
  assert.match(receivingReview, /## Workflow Gate/);
  assert.match(receivingReview, /review-changes-requested/);
  assert.match(receivingReview, /execution-complete/);

  const simplicity = readSkill("codex-simplicity-review");
  assert.match(simplicity, /## Simplicity Gate/);
  assert.match(simplicity, /Avoid building/);
  assert.match(simplicity, /Standard library/);
  assert.match(simplicity, /Native platform/);
  assert.match(simplicity, /Already in the codebase/);
  assert.match(simplicity, /Do not make one-line\/minimum-implementation checks mandatory/);
  assert.match(simplicity, /dong-debt: <ceiling>; revisit when <trigger>/);

  const architecture = readSkill("codex-architecture-governance");
  assert.match(architecture, /Deep Module Boundary Check/);
  assert.match(architecture, /public entry points/);
  assert.match(architecture, /private internals/);
  assert.match(architecture, /deep imports/);
  assert.match(architecture, /dependency-cruiser/);
  assert.match(architecture, /barrel files that hide ownership/);

  const worktree = readSkill("codex-worktree-governance");
  assert.match(worktree, /## Branch Finishing Menu/);
  assert.match(worktree, /Merge locally into <base-branch>/);
  assert.match(worktree, /Discard this work/);
  assert.match(worktree, /Never remove a `codex-managed-worktree`/);

  const checkpoint = readSkill("codex-git-checkpoint");
  assert.match(checkpoint, /## Branch Completion Boundary/);
  assert.match(checkpoint, /fixed finishing menu/);
  assert.match(checkpoint, /workflow-state transition delivery-complete/);

  const verificationLoop = readSkill("codex-verification-loop");
  assert.match(verificationLoop, /workflow-state transition verification-retry/);
  assert.match(verificationLoop, /workflow-state transition verification-gap-accepted/);
  assert.match(verificationLoop, /mutually exclusive/i);

  const completion = readSkill("verification-before-completion");
  assert.match(completion, /workflow-state transition checkpoint-ready/);
  assert.match(completion, /workflow-state transition delivery-complete/);

  const evidence = readSkill("codex-evidence-capture");
  assert.match(evidence, /Direct product use can count as product evidence/);
  assert.match(evidence, /shipped CLI/);

  const skillEvolutionText = readSkill("codex-skill-evolution");
  assert.match(skillEvolutionText, /offline, validation-gated SkillOpt-Sleep runs/);
  assert.match(skillEvolutionText, /Do not run SkillOpt-Sleep from any hook/);
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

  const wayfinderSkill = readSkill("codex-wayfinder");
  assert.match(wayfinderSkill, /## Destination/);
  assert.match(wayfinderSkill, /## Decisions So Far/);
  assert.match(wayfinderSkill, /## Frontier/);
  assert.match(wayfinderSkill, /## Fog/);
  assert.match(wayfinderSkill, /## Out Of Scope/);
  assert.match(wayfinderSkill, /Default to resolving one frontier ticket per session/i);
  assert.match(wayfinderSkill, /bounded parallel exploration/i);
  assert.match(wayfinderSkill, /Research|Prototype|Grilling|Task/);
  assert.match(wayfinderSkill, /HITL|AFK/);
  assert.match(wayfinderSkill, /local Markdown/);
  assert.match(wayfinderSkill, /docs\/codex\/wayfinder\/prototypes/);
  assert.match(wayfinderSkill, /## Typical Triggers/);
  assert.match(wayfinderSkill, /## Prototype As Primary Source/);
  assert.match(wayfinderSkill, /docs\/codex\/wayfinder\/tickets/);
  assert.match(wayfinderSkill, /answers one design question/);
  assert.match(wayfinderSkill, /Logic prototype/);
  assert.match(wayfinderSkill, /UI prototype/);
  assert.match(wayfinderSkill, /primary-source pointer/);

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
