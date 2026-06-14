# Plan Progress

## Active Plan
- Goal: harden Dong Skills workflow so non-trivial work must pass written spec approval, written planning, explicit execution-mode approval, and constrained execution.
- Spec: `.codex-context/spec.md`

## Spec Approval
Approved by user instruction on 2026-06-14.

## Execution Approval
User asked to patch the workflow; proceeding as Traditional task-by-task execution for this Dong Skills source edit.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task. New Goal mode support is documented for future project execution only.

If selected in a future task, the objective must include spec path, plan path, approved scope, non-goals, current step, verification commands, checkpoint cadence, required state updates, and stop conditions.

## Runtime Constraints
- Follow the approved plan and keep scope limited to workflow skill/template/test/docs hardening.
- Keep `plan-progress.md`, `artifact-index.md`, `verification.md`, `current-state.md`, and `handoff-summary.md` current.
- Stop if the external reference or Codex Goal mode behavior is unclear in a way that changes implementation.
- Do not silently add new hooks or automatic Goal mode behavior beyond the approved scope.

## Checkpoint Cadence
- One checkpoint after final verification because this is one coherent cross-file workflow hardening change.
- Record any deferred checkpoint reason in `handoff-summary.md`.

## Tasks
- [x] Task 1: Compare local workflow gaps against upstream Superpowers behavior.
  - Evidence: upstream written-spec gate behavior was checked; local gaps identified in `brainstorming`, `writing-plans`, and `executing-plans`.
- [x] Task 2: Fix `brainstorming` written-spec gate.
  - Evidence: `brainstorming/SKILL.md` now uses `Pending written-spec approval` and only marks Approved after written-spec user approval.
- [x] Task 3: Add execution mode planning.
  - Evidence: `writing-plans/SKILL.md` now requires execution mode, Goal objective draft, runtime constraints, and checkpoint cadence.
- [x] Task 4: Add Traditional vs Codex Goal mode execution governance.
  - Evidence: `executing-plans/SKILL.md` now has execution-mode rules, Goal mode objective requirements, runtime constraints, and stop conditions.
- [x] Task 5: Sync router, lifecycle, AGENTS snippets, templates, health checks, README, and bootstrap assets.
  - Evidence: modified `using-superpowers`, `codex-project-governance`, AGENTS snippets, README, templates, seed context files, and health checks.
- [x] Task 6: Add regression coverage.
  - Evidence: `tests/project-ops.test.mjs` covers written-spec gate, execution modes, bootstrap sections, and health-check failures.
- [x] Task 7: Final verification.
  - Evidence: Node tests, release check, asset governance, learning-status, context-budget, and diff whitespace checks passed or recorded advisory.

## Current Step
Git checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 28/28.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.
- `node scripts\project-ops-health.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, no pending observations/outbox items.
- `node .codex\hooks\project-ops.mjs context-budget`: pass/advisory, ~50,846 tokens across 54 files.

## Out Of Scope
- No new runtime hooks for Goal mode.
- No automatic use of Codex Goal mode.
- No target-project or global installed-copy update in this pass.
