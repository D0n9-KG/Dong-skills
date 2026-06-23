# Plan Progress

## Active Plan
Optimize Dong Skills governance around truth hierarchy, risk lanes, What-not-How specs, reduced freshness churn, clearer hook diagnostics, and a more accurate context-budget model.

## Spec Approval
Approved by user in the current Dong Skills optimization discussion on 2026-06-23.

## Execution Approval
User approved implementation. Traditional task-by-task execution mode.

## Work Class / Risk Lane
Lane 2: multi-file skill, hook, template, and test changes with user-facing workflow impact.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Keep Dong Skills Codex-only.
- Do not add global hooks.
- Preserve non-Dong local skills.
- Keep hooks deterministic and lightweight.
- Do not weaken verification for code/config/script changes.
- Keep root files and onboarding bootstrap assets synchronized.

## Checkpoint Cadence
- Commit and push after tests, health check, release check, state refresh, and Stop hook pass.

## Acceptance Mapping
- Truth hierarchy / work lanes -> skill docs, templates, health schema, and regression tests.
- What-not-How spec discipline -> brainstorming/spec template tests.
- Freshness churn reduction -> Stop hook tests for docs-only vs code changes.
- Hook diagnostics -> status output and checkpoint diagnostic tests.
- Context footprint governance -> hot/warm/cold budget report and release-check hot-path threshold.
- Bootstrap parity -> health check and release check.

## Test Scenarios
- `node --test tests\project-ops.test.mjs`.
- `node .codex\hooks\project-ops.mjs health-check`.
- `node scripts\release-check.mjs .`.
- `git diff --check`.

## Tasks
- [x] Add truth hierarchy and work-lane guidance to router, governance, brainstorming, planning, and execution skills.
- [x] Add required spec/plan template sections and health-check schema.
- [x] Adjust Stop hook verification/checkpoint requirement by phase and changed-file type.
- [x] Add clearer hook event/status output.
- [x] Update current project state files for the new spec/plan sections.
- [x] Synchronize bootstrap asset copies.
- [x] Add and pass regression tests.
- [x] Run final health/release checks.
- [x] Add hot/warm/cold context-budget reporting and release-check thresholding.
- [ ] Commit and push.

## Current Step
Final checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 53/53 tests.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.
- `node .codex\hooks\project-ops.mjs context-budget`: pass with hot budget ok.

## Out Of Scope
- Cross-platform installer support.
- Claude adapter support.
- Manual refresh of downstream projects in this turn.
