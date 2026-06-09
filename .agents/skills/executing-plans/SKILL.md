---
name: executing-plans
description: Use when a written implementation plan exists and Codex should execute it task by task with checkpoints and verification.
---

# Executing Plans

Execute the plan without losing the thread. Keep progress, evidence, and next actions outside chat.

## Process

1. Read `.codex-context/plan-progress.md` and any linked detailed plan.
2. Critique the plan before editing. If it has a blocking gap, stop and ask or revise the plan first.
3. Mark exactly one task as active.
4. Implement the task using the repo's existing patterns.
5. Run the task's verification command or record why it cannot be run.
6. Update `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, and `.codex-context/current-state.md`.
7. Repeat until the plan is complete or a blocker is reached.

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
- Re-read the spec and plan.
- Confirm all tasks and acceptance criteria are covered.
- Record verification evidence or explicit gaps.
- Refresh `.codex-context/handoff-summary.md`.

Do not claim completion from intent or partial checks.
