# Artifact Index

## Created
- `AGENTS.md`: active project instructions for the Dong Skills source repo, generated from the project ops snippet and safe to publish.
- `.agents/skills/codex-asset-governance/SKILL.md`: first-class asset lifecycle governance skill.
- `.codex/scripts/lib/assets.mjs`: deterministic asset governance status/report/prune runtime.
- `scripts/asset-governance.mjs`: CLI wrapper for asset governance audits and safe raw snapshot pruning.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`: bootstrap copy of asset governance runtime.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/asset-governance.mjs`: bootstrap copy of asset governance CLI.
- `.codex-context/archive/verification-2026-06-12.md`: archived older verification entries after pruning active `verification.md`.

## Modified
- `.codex/hooks/project-ops.mjs`: exposes `asset-governance` as a project ops CLI command.
- `.codex/scripts/lib/events.mjs`: `PreCompact` and `Stop` include severe asset governance issues.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: bootstrap hook copy kept in sync.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`: bootstrap event runtime kept in sync.
- `scripts/install-windows.ps1`: installs `asset-governance.mjs`, syncs global skills, and removes generated helper duplicates during Dong Skills source self-install.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: copies `asset-governance.mjs` into target project `.codex/scripts`.
- `scripts/project-ops-health.mjs` and bootstrap copy: require asset governance script presence and parity.
- `tests/project-ops.test.mjs`: added coverage for bootstrap installation, safe raw snapshot pruning, and Stop blocking on severe verification bloat.
- `AGENTS.project-ops.snippet.md` and onboarding asset copy: document `codex-asset-governance` and raw lifecycle audit command.
- `README.md`: documents asset lifecycle governance and command usage in Chinese and English sections.
- `.agents/skills/using-superpowers/SKILL.md`: routes stale/duplicate/orphan/bloated assets to `codex-asset-governance`.
- `.agents/skills/codex-project-governance/SKILL.md`: adds asset governance to lifecycle, hooks, and completion gates.
- `.agents/skills/codex-docs-stewardship/SKILL.md`: directs whole-workspace lifecycle sweeps to asset governance first.
- `.agents/skills/codex-context-budget/SKILL.md`: references asset governance for broader bloat/raw snapshot cleanup.
- `.codex-context/spec.md`, `plan-progress.md`, `current-state.md`, `artifact-index.md`, `verification.md`, and `handoff-summary.md`: refreshed for this task.
- `.codex-context/project-map.md`, `decisions.md`, `risks.md`, `learned-instincts.md`, `solution-index.md`, and related instinct docs: updated to remove stale prior-task wording and record asset governance decisions.
- `docs/improvements/backlog.md`: records the accepted Dong Skills asset lifecycle governance improvement.

## Read / Inspected
- Existing governance skills and hooks.
- Asset governance implementation diff.
- Install/bootstrap scripts, health check, release check, tests, README, AGENTS snippets, and state files.

## Raw Outputs
- Verification outputs are summarized in `.codex-context/verification.md`.
- `.codex-context/raw/` contains only `.gitkeep`.
