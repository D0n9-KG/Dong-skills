# Handoff Summary

## Objective
Align Dong Skills recovery constraints across sessions and after compaction, then check nearby governance omissions.

## Latest User Instruction
Fix the missing hook recovery order and check whether other parts have omissions.

## Approved Scope / Spec
Keep the existing Dong Skills architecture. Align automatic hook recovery with AGENTS recovery rules, ensure bootstrap assets carry the same behavior, strengthen checks so asset drift fails health/release validation, and update state/handoff.

## Plan Status
Implementation, asset sync, regression tests, health check, release check, architecture/docs/budget/solution/learning checks, state updates, global install, and checkpoint commit are complete. Push and remote verification are pending.

## Files Modified
- `.codex/scripts/lib/recovery.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `.agents/skills/codex-verification-loop/SKILL.md`
- `.agents/skills/codex-docs-stewardship/SKILL.md`
- `tests/project-ops.test.mjs`
- `.codex-context/*.md`

## Files Read But Not Changed
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-docs-stewardship/SKILL.md`
- `.agents/skills/codex-verification-loop/SKILL.md`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/templates.mjs`
- existing `.codex-context/*.md`

## Decisions Made
- Automatic `SessionStart` / `PostCompact` recovery should state the same order as AGENTS, including `.codex-context/solution-index.md`.
- Automatic recovery should include a compact `solution-index.md` excerpt.
- `STRATEGY.md`, `CONCEPTS.md`, and full `docs/solutions/` entries remain on-demand.
- Bootstrap asset parity drift should fail `project-ops-health` and therefore `release-check`.
- Verification evidence should be appended to the end of `verification.md` because `state-prune` keeps later command entries as newer.

## Open Questions And Assumptions
- No open questions.
- Assumption: Codex still needs a fresh thread/restart for updated global skill files to be reflected in the skill list.

## Risks
- Compact solution-index injection depends on `solution-index.md` staying short.
- Full solution docs and session history remain on-demand to avoid context bloat and privacy risk.
- `tests/project-ops.test.mjs` is now over the architecture-scan large-file threshold, but it is still a coherent integration test surface.
- Fresh project hooks still require user trust through `/hooks` when Codex prompts.

## Verification Evidence
- `node --test tests/project-ops.test.mjs` passed 9/9 tests.
- `node scripts/project-ops-health.mjs .` reported `Issues: none`.
- `node .codex/hooks/project-ops.mjs health-check` reported `Issues: none`.
- `node scripts/release-check.mjs .` passed health, syntax, PowerShell parse, tests, privacy scan, and runtime-artifact scan.
- `git diff --check` passed.
- Temporary-target `scripts/install-windows.ps1` run synced global skills; global onboarding asset recovery includes `solution-index.md` and on-demand knowledge guidance.
- Final rerun after verification-order skill updates passed 9/9 tests, health check, release check, and `git diff --check`.
- Final temporary-target install synced global skill copies after the verification-order skill updates.
- Architecture scan reported only `tests/project-ops.test.mjs` as a large-file review candidate.
- Docs scan reported no hard issue.
- Context budget estimated ~28,130 tokens across 44 active files.
- `solution-status` found 0 invalid docs; `learning-status` found no pending observations.

## Git Checkpoint
- Latest functional commit: `fix(skills): align recovery context`
- Push state: pushed to `origin/main` after this checkpoint is pushed.
- Files included: recovery hook, bootstrap asset recovery hook, health script, bootstrap asset health script, verification/docs stewardship skill rules, tests, refreshed `.codex-context` state, and global install verification.
- Files intentionally left uncommitted: none.
- Deferred reason: none.
- Next checkpoint: next meaningful Dong Skills change.

## Learned Instincts To Preserve
- Bootstrap assets must stay in parity with root hook/scripts/templates.
- Recovery output must stay aligned with AGENTS recovery order.
- Solution docs and session histories remain targeted, on-demand context.
- New verification evidence should be appended, not prepended, before state pruning.

## Next Action
Push checkpoint, verify remote, then report.

## Files To Re-read First
- `.codex-context/handoff-summary.md`
- `.codex-context/current-state.md`
- `.codex-context/project-map.md`
- `.codex/scripts/lib/recovery.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`
- `scripts/project-ops-health.mjs`
- `tests/project-ops.test.mjs`
