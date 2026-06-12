# Current State

## Objective
Add first-class asset lifecycle governance to Dong Skills so docs, state files, raw snapshots, archives, scripts, hooks, tests, generated evidence, and code assets do not accumulate stale or redundant material.

## Latest User Instruction
User asked to optimize Dong Skills after identifying that state files, records, docs, raw files, and code assets need lifecycle governance instead of only hook reminders.

## Current Phase
Final verification and checkpoint.

## Implemented
- Added `codex-asset-governance` as a curated skill.
- Added deterministic asset governance runtime in `.codex/scripts/lib/assets.mjs`.
- Added CLI entry `node .codex/hooks/project-ops.mjs asset-governance`.
- Added `scripts/asset-governance.mjs` and onboarding bootstrap copies.
- Wired severe asset governance issues into `PreCompact` and `Stop`.
- Updated install/bootstrap scripts, health checks, README, AGENTS snippets, routing skills, and tests.
- Added installer self-install cleanup so Dong Skills source does not keep duplicate generated `.codex/scripts/*.mjs` helper copies.
- Synced global installed skills to `%USERPROFILE%\.agents\skills`, including `codex-asset-governance`.

## Active Assumptions
- Asset governance is a main Dong Skills feature, not an optional module.
- `observations.jsonl` is learning review input and must not be pruned by generic raw cleanup.
- Generated `precompact-auto-*.md` snapshots are short-lived backup/audit artifacts and can be pruned by retention.
- Hook blocking should be limited to severe bloat or unsafe tracked raw/runtime artifacts.

## Blockers
- None.

## Verification Snapshot
- Asset governance dry-run: pass, no blocking issues or advisories.
- Health check: pass, no issues.
- Tests: pass, 19/19.
- Release check: pass, including syntax, tests, privacy scan, and runtime artifact scan.
- `git diff --check`: pass after state-file EOF cleanup.

## Next Action
Commit and push the verified asset governance update.

## Last Updated
2026-06-12 22:25 +08:00
