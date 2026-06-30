# Current State

## Objective
Add SkillOpt-Sleep as an offline, validation-gated self-evolution layer for Dong Skills, with `codex-skill-evolution` available as a global maintenance entry.

## Latest User Instruction
User asked to adjust the design so relatively global maintenance functionality is not only project-scoped.

## Current Phase
delivery

## Active Assumptions
- Dong Skills remains Codex-only.
- SkillOpt-Sleep is an offline/manual maintenance workflow, not a hook runtime.
- Existing `codex-learning-memory` and `codex-solution-memory` remain responsible for memory classification and project solution memory.
- SkillOpt-Sleep should stage proposals and require explicit review/adoption; `--auto-adopt` stays disallowed.
- Runtime `.skillopt-sleep/` artifacts and generated task drafts are private by default and must stay out of Git unless sanitized intentionally.
- `codex-skill-evolution` can be globally visible, but it must locate and operate on the real Dong Skills source repo rather than the current business project.

## Blockers
- None. `skillopt_sleep` is now available through a user-level `SKILLOPT_SLEEP_REPO` pointing to the local Microsoft SkillOpt checkout.

## Next Action
Checkpoint this source change when requested.

## Final Verification Snapshot
- Related tests passed: `node --test tests\project-ops.test.mjs --test-name-pattern "skill-evolution|Windows installer"` reports 59/59 pass.
- Full suite passed: `node --test tests\project-ops.test.mjs` reports 59/59 pass.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `node .codex\hooks\project-ops.mjs skill-evolution status`: pass and reports `SkillOpt-Sleep available: yes`.
- `git diff --check`: pass with CRLF normalization warnings only.
- `node scripts\release-check.mjs .`: pass after final state refresh.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows.ps1`: pass; global `codex-skill-evolution` is installed with marker scope `global-entry`.
- Stop gate status refresh: artifact index, verification, and handoff were refreshed after the final installer wording change; Git checkpoint is deferred by explicit handoff reason.
- Stop freshness fix: state freshness now compares against non-governance project changes while checkpoint review still sees the full dirty worktree; focused Stop regression tests and syntax checks passed.

## Last Updated
2026-06-30 22:14 +08:00
