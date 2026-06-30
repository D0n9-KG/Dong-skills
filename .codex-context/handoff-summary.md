# Handoff Summary

## Objective
Add SkillOpt-Sleep as an offline, validation-gated self-evolution workflow for Dong Skills, with `codex-skill-evolution` available as a global maintenance entry.

## Latest User Instruction
User asked to adjust relatively global maintenance functionality so it is globally visible instead of only project-scoped.

## Approved Scope / Spec
- Implement a conservative SkillOpt-Sleep integration for Dong Skills itself.
- Install `codex-skill-evolution` as a global entry skill as well as a project-level helper.
- Make `skill-evolution` operate on the real Dong Skills source repo, not the current business project by default.
- Keep existing memory modules; SkillOpt-Sleep augments skill evolution rather than replacing project memory.
- Do not run SkillOpt-Sleep from hooks and do not auto-adopt proposals.
- Keep runtime `.skillopt-sleep/` and raw task drafts ignored by default.

## Plan Status
- Execution mode: Traditional task-by-task execution.
- Implementation status: complete.
- Verification status: pass.
- Review status: self-review complete.
- Install sync status: pass.
- Checkpoint status: pending.

## Files Modified
- `.agents/skills/codex-skill-evolution/SKILL.md`
- `scripts/skill-evolution.mjs`
- `.codex/hooks/project-ops.mjs`
- `.codex/scripts/lib/events.mjs`
- `dong-skills.manifest.json`
- `scripts/install-windows.ps1`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/*`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `README.md`
- `docs/improvements/evolution-log.md`
- `licenses/SKILLOPT-LICENSE`
- `tests/project-ops.test.mjs`
- `.codex-context/*`

## Files Read But Not Changed
- Microsoft SkillOpt README, SkillOpt-Sleep README, Codex `skillopt-sleep` skill, and local SkillOpt-Sleep source files in a temporary inspection checkout.
- Existing Dong Skills learning, solution memory, governance, installer, bootstrap, health-check, release-check, and test files.

## Decisions Made
- SkillOpt-Sleep is an offline evolution layer for Dong Skills itself.
- `codex-skill-evolution` is a global maintenance entry because it is about maintaining Dong Skills, not business project workflow.
- Full workflow skills and all hooks remain project-level.
- The source-repo resolver uses CLI/env/global marker/current-parent candidates and rejects installed skill copies as source repos.
- `codex-learning-memory` and `codex-solution-memory` remain separate and are not replaced.
- The new wrapper stages proposals and requires review; `run` refuses unreviewed task files and `adopt` requires `--confirm-reviewed`.
- `.skillopt-sleep/` is treated as runtime/private by default.

## Open Questions And Assumptions
- No blocking open questions.
- Assumption: real Codex backend SkillOpt-Sleep runs require explicit budget approval and a reviewed/sanitized task file.

## Risks
- Real SkillOpt-Sleep Codex-backend optimization has not been exercised; only status, candidate collection, and mock dry-run surfaces have been validated.
- Generated task files may contain private material if created from transcripts; they require manual review before `"reviewed": true`.

## Verification Evidence
- `node --check scripts\skill-evolution.mjs`: pass.
- `node --check .codex\hooks\project-ops.mjs`: pass.
- `node scripts\skill-evolution.mjs . status`: pass.
- `node .codex\hooks\project-ops.mjs skill-evolution status`: pass; reports `SkillOpt-Sleep available: yes`.
- `node --test tests\project-ops.test.mjs`: pass, 59/59 tests.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass after the global-entry adjustment.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows.ps1`: pass; global `codex-skill-evolution` installed with marker scope `global-entry`.
- Final refresh after updating the global-entry marker wording in `scripts/install-windows.ps1`: health check, release check, and diff check passed.
- `node --test tests\project-ops.test.mjs --test-name-pattern "Stop freshness|Stop requires structured|Stop explains stale"`: pass.
- `node --check .codex\scripts\lib\events.mjs`, bootstrap mirror, and `tests\project-ops.test.mjs`: pass.

## Git Checkpoint
- Latest commit: not checked in this handoff.
- Push state: SkillOpt-Sleep/global-entry integration is not committed or pushed yet.
- Files included: pending.
- Files intentionally left uncommitted: current SkillOpt-Sleep/global-entry integration source changes, state refresh files, and ignored private raw SkillOpt task draft.
- Deferred reason: user asked for the implementation/design adjustment in this turn, not a commit; checkpoint should be created on explicit commit/push request.
- Next checkpoint: commit subject `feat(skills): add SkillOpt sleep evolution workflow`.

## Learned Instincts To Preserve
- Skill evolution is distinct from project memory: use backlog/outbox as candidates, SkillOpt-Sleep as offline evaluator, and explicit adoption for source changes.
- Hooks must remain deterministic and lightweight; no model-driven sleep cycle inside hooks.
- Global visibility is acceptable for Dong Skills maintenance entries, but execution must be source-repo targeted.
- Stop freshness should compare state files against non-governance project changes; checkpoint review can still inspect the full dirty worktree.

## Next Action
Checkpoint this source change.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/plan-progress.md`
4. `.codex-context/artifact-index.md`
5. `.codex-context/verification.md`
6. `.agents/skills/codex-skill-evolution/SKILL.md`
7. `scripts/skill-evolution.mjs`
8. `.codex/hooks/project-ops.mjs`
9. `tests/project-ops.test.mjs`
