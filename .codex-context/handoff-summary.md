# Handoff Summary

## Objective
Fix Dong Skills hook JSON output so `PostCompact` no longer returns event-specific fields unsupported by Codex.

## Latest User Instruction
User showed `/hooks` reporting `hook returned invalid PostCompact hook JSON output`, noted `PreCompact` itself did not show the same error, and asked to fix it.

## Approved Scope / Spec
Keep project-level hooks. Change Dong Skills hook runtime, tests, docs, bootstrap assets, global skills, and the active Science Evo project's hook runtime. Do not edit Science Evo business/source/docs files beyond hook repair.

## Plan Status
Implementation, bootstrap asset sync, docs update, regression tests, health check, release check, global sync, Science Evo project sync, and local functional commit are complete. State refresh, push, and final user report remain.

## Files Modified
- `.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `tests/project-ops.test.mjs`
- `README.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex-context/current-state.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/decisions.md`
- `.codex-context/risks.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## Files Read But Not Changed
- Science Evo `.codex/hooks.json`
- Science Evo `.codex/hooks/project-ops.mjs`
- Science Evo `.codex/scripts/lib/recovery.mjs`
- Official Codex manual hook sections in the local OpenAI docs cache
- Local Codex hook schema files under `%TEMP%\codex-schema-ts`

## Decisions Made
- `PostCompact` now returns only `{ "continue": true }`.
- Recovery context injection remains in `SessionStart`, including the `compact` matcher path.
- `PreCompact` auto path no longer returns `hookSpecificOutput`; it keeps `continue: true` and `systemMessage`.
- `UserPromptSubmit` and `SessionStart` keep event-specific output because they are not the failing path.

## Open Questions And Assumptions
- Assumption: Codex rejects `hookSpecificOutput.additionalContext` for `PostCompact`; the Science Evo `/hooks` error and official hook output behavior support this.
- Assumption: Removing event-specific output from `PreCompact` auto is safer even though `PreCompact` did not visibly fail.
- Open question: whether Codex will render `systemMessage` for `PreCompact` auto consistently remains product-dependent.

## Risks
- Existing projects need hook runtime refresh to stop the `PostCompact` invalid JSON output error.
- `PostCompact` no longer injects recovery context directly; agents must rely on `SessionStart` with compact source.
- No hook-run telemetry was added in this fix, so future observability remains limited until that is implemented separately.

## Verification Evidence
- `node --check .codex\scripts\lib\events.mjs` and asset `events.mjs` passed.
- `node --test tests\project-ops.test.mjs` passed 14/14 tests.
- `node scripts\project-ops-health.mjs .` reported `Issues: none`.
- `node scripts\release-check.mjs .` passed health, syntax, PowerShell parse, tests, privacy scan, and runtime-artifact scan.
- Science Evo simulated `PostCompact` now returns `{"continue":true}` and Science Evo hook health check reports `Issues: none`.

## Git Checkpoint
- Latest functional commit: `b01c78737d97430806911ba036b672565889d74a` (`fix(hooks): use common postcompact output`)
- Push state: not pushed yet; local branch is ahead of origin
- Files included: hook output schema repair, tests, docs, bootstrap assets, and state files
- Files intentionally left uncommitted: none intended in Dong Skills
- Deferred reason: state refresh is being prepared before push
- Next checkpoint: commit this state refresh, push, and verify remote SHA

## Learned Instincts To Preserve
- Hook output schema is event-specific; do not reuse `SessionStart` `hookSpecificOutput.additionalContext` for `PostCompact`.
- Automatic PreCompact must write emergency handoff and allow compaction instead of hard-blocking silently.
- Windows hook wrappers must use encoded PowerShell and be tested through an outer PowerShell invocation.
- Bootstrap assets must stay in parity with root hook/scripts/templates.

## Next Action
Commit this state refresh, push Dong Skills, verify remote SHA, then report the result.

## Files To Re-read First
- `.codex-context/handoff-summary.md`
- `.codex-context/current-state.md`
- `.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `tests/project-ops.test.mjs`
- `.codex-context/verification.md`
