---
name: executing-plans
description: Use when a written implementation plan exists and Codex should execute it task by task with checkpoints and verification.
---

# Executing Plans

Execute the plan without losing the thread. Keep progress, evidence, and next actions outside chat.

## Hard Gate

Do not execute a plan until `.codex-context/plan-progress.md` records one of these values under `## Execution Approval`:

- `Approved by user`
- `plan-then-execute requested`

If execution approval is missing or pending, stop and ask the user whether to execute, revise the plan, or pause. Do not treat a written plan as permission to implement.

Also stop if `.codex-context/spec.md` has no approved scope for the current task, unless the user explicitly skipped brainstorming or the task is a tiny mechanical edit.

## Process

1. Read `.codex-context/plan-progress.md` and any linked detailed plan.
2. Confirm execution approval and approved scope.
3. Critique the plan before editing. If it has a blocking gap, stop and ask or revise the plan first.
4. Mark exactly one task as active.
5. Implement the task using the repo's existing patterns.
6. Run the task's verification command or record why it cannot be run.
7. Update `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, and `.codex-context/current-state.md`.
8. After a verified meaningful task, use `codex-git-checkpoint` to commit/push a checkpoint or record why the checkpoint is deferred.
9. Repeat until the plan is complete or a blocker is reached.

## Checkpoints

Use a checkpoint after each meaningful task:

```markdown
### Checkpoint
- Task completed:
- Files changed:
- Verification:
- Remaining risk:
- Next task:
```

If compaction risk is high, refresh `.codex-context/handoff-summary.md` before continuing.

## Stop Conditions

Stop and surface the issue when:

- A plan instruction conflicts with current code reality.
- A verification fails twice for the same unresolved reason.
- A dependency, credential, environment, or user decision is missing.
- The next step would delete data, rewrite history, force-push, or perform another destructive action without explicit approval.

## Completion

Before reporting completion:

- Use `verification-before-completion`.
- Use `codex-git-checkpoint` when meaningful changes should be archived before delivery.
- Re-read the spec and plan.
- Confirm all tasks and acceptance criteria are covered.
- Record verification evidence or explicit gaps.
- Refresh `.codex-context/handoff-summary.md`.

Do not claim completion from intent or partial checks.
