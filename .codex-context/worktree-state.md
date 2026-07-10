# Worktree State

## Current Workspace
- Role: primary-checkout
- Path: Dong Skills source repository root
- Detection date: 2026-06-13 21:45 +08:00

## Primary Checkout
- Path: current repository root
- Relationship: current workspace is the primary checkout

## Branch State
- Branch: main
- Detached HEAD: no
- Base branch: main
- Current commit before this fix checkpoint: 84c0503

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

## 当前工作区
- Role: unknown
- Path: 尚未检测
- Detection date: 尚未检测


## 主检出区
- Path: 尚未检测
- Relationship: 尚未检测


## 分支状态
- Branch: 尚未检测
- Detached HEAD: 尚未检测
- Base branch: 尚未检测


## 所有权与清理
- Cleanup owner: unknown
- Cleanup rule: 除非明确记录为 `dong-managed-worktree` 且用户批准清理，否则不要删除任何 worktree。


## Hook 根目录记录
- Hook source root: 尚未检测
- Actual Git root: 尚未检测
- Notes: 如果 Codex UI 显示的 hooks 来源 checkout 与当前 Git root 不同，更新这里。


## 恢复指令
- 分支完成或清理前，重新运行 `git rev-parse --show-toplevel`、`git rev-parse --git-dir`、`git rev-parse --git-common-dir` 和 `git branch --show-current`。
- 如果 session 从 Codex App worktree 恢复，编辑项目文件前先更新本文件。
