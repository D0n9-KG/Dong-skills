# Artifact Index

## Created
- None.

## Modified
- `.codex/scripts/lib/templates.mjs`: adds `Approval Status`, `Candidate Options`, `Design`, and `Next Step` fields to `spec.md`; adds `Execution Approval` to `plan-progress.md`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`: synchronized bootstrap template copy.
- `scripts/project-ops-health.mjs`: checks active `.codex-context/spec.md` and `plan-progress.md` for required approval-gate sections, accepting both `Goal` and `Goals`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: synchronized bootstrap helper copy.
- `scripts/release-check.mjs`: adds text readability/mojibake scan for release assets.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`: synchronized bootstrap helper copy.
- `tests/project-ops.test.mjs`: adds tests for bootstrapped gate fields, health-check gate failures, singular `Goal` compatibility, and release-check readability failures.
- `docs/improvements/backlog.md`: records the state-template/readability hardening item.
- `.codex-context/current-state.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, `.codex-context/handoff-summary.md`, `.codex-context/decisions.md`, `.codex-context/risks.md`: refreshed for this audit and repair.

## Read / Inspected
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-review-panel/SKILL.md`
- `.agents/skills/codex-context-budget/SKILL.md`
- `.agents/skills/codex-asset-governance/SKILL.md`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/learning.mjs`
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `.codex-context/spec.md`
- `.codex-context/plan-progress.md`

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- `PostToolUse` still does not force immediate artifact-index refresh after shell/script/generated edits. Stop and PreCompact continue to catch stale state before stopping or compacting.
