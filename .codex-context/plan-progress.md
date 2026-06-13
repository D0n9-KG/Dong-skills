# Dong Skills State/Recovery Hardening Plan

## Active Plan
- Goal: audit Dong Skills for remaining practical drift/recovery/state-record risks and repair verified gaps.
- Spec: `.codex-context/spec.md`

## Spec Approval
Approved by user instruction on 2026-06-14.

## Execution Approval
User asked for the audit; verified low-risk fixes were implemented directly as part of the audit.

## Tasks
- [x] Task 1: Inspect governance skills, hooks, templates, tests, and release tooling for state/recovery drift risks.
  - Evidence: reviewed project governance, review panel, context budget, asset governance, templates, events, learning, health check, release check, hooks, tests, and state files.
- [x] Task 2: Patch confirmed template/schema gap.
  - Evidence: `spec.md` template now includes `Approval Status`; `plan-progress.md` template now includes `Execution Approval`; bootstrap asset copy synchronized.
- [x] Task 3: Patch confirmed health-check gap.
  - Evidence: `project-ops-health.mjs` now reports missing spec/plan gate sections while accepting both `Goal` and `Goals`; bootstrap asset copy synchronized.
- [x] Task 4: Patch confirmed release-check gap.
  - Evidence: `release-check.mjs` now runs a text readability/mojibake scan over active release assets; bootstrap asset copy synchronized.
- [x] Task 5: Add regression coverage and backlog record.
  - Evidence: `tests/project-ops.test.mjs` covers the new checks; `docs/improvements/backlog.md` records the hardening item.
- [ ] Task 6: Final verification and checkpoint.
  - Evidence pending after state refresh.

## Current Step
Final verification and Git checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 28/28.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.

## Risks
- PostToolUse immediate freshness enforcement is still limited to edit/write/apply_patch-style tools.
- Existing target projects need a Dong Skills update/bootstrap to receive these changes.

## Out Of Scope
- Do not update target projects or global installed copies in this pass unless explicitly requested.
- Do not broaden PostToolUse to shell/script tools without a separate trade-off decision.
