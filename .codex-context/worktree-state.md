# Worktree State

## Current Workspace
- Role: primary-checkout
- Path: Dong Skills source repository root
- Detection date: 2026-06-12 19:14 +08:00

## Primary Checkout
- Path: current repository root
- Relationship: current workspace is the primary checkout

## Branch State
- Branch: main
- Detached HEAD: no
- Base branch: main

## Ownership And Cleanup
- Cleanup owner: none
- Cleanup rule: no linked worktree is active for this repository. Do not remove any worktree unless it is explicitly recorded as `dong-managed-worktree` and cleanup is user-approved.

## Hook Root Notes
- Hook source root: current repository root
- Actual Git root: current repository root
- Notes: new launcher dispatches hook events to the Git root resolved from hook input `cwd` when available.

## Resume Instructions
- Re-run `git rev-parse --show-toplevel`, `git rev-parse --git-dir`, `git rev-parse --git-common-dir`, and `git branch --show-current` before branch completion or cleanup.
- If resumed inside a Codex App worktree, load `codex-worktree-governance` and update this file before editing project files.
