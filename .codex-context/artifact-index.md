# Artifact Index

## Created
- `scripts/project-ops-health.mjs`: project installation health check for hooks, context files, raw ignore rules, checkpoint labels, tracked raw files, and asset parity.
- `scripts/release-check.mjs`: release hygiene check for health, syntax, tests, privacy patterns, and runtime artifacts.
- `tests/project-ops.test.mjs`: regression tests for bootstrap raw ignore, learning redaction, Git Checkpoint validation, and section-aware recovery.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: bootstrap asset copy for target projects.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`: bootstrap asset copy for target projects.

## Modified
- `.codex/hooks/project-ops.mjs`: tightened learning redaction, validated Git Checkpoint fields, made SessionStart handoff recovery section-aware, added health/release CLI proxies, and added Git Checkpoint template fields.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: synced hook asset.
- `scripts/install-windows.ps1`: switched project template source to clean onboarding assets, added context-section migration, raw `.gitignore` protection, and helper script installation.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: added context-section migration, raw `.gitignore` protection, and helper script installation.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/handoff-summary.md`: added structured Git Checkpoint fields to the template.
- `AGENTS.project-ops.snippet.md` and onboarding asset snippet: documented raw ignore protection and health-check usage.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: documented bootstrap upgrade behavior.
- `README.md`: documented raw ignore protection, health-check, release-check, and upgrade behavior.
- `.codex-context/*.md`: refreshed project state for this hardening pass.

## Read / Inspected
- `.codex/hooks/project-ops.mjs`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/`
- `README.md`
- `AGENTS.project-ops.snippet.md`
- `.codex-context/*.md`

## Raw Outputs
- Verification command outputs are summarized in `.codex-context/verification.md`; raw runtime observations are not committed.
