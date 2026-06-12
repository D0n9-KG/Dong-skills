---
name: codex-worktree-governance
description: Detect and govern Git worktree state for Dong Skills. Use when starting execution, entering or resuming a Codex App worktree, seeing hook source/root confusion, preparing branch completion, checkpointing, cleaning up, or deciding whether work should happen in the primary checkout, a Codex-managed worktree, a Dong-managed fallback worktree, or a manual worktree.
---

# Codex Worktree Governance

Use this as a lightweight detect-and-defer layer. The goal is to know which workspace is authoritative, not to force a heavy worktree workflow.

## Core Rules

- Detect state before creating, merging, pushing, or cleaning anything.
- Defer to Codex App or other host-managed worktrees. Do not remove them.
- Do not create a nested worktree when already inside a linked worktree.
- Record durable state in `.codex-context/worktree-state.md` whenever work spans phases, branches, or sessions.
- Treat hook UI paths as hook registration sources, not proof of the actual Git root. The actual root comes from shell cwd or hook input `cwd`.

## Detect

Run these read-only commands from the current workspace:

```powershell
$root = git rev-parse --show-toplevel
$gitDir = git rev-parse --git-dir
$gitCommon = git rev-parse --git-common-dir
$branch = git branch --show-current
$super = git rev-parse --show-superproject-working-tree 2>$null
```

Interpretation:

- If `show-superproject-working-tree` returns a path, you are in a submodule. Do not classify it as a worktree.
- If normalized `git-dir` differs from normalized `git-common-dir`, you are in a linked worktree.
- If branch is empty, the workspace is detached HEAD. Do not offer local merge as if a normal branch exists.
- Paths under `.codex/worktrees/` or `.codex\worktrees\` are host-managed by Codex App.
- Paths under `.worktrees/` or `worktrees/` may be Dong-managed only if Dong Skills created them or project guidance says so.
- Other linked worktrees are manual or host-managed unless provenance is recorded.

## Role Labels

Use one of these in `.codex-context/worktree-state.md`:

- `primary-checkout`: normal repo checkout; no linked worktree.
- `codex-managed-worktree`: linked worktree under a Codex App worktree path.
- `dong-managed-worktree`: linked worktree created by Dong Skills fallback.
- `manual-worktree`: linked worktree created by the user or another tool.
- `submodule`: Git submodule; do not apply worktree cleanup rules.
- `unknown`: detection failed; record command output and avoid cleanup.

## Start Or Resume Work

1. Detect role and branch state.
2. Update `.codex-context/worktree-state.md`.
3. If already in a linked worktree, continue there and do not create another one.
4. If in the primary checkout and the task is risky, multi-branch, or user asks for isolation, ask whether to use an isolated worktree.
5. Prefer host/native worktree controls when available. Use manual `git worktree add` only when no native control exists and the user approved isolation.
6. After entering or creating a workspace, rerun onboarding or health checks if project hooks/context may be missing.

## Finish Work

Before final delivery, checkpoint, merge, PR, or cleanup:

1. Run verification or record the gap in `verification.md`.
2. Detect current role again; do not rely on old state.
3. Use `codex-git-checkpoint` for commit/push discipline.
4. For `codex-managed-worktree`, leave workspace cleanup to Codex App.
5. For `dong-managed-worktree`, remove it only after merge/discard succeeds and only from the primary checkout, never from inside the worktree being removed.
6. For `manual-worktree`, ask before cleanup.
7. For detached HEAD, create/push a branch or leave clear handoff instructions; do not claim a normal branch merge is ready.

## State File

Keep `.codex-context/worktree-state.md` compact. Required sections:

- `Current Workspace`
- `Primary Checkout`
- `Branch State`
- `Ownership And Cleanup`
- `Hook Root Notes`
- `Resume Instructions`

Refresh it when:

- starting or resuming a project session
- entering a worktree
- branch or detached HEAD state changes
- hooks show a source path different from the current Git root
- preparing checkpoint, PR, merge, discard, or cleanup

## Red Flags

Stop and clarify before continuing if:

- hook UI source root and actual Git root disagree and `.codex-context/worktree-state.md` is missing or stale
- the next action would remove a worktree not marked `dong-managed-worktree`
- the workspace is detached HEAD but the plan assumes a named branch
- the current directory is a submodule but cleanup logic treats it as a worktree
- baseline or verification failures make it impossible to tell whether bugs are pre-existing
