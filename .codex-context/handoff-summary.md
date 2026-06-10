# Handoff Summary

## Objective
Fix Dong Skills Windows hook invocation so project hooks run correctly in Codex `/hooks`, especially PreCompact/PostCompact.

## Latest User Instruction
User provided `/hooks` error details showing PowerShell parser failures for UserPromptSubmit, PreCompact, PostCompact, PostToolUse, and Stop.

## Approved Scope / Spec
Keep project-level hooks as the main mechanism. Fix the Windows command invocation in the released kit and onboarding bootstrap assets, add regression checks, make onboarding repair stale installed configs, sync global skills, and checkpoint the verified change to GitHub.

## Plan Status
Implementation, bootstrap asset sync, tests, health check, release check, privacy scan, global install, learning-memory update, and state refresh are complete. Commit and push are the remaining checkpoint steps.

## Files Modified
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `tests/project-ops.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/decisions.md`
- `.codex-context/risks.md`
- `.codex-context/verification.md`
- `.codex-context/learned-instincts.md`
- `.codex-context/instincts/project/windows-hooks-use-encoded-command.md`
- `.codex-context/handoff-summary.md`

## Files Read But Not Changed
- User-provided `/hooks` screenshot showing PowerShell parser errors.
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `codex-project-governance`, `systematic-debugging`, `codex-verification-loop`, `verification-before-completion`, `codex-docs-stewardship`, `codex-learning-memory`, and `codex-git-checkpoint` skill docs

## Decisions Made
- Use `powershell.exe ... -EncodedCommand` for all Windows hook wrappers to prevent outer PowerShell from expanding `$root` / `$null`.
- Health check must decode Windows encoded commands and confirm the payload invokes `project-ops.mjs`.
- Onboarding must run health check even when all bootstrap gate files exist, and rerun bootstrap once if installed config is stale.
- Save a project instinct for Windows hook quoting because this is a reusable, verified project convention.

## Open Questions And Assumptions
- No open questions.
- Assumption: the other project shown in the screenshot still has stale `.codex/hooks.json` until repaired or re-bootstrapped.

## Risks
- Existing stale projects need repair; publishing this kit does not mutate already-open project hook config automatically.
- Codex UI hook trust state is per project and may require restarting Codex or opening a new thread after bootstrap.
- `PreCompact` can request/block based on hook output, but it cannot guarantee recovery if the hook command itself is stale or failing.

## Verification Evidence
- `node --check scripts\project-ops-health.mjs`, asset health script, and `tests\project-ops.test.mjs` passed.
- `node --test tests\project-ops.test.mjs` passed 12/12 tests.
- `node scripts\project-ops-health.mjs .` reported `Issues: none`.
- `node .codex\hooks\project-ops.mjs health-check` reported `Issues: none`.
- `node scripts\release-check.mjs .` passed health, syntax, PowerShell parse, tests, privacy scan, and runtime-artifact scan.
- `git diff --check` passed.
- Temporary-target `scripts\install-windows.ps1` synced global skills; global onboarding now includes the health-check repair rule.

## Git Checkpoint
- Latest commit: pending.
- Push state: not pushed yet.
- Files included: pending checkpoint for Windows hook hardening and state refresh.
- Files intentionally left uncommitted: none expected.
- Deferred reason: none; checkpoint is next.
- Next checkpoint: commit and push `fix(hooks): harden Windows command invocation`.

## Learned Instincts To Preserve
- Windows hook wrappers must use encoded PowerShell and be tested through an outer PowerShell invocation.
- Bootstrap assets must stay in parity with root hook/scripts/templates.
- Recovery output must stay aligned with AGENTS recovery order.
- New verification evidence should be appended, not prepended, before state pruning.

## Next Action
Commit and push the verified Windows hook hardening, then tell the user that the screenshot shows hooks were running but failing due to the old command, and that the affected project should be repaired by rerunning onboarding/bootstrap or replacing `.codex/hooks.json`.

## Files To Re-read First
- `.codex-context/handoff-summary.md`
- `.codex-context/current-state.md`
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `tests/project-ops.test.mjs`
