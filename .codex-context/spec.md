# Spec

## Problem
Dong Skills has no explicit worktree governance. Codex App may run work inside managed worktrees while the UI still shows hook configuration from the primary checkout, which can confuse agents about which repository root, branch, hooks, and context files are authoritative.

## Goals
- Add a lightweight Dong Skills worktree governance skill adapted from Superpowers detect-and-defer principles.
- Detect primary checkout, linked worktree, Codex-managed worktree, Dong-managed fallback worktree, manual worktree, branch, detached HEAD, and cleanup ownership.
- Record recoverable worktree state in `.codex-context/worktree-state.md`.
- Include `worktree-state.md` in bootstrap templates, health checks, recovery order, README, AGENTS guidance, and state-file lists.
- Make hooks launch through a worktree-aware dispatcher so hook input `cwd` controls the actual project root when available.
- Add health output and tests that expose actual root, Git common dir, branch, role, and cleanup owner.
- Keep the flow lighter than Superpowers: do not force worktree creation, do not delete host-managed worktrees, and do not add a heavy mandatory branch-finishing menu.

## Non-Goals
- Do not replace Codex App native worktree behavior.
- Do not create or remove Codex App `.codex/worktrees/...` directories.
- Do not require every task to start in a worktree.
- Do not import the full Superpowers `using-git-worktrees` or `finishing-a-development-branch` workflow.
- Do not add global hooks.

## Approved Scope
Approved by user on 2026-06-12 after reviewing Superpowers worktree behavior and choosing an adapted Dong Skills implementation.

## User Decisions
- Keep Dong Skills lighter than Superpowers.
- Add explicit worktree governance as a main feature, not an optional module.
- Prefer detect-and-defer: detect existing isolation, defer to Codex App/native worktrees, and only describe git worktree fallback when no native workspace exists and user asks for isolation.

## Acceptance Criteria
- New `codex-worktree-governance` skill exists and is routed by `using-superpowers` and `codex-project-governance`.
- `.codex-context/worktree-state.md` is created by bootstrap and required by health checks.
- Recovery order reads `worktree-state.md` early enough to disambiguate primary checkout versus worktree.
- Hook commands launch through a worktree-aware wrapper or equivalent logic using hook input `cwd` when available.
- Health check reports worktree diagnostics and still fails on missing required state files or stale asset parity.
- Tests cover bootstrap creation, hook command encoding, recovery ordering, and worktree diagnostics.
- Global installed skills are synced.
- Tests, health check, and release check pass.
- Commit is pushed to GitHub.

## Open Questions
- None.
