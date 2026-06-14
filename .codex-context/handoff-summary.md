# Handoff Summary

## Objective
Harden Dong Skills workflow so non-trivial work has explicit written-spec approval, written planning, execution-mode approval, and constrained execution.

## Latest User Instruction
Add self-review around spec/planning/execution; support both traditional execution and Codex Goal mode; ensure Goal mode has strong runtime constraints; stop for ambiguous requirements; reuse high-quality external skills where useful.

## Approved Scope / Spec
- Spec: `.codex-context/spec.md`
- Approved by user instruction on 2026-06-14.
- Scope: workflow skill docs, project governance/router docs, templates, health checks, README/AGENTS guidance, tests, backlog, and state files.

## Plan Status
- Execution mode for this edit: Traditional task-by-task execution.
- Goal mode was not used for this task; support was added for future tasks.
- All implementation and verification tasks are complete.
- Remaining action: commit and push checkpoint.

## Files Modified
- `.agents/skills/brainstorming/SKILL.md`
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex/scripts/lib/templates.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/spec.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/plan-progress.md`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `README.md`
- `tests/project-ops.test.mjs`
- `docs/improvements/backlog.md`
- `.codex-context/current-state.md`
- `.codex-context/spec.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/decisions.md`
- `.codex-context/risks.md`
- `.codex-context/handoff-summary.md`

## Files Read But Not Changed
- `.agents/skills/codex-git-checkpoint/SKILL.md`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- Existing `.codex-context/` state files

## Decisions Made
- Final discussion approval is not written-spec approval. A spec can be `Pending written-spec approval` before it becomes `Approved by user`.
- `writing-plans` must include `Execution Mode`, `Goal Mode Objective Draft`, `Runtime Constraints`, and `Checkpoint Cadence`.
- `plan-then-execute` defaults to Traditional task-by-task execution.
- Codex Goal mode requires explicit user selection and a complete Goal objective with scope, non-goals, verification, checkpoint cadence, state updates, and stop conditions.
- Existing project health checks should flag missing execution-mode schema sections.

## Open Questions And Assumptions
- No blocking open questions.
- Future question: whether Goal mode needs dedicated hook telemetry after real usage.
- Assumption: existing projects need a Dong Skills update/bootstrap to receive new local templates and AGENTS snippets.

## Risks
- Goal mode support is currently enforced through skill/state guidance, not a dedicated runtime hook.
- Existing sessions that already loaded older skills/hooks may need a fresh session or project update.
- Context budget rose to ~50,846 tokens across 54 files; context-budget suggests future split consideration for large hook helper modules.

## Verification Evidence
- `node --test tests\project-ops.test.mjs`: pass, 28/28.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.
- `node scripts\project-ops-health.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, no pending observations/outbox items.
- `node .codex\hooks\project-ops.mjs context-budget`: pass/advisory, ~50,846 tokens across 54 files.

## Git Checkpoint
- Latest commit: previous checkpoint `0dd8f8d fix(governance): harden state recovery checks`
- Push state: this hardening change is verified and ready to commit/push.
- Files included: all files listed under Files Modified.
- Files intentionally left uncommitted: none intended.
- Deferred reason: none; checkpoint is next.
- Next checkpoint: commit `fix(workflow): gate written specs and goal execution`, then push `origin/main`.

## Learned Instincts To Preserve
- For borrowed skills, preserve upstream gates that directly prevent drift, even when Dong Skills stays lighter than the original.
- Treat written spec approval, plan approval, and execution mode approval as separate recoverable states.
- Dong Skills improvement findings belong in `docs/improvements/backlog.md`, not project instincts.

## Next Action
Commit and push the verified checkpoint.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/spec.md`
4. `.codex-context/plan-progress.md`
5. `.codex-context/artifact-index.md`
6. `.codex-context/verification.md`
7. `.agents/skills/brainstorming/SKILL.md`
8. `.agents/skills/writing-plans/SKILL.md`
9. `.agents/skills/executing-plans/SKILL.md`
10. `tests/project-ops.test.mjs`
