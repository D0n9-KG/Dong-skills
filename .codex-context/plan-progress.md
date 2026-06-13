# Dong Skills Upstream-Parity Gate Repair Plan

## Active Plan
- Goal: restore necessary upstream Superpowers/ECC/CE workflow constraints that were weakened by Dong Skills lightening, without importing heavy upstream-only machinery.
- Spec: `.codex-context/spec.md`

## Spec Approval
Approved by user instruction: "修复吧".

## Execution Approval
plan-then-execute requested by user.

## Tasks
- [x] Task 1: Strengthen borrowed workflow skills.
  - Files: `.agents/skills/brainstorming/SKILL.md`, `.agents/skills/writing-plans/SKILL.md`, `.agents/skills/systematic-debugging/SKILL.md`, `.agents/skills/executing-plans/SKILL.md`, `.agents/skills/requesting-code-review/SKILL.md`, `.agents/skills/codex-review-panel/SKILL.md`, `.agents/skills/codex-worktree-governance/SKILL.md`, `.agents/skills/codex-git-checkpoint/SKILL.md`, `.agents/skills/codex-solution-memory/SKILL.md`
  - Steps: add explicit gates for option comparison, test-first planning, reproduction-before-fix, test discovery before implementation, mandatory review triggers, branch-finishing menu, and solution-memory evaluation.
  - Verify: text regression test in `tests/project-ops.test.mjs`.
  - Evidence: required gates were added to borrowed workflow skill docs.
- [x] Task 2: Add regression coverage.
  - Files: `tests/project-ops.test.mjs`
  - Steps: assert the required sections and key phrases remain present in the borrowed workflow skills.
  - Verify: `node --test tests\project-ops.test.mjs`.
  - Evidence: `node --test tests\project-ops.test.mjs` passed 25/25 with new gate checks.
- [x] Task 3: Record Dong Skills meta-learning.
  - Files: `docs/improvements/backlog.md`
  - Steps: add a done item explaining why these upstream-parity gates were restored.
  - Verify: included in release check and diff review.
  - Evidence: `docs/improvements/backlog.md` has the done item `Restore Required Upstream Workflow Gates`.
- [x] Task 4: Sync installation, verify, and checkpoint.
  - Files: global skills under `%USERPROFILE%\.agents\skills`, `.codex-context/*.md`
  - Steps: run installer, release checks, asset governance, diff check, then commit and push.
  - Verify: `node scripts\release-check.mjs .`, `node .codex\hooks\project-ops.mjs asset-governance`, `git diff --check`, global hash spot checks.
  - Evidence: global install sync completed; final release check, tests, asset governance, hash check, and diff check passed. Git checkpoint is the remaining action.

## Current Step
Final Git checkpoint.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 25/25.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows.ps1 -TargetProjectRoot .`: pass; global skill copies synced.
- changed skill hash check: pass; global installed copies match source for all changed skill files.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass after fixing `spec.md` template heading.

## Risks
- This is instruction-level behavior. It improves compliance only when the relevant skill is loaded.
- Over-tightening could make Dong Skills feel as heavy as upstream; changes should preserve gates, not upstream-only subagent/visual-companion requirements.

## Out Of Scope
- Do not restore Superpowers visual companion, forced subagent dispatch, or automatic branch cleanup.
- Do not add new runtime hooks for these instruction-only gates in this pass.
