# Plan Progress

## Active Plan
Introduce SkillOpt-Sleep as Dong Skills' offline skill self-evolution layer and expose `codex-skill-evolution` as a global maintenance entry.

## Spec Approval
User approved the SkillOpt-Sleep integration after discussing that it should evolve Dong Skills itself, not replace project memory or hook runtime behavior.

## Execution Approval
User approved implementation. Traditional task-by-task execution mode.

## Work Class / Risk Lane
Lane 2: new workflow skill, CLI wrapper, manifest/install/bootstrap/health/release/docs/test updates, with no live auto-adoption.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Keep Dong Skills Codex-only.
- Do not run SkillOpt-Sleep inside hooks.
- Do not enable `--auto-adopt`.
- Do not replace `codex-learning-memory` or `codex-solution-memory`.
- Keep generated `.skillopt-sleep/` staging and raw task drafts out of Git by default.
- Keep root files and onboarding bootstrap assets synchronized.
- Missing `skillopt_sleep` should be reported as a setup/status issue, not a Dong Skills runtime failure.
- Global `codex-skill-evolution` must locate the Dong Skills source repo and avoid writing SkillOpt staging into a business project by default.

## Checkpoint Cadence
- Commit and push after tests, health check, release check, state refresh, and Stop hook pass.

## Acceptance Mapping
- `codex-skill-evolution` -> documents offline SkillOpt-Sleep workflow, safety boundaries, and adoption rules.
- `skill-evolution.mjs` -> supports `status`, `collect-candidates`, `dry-run`, `run`, `inspect-stage`, and `adopt`.
- Router -> `node .codex/hooks/project-ops.mjs skill-evolution ...` dispatches to the wrapper.
- Installer/bootstrap -> project installs include the new skill and helper script.
- Split install -> global install includes onboarding, router, and `codex-skill-evolution`; complete workflow skills and hooks remain project-level.
- Source targeting -> `skill-evolution.mjs` resolves the Dong Skills source repo via CLI/env/global marker and can read a business project outbox without using the business project as the execution root.
- Safety -> `run` refuses unreviewed task files; `adopt` requires `--confirm-reviewed`; `.skillopt-sleep/` is ignored.
- Tests -> cover candidate collection, safety gates, router dispatch, and skill guidance.

## Test Scenarios
- `node --test tests\project-ops.test.mjs`.
- `node .codex\hooks\project-ops.mjs health-check`.
- `node scripts\release-check.mjs .`.
- `git diff --check`.

## Tasks
- [x] Add `codex-skill-evolution` skill.
- [x] Add `scripts/skill-evolution.mjs` wrapper.
- [x] Wire project hook dispatcher and manifest.
- [x] Wire installer/bootstrap/health/release/runtime ignore rules.
- [x] Update AGENTS/README/governance/router docs.
- [x] Add SkillOpt license attribution.
- [x] Add regression tests.
- [x] Run unit tests and health check.
- [x] Rerun release check after state refresh.
- [x] Install SkillOpt / SkillOpt-Sleep source and set `SKILLOPT_SLEEP_REPO`.
- [x] Make `codex-skill-evolution` a global maintenance entry.
- [x] Teach `skill-evolution.mjs` to target the real Dong Skills source repo from business projects.
- [ ] Run full verification after the global-entry adjustment.
- [ ] Sync local/project install if needed.

## Current Step
Full verification after global-entry adjustment.

## Verification
- `node --check scripts\skill-evolution.mjs`: pass.
- `node --check .codex\hooks\project-ops.mjs`: pass.
- `node scripts\skill-evolution.mjs . status`: pass; reports missing `skillopt_sleep` as setup diagnostic.
- `node .codex\hooks\project-ops.mjs skill-evolution status`: pass; dispatcher works.
- `node --test tests\project-ops.test.mjs`: pass, 58/58 tests.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass after state refresh.
- `node --test tests\project-ops.test.mjs --test-name-pattern "skill-evolution|Windows installer"`: pass, 59/59 tests.

## Out Of Scope
- Cross-platform installer support.
- Claude adapter support.
- Vendoring Microsoft SkillOpt source code into Dong Skills.
- Automatically scheduling nightly runs.
- Auto-adopting SkillOpt proposals.
- Using SkillOpt-Sleep for business project code or project memory.
