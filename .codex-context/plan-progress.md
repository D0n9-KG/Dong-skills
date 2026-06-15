# Plan Progress

## Active Plan
- Goal: add a Comet-inspired, Codex-only workflow state machine to Dong Skills.
- Spec: `.codex-context/spec.md`.

## Spec Approval
Approved by user instruction on 2026-06-15.

## Execution Approval
User said to continue and absorb Comet's useful ideas; proceeding as Traditional task-by-task execution.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Keep Dong Skills Codex-only.
- Do not import OpenSpec/Comet wholesale.
- Do not add global hooks or cross-platform installer work.
- Preserve existing `.codex-context` state model and project-level hooks.
- Add tests for every new runtime/bootstrap contract.
- Keep bootstrap asset copies synchronized with root runtime files.

## Checkpoint Cadence
- One checkpoint after tests, health check, release check, state refresh, and diff review pass.

## Tasks
- [x] Task 1: Identify Comet ideas worth adapting.
  - Evidence: selected state interface, transition/check/next/recover/hash, and decision-point semantics; rejected OpenSpec layout import.
- [x] Task 2: Add workflow state runtime and CLI.
  - Evidence: `.codex/scripts/lib/workflow.mjs` and `scripts/workflow-state.mjs` added.
- [x] Task 3: Integrate workflow state with hooks, templates, recovery, health, and bootstrap.
  - Evidence: `project-ops.mjs`, `templates.mjs`, `events.mjs`, `recovery.mjs`, `project-ops-health.mjs`, installers, and asset copies updated.
- [x] Task 4: Update workflow skill instructions.
  - Evidence: router/governance/brainstorming/planning/execution/verification/review/checkpoint/onboarding guidance updated.
- [x] Task 5: Update docs, backlog, and license attribution.
  - Evidence: README, `docs/improvements/backlog.md`, AGENTS snippets, and `licenses/COMET-LICENSE` updated.
- [x] Task 6: Add and run regression tests.
  - Evidence: `node --test tests\project-ops.test.mjs` passed, 33/33.
- [x] Task 7: Run release verification.
  - Evidence: health check, diff whitespace check, and release check passed.
- [x] Task 8: Refresh state and checkpoint.
  - Evidence: state files refreshed; checkpoint commit/push remains.

## Current Step
Commit and push checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 33/33.
- `node scripts\project-ops-health.mjs .`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass.

## Out Of Scope
- OpenSpec directories and archive flow.
- Claude Code adapter.
- macOS/Linux/cross-platform installer.
- Global hooks.
- Per-edit workflow-state freshness blocking.
