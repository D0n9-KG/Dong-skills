# Handoff Summary

## Objective
Fix Dong Skills `PreCompact` behavior so automatic compaction does not silently hard-stop when recovery state is stale.

## Latest User Instruction
User reported that hooks appear problematic, especially the pre-compaction hook: automatic compaction stops, but no hook feedback is shown.

## Approved Scope / Spec
Keep project-level hooks as the main mechanism. Change only Dong Skills hook behavior, docs, tests, and governance state. Manual compaction should still be strict; automatic compaction should preserve recovery state and continue.

## Plan Status
Implementation, asset sync, docs update, regression tests, health check, release check, diff check, learning instinct capture, global sync, and local functional commit are complete. State-refresh commit, push, and final user report remain.

## Files Modified
- `.codex/scripts/lib/events.mjs`
- `.codex/hooks/project-ops.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`
- `tests/project-ops.test.mjs`
- `README.md`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex-context/current-state.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/decisions.md`
- `.codex-context/risks.md`
- `.codex-context/verification.md`
- `.codex-context/learned-instincts.md`
- `.codex-context/instincts/project/precompact-auto-writes-emergency-handoff.md`
- `.codex-context/handoff-summary.md`

## Files Read But Not Changed
- Official Codex manual hook sections in `%TEMP%\openai-docs-cache\codex-manual.md`
- Local Codex hook schema files under `%TEMP%\codex-schema-ts`
- Existing hook runtime, health/release scripts, tests, README, AGENTS snippet, skill docs, and state files

## Decisions Made
- Explicit `manual` PreCompact still returns `continue: false` when governance state is stale.
- `auto` or unknown-trigger PreCompact writes an emergency handoff, archives the previous handoff under `.codex-context/raw/precompact-auto-*.md`, and returns `continue: true`.
- Unknown trigger defaults to the automatic path to avoid hard-blocking at context pressure.
- Docs now describe manual vs automatic behavior explicitly.
- A project instinct records this behavior to prevent regression.

## Open Questions And Assumptions
- Assumption: the user's latest screenshot shows hooks are invoked but the automatic PreCompact block is not chat-visible.
- Assumption: Codex may ignore `systemMessage` or not render it prominently in some automatic compaction flows; durable filesystem recovery is more reliable.
- Open question: affected projects must rerun onboarding/bootstrap or receive copied `.codex` assets before this change takes effect.

## Risks
- Emergency handoff is intentionally less complete than a deliberate handoff and must be reviewed after recovery.
- Already-open Codex sessions may need restart/new thread and `/hooks` trust review after project hook files change.
- Existing projects with stale hook runtime still have the old behavior until repaired.

## Verification Evidence
- `node --check` passed for root and asset `events.mjs` plus root and asset `project-ops.mjs`.
- `node --test tests\project-ops.test.mjs` passed 13/13 tests.
- `node scripts\project-ops-health.mjs .` reported `Issues: none`.
- `node scripts\release-check.mjs .` passed health, syntax, PowerShell parse, tests, privacy scan, and runtime-artifact scan.
- `git diff --check` passed.
- `scripts\install-windows.ps1` synced global skills; global project governance and onboarding assets contain the new automatic PreCompact fallback behavior.

## Git Checkpoint
- Latest functional commit: `e063b22bc7f62ee775b02b3421cf06e4983dc168` (`fix(hooks): allow automatic precompact recovery`)
- Push state: not pushed yet; local branch has unpushed PreCompact fallback work
- Files included: PreCompact fallback code, tests, docs, state, and instinct files
- Files intentionally left uncommitted: none intended
- Deferred reason: state-refresh commit is being prepared before push
- Next checkpoint: commit state refresh, push, and verify remote SHA

## Learned Instincts To Preserve
- Windows hook wrappers must use encoded PowerShell and be tested through an outer PowerShell invocation.
- Automatic PreCompact must write emergency handoff and allow compaction instead of hard-blocking silently.
- Bootstrap assets must stay in parity with root hook/scripts/templates.
- Recovery output must stay aligned with AGENTS recovery order.

## Next Action
Commit this final state refresh, push, verify remote SHA, then tell the user the root cause and how to repair affected projects.

## Files To Re-read First
- `.codex-context/handoff-summary.md`
- `.codex-context/current-state.md`
- `.codex/scripts/lib/events.mjs`
- `.codex/hooks/project-ops.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`
- `tests/project-ops.test.mjs`
- `.codex-context/verification.md`
