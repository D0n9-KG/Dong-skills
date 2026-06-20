# Plan Progress

## Active Plan
Deliver Dong Skills compaction-resilience plus split install governance.

## Spec Approval
Approved by user through iterative instructions; current written spec in `.codex-context/spec.md`.

## Execution Approval
User said to proceed and continue; Traditional task-by-task execution mode.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Do not install global hooks.
- Do not touch local non-Dong skills.
- Keep hooks deterministic and lightweight.
- Preserve discussion/investigation state without storing hidden reasoning or raw transcripts.
- Keep source and bootstrap asset copies synchronized.
- Verify privacy/readability before publishing.

## Checkpoint Cadence
- Commit after implementation, tests, health check, release check, diff check, state refresh, and Stop hook pass.
- Push after commit if remote is available.

## Acceptance Mapping
- Discussion/investigation survives compaction -> hook tests for UserPromptSubmit, PostToolUse, Stop, PreCompact, SessionStart recovery.
- Global minimal/project complete install -> installer/bootstrap tests.
- Non-Dong skills preserved -> same-name global preservation and project overwrite refusal tests.
- Old projects can be updated -> onboarding bootstrap installs project-level skills and marker.
- Published package is clean -> health/release/diff checks.

## Test Scenarios
- Happy path: install globally and into a target project; health check passes.
- Regression path: old global Dong heavy skills are removed when identifiable.
- Error path: same-name non-Dong project skill causes bootstrap refusal, not overwrite.
- Non-goal preservation: no global hooks, no model-in-hook summarization, no raw runtime artifact committed.

## Tasks
- [x] Add `working-notes.md`, discussion marker, recovery, Stop/PreCompact behavior, and tests.
- [x] Add split install manifest and project-level skill marker.
- [x] Update Windows installer and onboarding bootstrap.
- [x] Update router/onboarding/project governance docs and README.
- [x] Add health/release coverage for project marker, manifest parity, runtime ignore, privacy/readability.
- [x] Add tests for same-name non-Dong skill preservation/refusal.
- [x] Run verification suite.
- [ ] Commit and push verified batch.

## Current Step
Final checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 51/51 tests.
- `node scripts\project-ops-health.mjs .`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.

## Out Of Scope
- Cross-platform installer.
- Claude Code adapter.
- Manual validation in every old project.
