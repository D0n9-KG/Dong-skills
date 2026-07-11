# Worktree State

## Current Workspace
- Role: primary-checkout
- Path: current Git root
- Detection date: 2026-07-10

## Primary Checkout
- Path: same as current workspace
- Relationship: current workspace is the primary checkout; `.git` and Git common directory are both `.git`

## Branch State
- Branch: `main`
- Detached HEAD: no
- Base branch: `main`
- Current baseline: `9b6eb31`
- Upstream: `origin/main` at the same baseline before the current uncommitted hooks work

## Ownership And Cleanup
- Cleanup owner: none
- Cleanup rule: no linked worktree is active. Do not create, remove, merge, or discard a worktree during this task without a new explicit decision.

## Hook Root Notes
- Hook source root: current repository root
- Actual Git root: current repository root
- The outer 2026-07-10 task directory is not a Git repository and is not an authoritative source tree.

## Resume Instructions
- Preserve the current dirty worktree; it contains the approved hooks control-plane implementation and tests.
- Continue Task 5 release validation and second-round review, then rerun worktree detection before checkpoint, push, or cleanup.

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
