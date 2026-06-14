# Plan Progress

## Active Plan
- Goal: fix validated external review findings for Dong Skills while keeping scope to Codex-only support.
- Spec: inline user approval in current chat plus `.codex-context/current-state.md`.

## Spec Approval
Approved by user instruction on 2026-06-14.

## Execution Approval
User asked to fix the validated items; proceeding as Traditional task-by-task execution.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

Goal mode remains documented for future tasks only. It now requires a real Codex goal mechanism exposed in the current session, such as `create_goal` and `update_goal`, plus an approved plan objective and stop conditions.

## Runtime Constraints
- Keep the release Codex-only; do not add Claude Code adapter files or cross-platform installers in this pass.
- Fix only validated review items or low-risk adjacent consistency gaps found while implementing them.
- Sync root hook/runtime files with bootstrap asset copies.
- Add regression tests for behavior changes.
- Update state files and backlog before final verification.

## Checkpoint Cadence
- One checkpoint after tests, release checks, state refresh, and diff review pass.

## Tasks
- [x] Task 1: Evaluate external review feedback against current repo and official Claude Code docs.
  - Evidence: invalid/out-of-scope items were excluded; accepted items scoped to Codex-only fixes.
- [x] Task 2: Fix deleted-file freshness logic.
  - Evidence: `latestChangedMtime()` now uses nearest existing ancestor mtime; regression test added.
- [x] Task 3: Fix `session-history` root parsing.
  - Evidence: CLI now uses `parseRootArg()` / `parseExtraArgs()`; regression test added.
- [x] Task 4: Fix skill documentation defects.
  - Evidence: systematic-debugging typo fixed; evidence capture and Goal mode wording tightened.
- [x] Task 5: Sync templates and bootstrap assets.
  - Evidence: root and bootstrap copies updated; bootstrap test checks Goal mode mechanism text.
- [x] Task 6: Run targeted tests.
  - Evidence: `node --test tests\project-ops.test.mjs` passed, 30/30.
- [x] Task 7: Run release/health verification.
  - Evidence: release-check, health-check, asset-governance, diff whitespace, learning-status, and context-budget passed or recorded advisory.
- [x] Task 8: Refresh handoff and checkpoint.
  - Evidence: checkpoint commit prepared with clear message; push verification remains the final external archive check.

## Current Step
Push and verify remote branch.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 30/30.
- `node scripts\release-check.mjs .`: pass.
- `node scripts\project-ops-health.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, no pending observations/outbox items.
- `node .codex\hooks\project-ops.mjs context-budget`: pass/advisory, ~51,524 tokens across 54 files.

## Out Of Scope
- Claude Code adapter, `.claude` layout, `CLAUDE.md` shim, or Claude hook conversion.
- macOS/Linux/cross-platform installer.
- Top-level legal license selection.
