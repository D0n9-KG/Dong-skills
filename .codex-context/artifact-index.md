# Artifact Index

## Created
- None.

## Modified
- `.agents/skills/brainstorming/SKILL.md`: strengthens option comparison for directional or behavior-changing brainstorming while preserving the existing continuation loop and Living Spec behavior.
- `.agents/skills/writing-plans/SKILL.md`: restores upstream-style scope check, file-structure mapping, test-first default, acceptance mapping, test scenarios, execution notes, 2-5 minute step guidance, and checkpoint notes.
- `.agents/skills/systematic-debugging/SKILL.md`: makes reliable reproduction the gate before implementation fixes.
- `.agents/skills/executing-plans/SKILL.md`: adds plan critique, Execution Note handling, Test Discovery, behavior-change test expectations, and review/shipping gate.
- `.agents/skills/requesting-code-review/SKILL.md`: adds mandatory review triggers and skip-recording requirements.
- `.agents/skills/codex-review-panel/SKILL.md`: adds mandatory panel triggers for high-risk, cross-file, user-visible, API/security/migration, and verification-gap work.
- `.agents/skills/codex-worktree-governance/SKILL.md`: adds a fixed branch finishing menu adapted from Superpowers while preserving Codex-managed worktree ownership.
- `.agents/skills/codex-git-checkpoint/SKILL.md`: links checkpoint discipline to the worktree finishing menu.
- `.agents/skills/codex-solution-memory/SKILL.md`: adds explicit save/update/absorb/drop evaluation after non-trivial verified reusable work.
- `tests/project-ops.test.mjs`: adds regression checks for the restored gates.
- `docs/improvements/backlog.md`: records the Dong Skills meta-learning item as done.
- `.codex-context/spec.md`, `.codex-context/plan-progress.md`, `.codex-context/current-state.md`, `.codex-context/verification.md`, `.codex-context/handoff-summary.md`, `.codex-context/decisions.md`: refreshed for this task.

## Read / Inspected
- Current Dong Skills source skills listed above.
- Installed skill copies under `%USERPROFILE%\.agents\skills` via hash checks.
- Local Superpowers originals: `writing-plans`, `executing-plans`, `systematic-debugging`, `requesting-code-review`, `finishing-a-development-branch`.
- Local ECC `continuous-learning-v2` reference for learning-memory boundaries.

## Raw Outputs
- No raw outputs added.

## Global Install
- `scripts/install-windows.ps1 -TargetProjectRoot .` synced global skill copies to `%USERPROFILE%\.agents\skills`.
- Changed installed `SKILL.md` files match source hashes.
