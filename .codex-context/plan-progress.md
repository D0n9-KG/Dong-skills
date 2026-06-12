# Worktree Governance Implementation Plan

**Goal:** Add lightweight, Codex-aware worktree governance to Dong Skills.
**Spec:** `.codex-context/spec.md`
**Spec Approval:** Approved by user
**Current Step:** Checkpoint and push.
**Verification:** `node --test tests\project-ops.test.mjs`, `node .codex/hooks/project-ops.mjs health-check`, `node scripts\release-check.mjs .`, global install parity checks.
**Execution Approval:** Approved by user

## Tasks

- [x] Task 1: Add worktree state template and skill.
  - Files: `.agents/skills/codex-worktree-governance/SKILL.md`, `.codex-context/worktree-state.md`, `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/worktree-state.md`
  - Steps: create concise worktree governance instructions, define state-file schema, and explain cleanup ownership.
  - Verify: `rg -n "codex-worktree-governance|worktree-state" .agents .codex-context`
  - Evidence: `codex-worktree-governance`, root `worktree-state.md`, and bootstrap `worktree-state.md` were added.

- [x] Task 2: Route worktree governance through main Dong Skills docs.
  - Files: `.agents/skills/using-superpowers/SKILL.md`, `.agents/skills/codex-project-governance/SKILL.md`, `.agents/skills/executing-plans/SKILL.md`, `.agents/skills/codex-git-checkpoint/SKILL.md`, `AGENTS.project-ops.snippet.md`, `README.md`
  - Steps: add worktree governance to skill maps, execution gates, checkpoint rules, recovery order, and user-facing docs.
  - Verify: `rg -n "codex-worktree-governance|worktree-state|worktree" README.md AGENTS.project-ops.snippet.md .agents/skills`
  - Evidence: routing added to using-superpowers, project governance, executing plans, git checkpoint, onboarding, AGENTS snippet, and README.

- [x] Task 3: Make hooks and diagnostics worktree-aware.
  - Files: `.codex/hooks.json`, `.codex/hooks/project-ops.mjs`, `.codex/scripts/lib/*.mjs`, `scripts/project-ops-health.mjs`
  - Steps: resolve actual root from hook input `cwd`, add worktree detection helpers, include worktree state in recovery, and report diagnostics in health output.
  - Verify: targeted hook and health tests.
  - Evidence: `launch-project-ops.mjs` dispatches by hook input `cwd`; health reports role, branch, Git dirs, linked worktree state, submodule state, and cleanup owner.

- [x] Task 4: Update bootstrap assets and tests.
  - Files: `.agents/skills/codex-codebase-onboarding/assets/project-ops/**`, `tests/project-ops.test.mjs`
  - Steps: keep root/assets parity, update expected recovery order, assert `worktree-state.md` bootstrap and health behavior, and assert hook command wrapper encoding.
  - Verify: `node --test tests\project-ops.test.mjs`
  - Evidence: `node --test tests\project-ops.test.mjs` passed 16/16 tests.

- [x] Task 5: Sync global install, verify release, checkpoint, and push.
  - Files: global `.agents/skills/*` installed copies, `.codex-context/*.md`
  - Steps: run install script or targeted sync, run health/release checks, inspect diff, commit with clear message, push to origin.
  - Verify: `git status -sb`, `git log --oneline -3`, `git ls-remote origin refs/heads/main`
  - Evidence: global changed skill directories match source by SHA-256; `node .codex\hooks\project-ops.mjs health-check` and `node scripts\release-check.mjs .` passed. Commit and push are the active checkpoint step.

## Risks
- Hook command changes can break all hook events if quoting or stdin handling is wrong, especially on Windows.
- Worktree detection must not misclassify submodules as linked worktrees.
- Health output should report diagnostics without failing merely because the project is in a worktree.
- Release privacy scan must not flag example paths or local user paths.

## Rollback
- Revert hook launcher changes first if hook invocation fails.
- Keep the new skill/doc additions independent so they can remain even if launcher changes need revision.
