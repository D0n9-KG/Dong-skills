# Current State

## Objective
Audit Dong Skills for real-use drift, stale state, delayed records, compaction recovery confusion, and missing guardrails; repair verified gaps.

## Latest User Instruction
User asked to review the whole Dong Skills system again for practical usage problems: agents drifting, state records not updating in time, compaction or other events causing confusion, and important information being forgotten.

## Current Phase
verification / checkpoint

## Implemented
- `.codex/scripts/lib/templates.mjs` now gives new projects explicit `spec.md` `Approval Status` and `plan-progress.md` `Execution Approval` sections.
- Bootstrap asset templates under `.agents/skills/codex-codebase-onboarding/assets/project-ops/` were synchronized so newly updated projects receive the same state schema.
- `scripts/project-ops-health.mjs` now flags old projects whose `spec.md` or `plan-progress.md` lack those gate sections.
- `scripts/release-check.mjs` now scans active text assets for common mojibake/readability markers before publishing.
- `tests/project-ops.test.mjs` now covers bootstrapped template fields, health-check gate detection, singular `Goal` compatibility, and release-check readability failures.
- `docs/improvements/backlog.md` records this Dong Skills hardening item.

## Active Assumptions
- This task is a Dong Skills source-repo repair; existing target projects still need a project-level Dong Skills update/bootstrap to receive new hooks/scripts/templates.
- The PostToolUse matcher remains scoped to direct edit/write/apply_patch style tools in this pass. Shell/script/generated file changes are still caught at Stop/PreCompact, but may not force artifact-index refresh immediately after the tool call.
- The readability scan is heuristic; false positives should be handled by review or a narrow allow comment rather than disabling the scan.

## Blockers
- None.

## Verification Snapshot
- `node --test tests\project-ops.test.mjs`: pass, 28/28.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.

## Solution Memory Evaluation
- Outcome: drop.
- Reason: this is Dong Skills meta-learning and release/tooling hardening; it belongs in `docs/improvements/backlog.md`, not project `docs/solutions/` memory.

## Next Action
Run final verification after state refresh, then checkpoint the Dong Skills repair.

## Last Updated
2026-06-14 00:00 +08:00
