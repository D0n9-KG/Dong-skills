# Current State

## Objective
Restore necessary upstream workflow gates in Dong Skills after comparing borrowed skills with their original Superpowers/ECC/CE behaviors.

## Latest User Instruction
User said "修复吧" after asking to compare borrowed skills with originals and fix places where useful original behavior was over-lightened.

## Current Phase
verification / checkpoint

## Implemented
- `brainstorming` now defaults to comparing 2-3 approaches for directional, architecture, API, UX, data-model, workflow, product, or behavior-changing work unless the change is mechanical or the user skips comparison.
- `writing-plans` now requires scope check, file-structure mapping, test-first/characterization-first defaults, acceptance mapping, test scenarios, execution notes, 2-5 minute step guidance, and checkpoint notes.
- `systematic-debugging` now makes reliable reproduction the gate before implementation fixes.
- `executing-plans` now requires plan critique, Execution Note handling, Test Discovery, test update or recorded reason for behavior changes, and review/shipping gate before completion.
- `requesting-code-review` and `codex-review-panel` now have mandatory review triggers and require a recorded low-risk reason when skipped.
- `codex-worktree-governance` and `codex-git-checkpoint` now include a Superpowers-inspired finishing menu adapted for Codex-managed worktrees.
- `codex-solution-memory` now requires an explicit save/update/absorb/drop evaluation after non-trivial verified reusable work.
- `tests/project-ops.test.mjs` now guards these restored gates.
- Global installed skill copies were synced from source and hash-checked.
- `docs/improvements/backlog.md` records this as Dong Skills meta-learning.

## Active Assumptions
- This task is a Dong Skills source-repo repair, not a target-project bootstrap update.
- The restored gates are instruction-level constraints. They rely on agents loading the relevant skill.
- Heavy upstream-only flows such as mandatory subagents, visual companion, and destructive cleanup automation remain intentionally out of scope.

## Blockers
- None.

## Verification Snapshot
- `node --test tests\project-ops.test.mjs`: pass, 25/25.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows.ps1 -TargetProjectRoot .`: pass.
- changed skill hash check against `%USERPROFILE%\.agents\skills`: pass.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass after fixing the spec heading/template issue.
- `codex-review-panel` review: pass, no actionable findings.

## Solution Memory Evaluation
- Outcome: drop.
- Reason: this is Dong Skills meta-learning, recorded in `docs/improvements/backlog.md`; it should not become project `docs/solutions/` memory.

## Next Action
Run final verification after state refresh, then commit and push the checkpoint.

## Last Updated
2026-06-13 23:46 +08:00
