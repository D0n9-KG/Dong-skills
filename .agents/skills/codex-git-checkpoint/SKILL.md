---
name: codex-git-checkpoint
description: Git and GitHub checkpoint discipline for Codex project work. Use before long pauses, compaction, final delivery, branch switches, risky changes, or whenever meaningful verified work should be archived with a clear commit and optional push.
---

# Codex Git Checkpoint

Use this skill to keep long-running work archived without mixing unrelated changes or producing vague commits.

## Trigger

Use this skill when any of these are true:

- A plan task, phase, bug fix, review pass, or project setup milestone is verified.
- Work has accumulated across multiple files, a large diff, or a long session.
- Before compaction, final response, branch switch, risky refactor, dependency change, or destructive operation.
- The user asks to commit, push, publish, archive, checkpoint, save work, or upload to GitHub.
- A hook reports uncommitted changes, unpushed commits, or missing Git Checkpoint notes.

Do not wait until the entire project is finished if a coherent verified checkpoint already exists.

## Rules

- A commit is an archive checkpoint, not proof that the task is complete.
- Never stage unrelated user changes silently.
- Never use `git add -A` unless the whole worktree is confirmed in scope.
- Never commit generated secrets, raw observations, logs, backups, local paths, or private runtime data.
- Never rewrite history, force-push, delete branches, or reset work without explicit user approval.
- Never remove host-managed worktrees such as Codex App `.codex/worktrees/...`; use `codex-worktree-governance` to confirm cleanup ownership first.
- Do not push to a protected or shared branch when the safer path is a feature branch or draft PR.
- If the work is not ready to commit, write the reason and next checkpoint in `handoff-summary.md` under `Git 存档` or `Git Checkpoint`.

## Workflow

1. Inspect repository state:
   - `git status -sb`
   - `git branch --show-current`
   - `git rev-parse --show-toplevel`
   - `git rev-parse --git-dir`
   - `git rev-parse --git-common-dir`
   - `git remote -v`
   - `git log --oneline -5`
   - check upstream/ahead state when relevant: `git status -sb` usually shows it.
2. Inspect the diff before staging:
   - `git diff --stat`
   - `git diff`
   - if staged changes already exist, also inspect `git diff --cached`.
3. Decide scope:
   - Include only files created or modified for the current verified checkpoint.
   - If unrelated changes exist, stage explicit file paths only.
   - If scope is mixed and cannot be separated safely, ask the user before committing.
4. Refresh project state before committing:
   - `artifact-index.md`: files changed and why they matter.
   - `verification.md`: fresh command evidence or explicit gap.
   - `worktree-state.md`: current workspace role, branch state, and cleanup owner when worktree state matters.
   - `workflow-state.yaml`: phase, next skill, and checkpoint status.
   - `handoff-summary.md`: current state, next action, and `Git 存档`.
   - Before staging, run `workflow-state status` or `health-check` if state changed; repair contradictions between `workflow-state.yaml`, `spec.md`, and `plan-progress.md`.
5. Stage intentionally:
   - Prefer `git add -- path1 path2 ...`.
   - Use `git add -A` only after verifying every changed file belongs in scope.
6. Re-check staged content:
   - `git diff --cached --stat`
   - `git diff --cached`
7. Commit with a clear message.
8. Push when appropriate:
   - If the user asked for GitHub archive/push, push after a successful commit.
   - If no upstream exists, use `git push -u origin <branch>`.
   - If pushing to the default branch is risky, create or use a feature branch unless the user explicitly wants direct push.
9. Verify archive state:
   - `git status -sb`
   - `git log --oneline -3`
   - `git ls-remote origin refs/heads/<branch>` after pushing when remote confirmation matters.
10. Report branch, commit SHA, pushed remote, verification run, and any excluded files or remaining dirty changes.

## Commit Message Standard

Prefer Conventional Commit shape when it fits the repository:

```text
type(scope): concise summary

What changed:
- ...

Why:
- ...

Verification:
- ...
```

Use common types such as `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, or `ci`.

For small private checkpoints, a plain imperative subject is acceptable, but it still must be specific.

Good subjects:

- `feat(skills): add Git checkpoint discipline`
- `docs(readme): document project-level hook bootstrap`
- `chore(release): refresh Dong Skills handoff state`

Bad subjects:

- `update`
- `misc changes`
- `fix stuff`
- `checkpoint`

For multi-file, behavior-changing, risky, or public commits, include a body that explains:

- what changed
- why it changed
- verification evidence
- any risks, exclusions, or follow-up work

## Git Checkpoint Handoff Section

Before compaction, long pauses, or final delivery, keep this section meaningful:

```markdown
## Git 存档
- 最新提交:
- 推送状态:
- 已包含文件:
- 有意保留未提交的文件:
- 暂缓原因:
- 下次存档:
```

If work is ready and committed, record the commit and push state.
If work is not ready to commit, record the reason instead of pretending the archive is clean.

When workflow state is available, run `workflow-state transition checkpoint-done` after a successful checkpoint, or `workflow-state transition checkpoint-deferred` after recording a deferred reason.

`workflow-state transition checkpoint-ready` is only the final delivery-to-handoff transition after verification and review are complete. Do not use it for execution-phase milestone commits; milestone checkpoints record `checkpoint-done` or `checkpoint-deferred` without changing the active phase.

For final delivery, complete the state sequence instead of leaving the project in `handoff`: run `checkpoint-ready`, perform or intentionally defer the final checkpoint, record `checkpoint-done` or `checkpoint-deferred`, then run `node .codex/hooks/project-ops.mjs workflow-state transition delivery-complete`. `delivery-complete` is valid only after verification, review, and checkpoint evidence satisfy the workflow validator.

## Checkpoint Finalize Tail

After a real commit, do not create an endless "commit changed handoff, then handoff changed because commit changed" loop.

Use this rule:

- First refresh active state files, verification, artifact index, workflow state, and handoff.
- Then commit the coherent checkpoint.
- After the commit, update `handoff-summary.md -> Git 存档` with the commit/push state if needed.
- If the only remaining dirty files are governance/context files and `Git 存档` is fresh and structured, this is an accepted checkpoint-finalize tail. Do not force another commit solely to archive that final note unless the user requests a perfectly clean worktree.
- If any source, docs, tests, generated evidence, or non-context files changed after the checkpoint, make a new scoped checkpoint or record a deferred reason.

## GitHub Publish Boundary

This skill covers checkpoint commit and optional push. If the user asks for a full GitHub publish flow with PR creation, use the GitHub plugin skill `github:yeet` after this checkpoint discipline has confirmed scope, commit quality, and verification evidence.

## Branch Completion Boundary

When the user wants to finish a branch, do not replace `codex-worktree-governance` with an ad hoc git sequence. Use this skill for commit/push discipline, then use `codex-worktree-governance` for the fixed finishing menu:

1. Merge locally into the base branch.
2. Push and create or prepare a PR.
3. Keep the branch/worktree as-is.
4. Discard this work.

Before presenting or executing those options, verify current branch/worktree state, dirty files, upstream/ahead state, and latest verification evidence. Discard requires explicit typed confirmation. Host-managed worktrees such as Codex App worktrees are not cleaned up by this skill.
