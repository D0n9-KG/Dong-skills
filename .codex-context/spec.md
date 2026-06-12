# Spec

## Problem
Dong Skills already had docs stewardship, context budget, learning memory, solution memory, architecture governance, hooks, and state files, but there was no single first-class workflow for asset lifecycle governance. Long-running projects could still accumulate stale state files, raw PreCompact snapshots, archive files, duplicate docs, generated evidence, orphan scripts, and misleading records.

## Goals
- Add `codex-asset-governance` as a main curated Dong Skills skill.
- Add a deterministic `asset-governance` audit command reachable through `node .codex/hooks/project-ops.mjs asset-governance`.
- Classify accumulated assets as Keep, Update, Consolidate, Replace, Delete, Stale, or Raw-Prune.
- Add safe lifecycle rules for generated `precompact-auto-*.md` raw snapshots while preserving `observations.jsonl` for learning review.
- Escalate severe active state bloat or tracked raw/runtime artifacts through `PreCompact` and `Stop`.
- Keep detailed docs cleanup, architecture cleanup, solution refresh, and context budgeting delegated to their specialist skills.
- Sync root runtime files, onboarding bootstrap assets, installer behavior, health checks, tests, README, and AGENTS snippets.
- Keep Dong Skills source installation clean when `install-windows.ps1` is run from the kit itself.

## Non-Goals
- Do not delete `observations.jsonl` through generic raw pruning.
- Do not automatically delete durable docs, solution memory, or code assets.
- Do not add broad pre-edit hooks for every file.
- Do not import a heavy upstream ritual wholesale.
- Do not treat old archive material as active recovery context.

## Approved Scope
Approved by user on 2026-06-12 after discussing Dong Skills asset/document/code lifecycle governance and comparing existing Dong Skills controls with CE/ECC/Superpowers-style maintenance patterns.

## User Decisions
- Asset lifecycle governance should be a primary Dong Skills function, not an optional cleanup note.
- Raw PreCompact snapshots are useful as backup/audit artifacts but need retention rules.
- Ordinary project memory and Dong Skills optimization backlog must remain separate.
- Hooks should block only for severe bloat or unsafe tracked artifacts; ordinary lifecycle cleanup can be handled by audit commands and skills.

## Design
- `codex-asset-governance` defines the asset lifecycle sweep and reader/owner/reason classification.
- `.codex/scripts/lib/assets.mjs` implements deterministic status checks and safe raw snapshot pruning.
- `scripts/asset-governance.mjs` exposes dry-run by default and `--apply` only for generated `precompact-auto-*.md` retention pruning.
- `.codex/hooks/project-ops.mjs` exposes the `asset-governance` CLI command.
- `events.mjs` calls asset governance from `PreCompact` and `Stop`, using only severe issues as blocking conditions.
- Bootstrap and install scripts copy `asset-governance.mjs` into target projects; the Windows installer skips/removes generated helper copies when installing into the Dong Skills source kit itself.
- Health check verifies asset script parity between root assets and onboarding bootstrap assets.
- Tests cover bootstrap installation, raw pruning that preserves `observations.jsonl`, and Stop escalation for severe asset bloat.

## Acceptance Criteria
- `codex-asset-governance` exists and is routed by core workflow docs.
- `asset-governance` CLI runs through `node .codex/hooks/project-ops.mjs asset-governance`.
- New project bootstrap installs `asset-governance.mjs`.
- Health check enforces asset script parity.
- Tests cover bootstrap installation, raw snapshot pruning, and Stop escalation for severe asset bloat.
- Current stale state files are refreshed or intentionally archived.
- `verification.md` is pruned so active recovery remains compact.
- Global installed skills include `codex-asset-governance`.
- Tests, health check, asset governance audit, release check, privacy scan, and diff check pass.

## Approval Status
Approved by user on 2026-06-12.

## Next Step
Final verification, checkpoint commit, and push to `origin/main`.
