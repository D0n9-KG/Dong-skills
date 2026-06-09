# Current State

## Objective
Align Dong Skills cross-session and post-compaction recovery constraints, then check for nearby governance omissions.

## Latest User Instruction
After confirming recovery-file constraints, fix the missing hook recovery order and check whether other parts are missing.

## Current Phase
delivery

## Active Assumptions
- Project-level hooks remain the default; global hooks stay out of scope.
- Post-compaction active recovery should include `.codex-context/solution-index.md`.
- `STRATEGY.md`, `CONCEPTS.md`, and full `docs/solutions/` bodies stay on-demand, not always-loaded context.
- Bootstrap asset drift should fail health/release checks because it affects new projects.

## Blockers
- None.

## Next Action
Push the amended checkpoint, verify remote, and report verified state.

## Last Updated
2026-06-10 01:18 +08:00
