# Handoff Summary

## Objective
Add first-class asset lifecycle governance to Dong Skills so long-running projects do not accumulate stale state, raw snapshots, archives, generated evidence, duplicate docs, orphan scripts, or misleading code assets.

## Latest User Instruction
User asked to optimize Dong Skills after identifying that current hooks/state files help but do not fully govern the lifecycle of docs, records, raw files, archives, scripts, and code assets.

## Approved Scope / Spec
- Add a main `codex-asset-governance` skill.
- Add deterministic `asset-governance` audit/prune command.
- Keep `observations.jsonl` for learning review and only prune generated `precompact-auto-*.md` snapshots through raw retention.
- Hook blocking should be limited to severe bloat or unsafe tracked raw/runtime artifacts.
- Keep Dong Skills meta-optimization backlog separate from ordinary project memory.
- Keep the Dong Skills source repo clean when the installer is run against the kit itself.

## Plan Status
Implementation, docs, verification, and global install sync are complete. Final checkpoint commit and push are pending.

## Files Modified
- `AGENTS.md`
- `.agents/skills/codex-asset-governance/SKILL.md`
- `.codex/scripts/lib/assets.mjs`
- `scripts/asset-governance.mjs`
- `.codex/hooks/project-ops.mjs`
- `.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/asset-governance.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `scripts/install-windows.ps1`
- `scripts/project-ops-health.mjs`
- `tests/project-ops.test.mjs`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `README.md`
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-docs-stewardship/SKILL.md`
- `.agents/skills/codex-context-budget/SKILL.md`
- `docs/improvements/backlog.md`
- `.codex-context/*` state and archive files

## Decisions Made
- Asset governance is a main lifecycle skill and a CLI audit, not a lightweight optional note.
- `asset-governance --apply` only deletes generated `precompact-auto-*.md` snapshots that exceed retention.
- `observations.jsonl` is never pruned by generic asset cleanup.
- `PreCompact` and `Stop` consume only severe asset governance issues as blockers.
- Ordinary stale/duplicate/orphan findings stay as audit advisories unless they are unsafe or large enough to block.
- Installer self-install into the Dong Skills source kit removes generated `.codex/scripts/*.mjs` helper copies so root `scripts/` remains the canonical helper source.

## Verification Evidence
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no blocking issues or advisories.
- `node .codex\hooks\project-ops.mjs health-check`: pass, no issues.
- `node --test tests\project-ops.test.mjs`: pass, 19/19 tests.
- `node scripts\release-check.mjs .`: pass, including syntax, tests, privacy scan, and runtime artifact scan.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -TargetProjectRoot .`: pass; global skill sync completed and source self-install helper duplicates were removed.
- Global `%USERPROFILE%\.agents\skills\codex-asset-governance\SKILL.md`: present.
- `git diff --check`: pass after final state-file rewrite.

## Open Questions And Assumptions
- Existing target projects still need rerunning bootstrap/onboarding to receive the new project-local `asset-governance` script and hook wiring.
- Codex UI hook trust still has to be handled per project through `/hooks`; this change improves installed assets, not UI trust persistence.

## Risks
- Thresholds may need future tuning if Stop becomes too noisy on very large projects.
- `docs/improvements/backlog.md` must be reviewed periodically or it can become stale.
- Asset governance reports lifecycle problems; it intentionally does not auto-delete durable docs/code.

## Git Checkpoint
- Latest commit: pending final asset governance checkpoint.
- Push state: pending final push to `origin/main`.
- Files included: all current asset governance skill, script, hook, installer, bootstrap, docs, tests, and state-file changes.
- Files intentionally left uncommitted: none intended.
- Deferred reason: none.
- Next checkpoint: commit and push the verified asset governance update.

## Next Action
Commit, push, and report the commit SHA.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/spec.md`
4. `.codex-context/plan-progress.md`
5. `.codex-context/artifact-index.md`
6. `.codex-context/verification.md`
7. `.agents/skills/codex-asset-governance/SKILL.md`
8. `.codex/scripts/lib/assets.mjs`
9. `scripts/asset-governance.mjs`
10. `scripts/install-windows.ps1`
