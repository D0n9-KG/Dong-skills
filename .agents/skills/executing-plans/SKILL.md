---
name: executing-plans
description: Use when a written implementation plan exists and Codex should execute it task by task with checkpoints and verification.
---

# Executing Plans

Execute the plan without losing the thread. Keep progress, evidence, and next actions outside chat.

## Hard Gate

Do not execute a plan until `.codex-context/plan-progress.md` records one of these values under `## Execution Approval`:

- `Approved by user for Traditional task-by-task execution`
- `Approved by user for Codex Goal mode`
- `plan-then-execute requested` with `## Execution Mode` set to `Traditional task-by-task execution`

If execution approval is missing or pending, stop and ask the user whether to execute, revise the plan, or pause. Do not treat a written plan as permission to implement.

If `## Execution Mode` is missing, ambiguous, or set to Codex Goal mode without explicit user selection, stop and ask for the execution mode. Do not infer Codex Goal mode from "continue", "execute", "go ahead", or plan-then-execute.

Also stop if `.codex-context/spec.md` has no approved scope for the current task, unless the user explicitly skipped brainstorming or the task is a tiny mechanical edit.

## Execution Modes

### Traditional Task-By-Task Execution

Use this mode when the user approves normal execution, asks to plan-then-execute without naming Goal mode, or the environment does not provide a Codex Goal mechanism.

- Execute one planned task at a time.
- Keep exactly one active task in `.codex-context/plan-progress.md`.
- Verify each meaningful task before moving to the next.
- Update state files after each meaningful task or before any pause.
- Checkpoint after verified milestones, or record why checkpointing is deferred.

### Codex Goal Mode

Use this mode only when all conditions are true:

- `.codex-context/spec.md` records an approved written spec, or the user explicitly skipped brainstorming.
- `.codex-context/plan-progress.md` records an approved plan.
- The user explicitly selected `Codex Goal mode` for execution.
- The plan includes `Goal Mode Objective`, `Runtime Constraints`, `Checkpoint Cadence`, and `Stop Conditions`.
- The current Codex session exposes an actual goal mechanism, such as available `create_goal` and `update_goal` tools. If those tools are not available, Goal mode is unavailable; ask before falling back to Traditional mode.

Before launching Goal mode, write or refresh the Goal Objective from the plan. Include:

- the exact Codex goal mechanism to use in this session
- spec path
- plan path
- approved scope
- non-goals
- current task or starting step
- verification commands and expected success signals
- checkpoint cadence
- required state updates
- stop conditions

Launching Goal mode means creating one concrete Codex goal from this objective and then working inside that goal until it is complete or genuinely blocked. Do not simulate Goal mode by merely writing a heading in `plan-progress.md`.

Goal mode runtime constraints:

- Follow the approved plan tasks in order unless a blocker requires replanning.
- Keep `.codex-context/plan-progress.md`, `artifact-index.md`, `verification.md`, `current-state.md`, and `handoff-summary.md` current.
- Refresh `worktree-state.md` when branch/worktree state matters.
- Checkpoint after each meaningful verified milestone, or record a deferred reason in `handoff-summary.md`.
- Re-read `spec.md` and `plan-progress.md` at milestones and compare current work against acceptance criteria.
- Stop on ambiguity, repeated verification failure, scope change, destructive action, missing credentials, missing user decision, architecture conflict, or context/state contradiction.
- Do not silently expand scope beyond the approved spec.

## Process

1. Read `.codex-context/plan-progress.md` and any linked detailed plan.
2. Confirm execution approval, execution mode, and approved scope.
3. If this is a new/resumed worktree, hook source paths are confusing, or branch cleanup may be needed later, use `codex-worktree-governance` and refresh `.codex-context/worktree-state.md`.
4. Critique the plan before editing. Check for missing file paths, missing tests, vague steps, unapproved scope, impossible commands, and acceptance criteria with no task. If it has a blocking gap, stop and ask or revise the plan first.
5. Read and honor the plan's `Execution Mode`, `Goal Mode Objective`, `Runtime Constraints`, `Checkpoint Cadence`, and `Execution Note`. If any of these are missing for non-tiny work, derive the missing non-Goal constraints from the plan and record them before editing; if Goal mode details are missing, stop and ask.
6. Run Test Discovery before editing implementation files:
   - identify the closest existing unit/e2e/CLI/API tests for the touched area
   - identify the smallest command that proves the task
   - for behavior changes, decide whether to add/update a test before implementation or record why that is impractical
7. Mark exactly one task as active.
8. Implement the task using the repo's existing patterns.
9. For behavior-changing tasks, add/update the planned test or record the explicit reason no automated test was added.
10. Run the task's verification command or record why it cannot be run.
11. Update `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, `.codex-context/current-state.md`, and `.codex-context/worktree-state.md` when workspace state matters.
12. After a verified meaningful task, use `codex-git-checkpoint` to commit/push a checkpoint or record why the checkpoint is deferred.
13. Repeat until the plan is complete or a blocker is reached.

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

## Review And Shipping Gate

Before claiming the plan is complete:

- Re-read the spec, plan, and acceptance mapping.
- Confirm every task is checked off or has a recorded deferral.
- Confirm every acceptance criterion has verification evidence or an explicit gap.
- Use `requesting-code-review` or `codex-review-panel` for meaningful, high-risk, cross-file, API/security/migration/user-visible, or plan-completion work. If review is skipped, record the low-risk reason in `.codex-context/verification.md` or `handoff-summary.md`.
- Use `codex-worktree-governance` and `codex-git-checkpoint` before branch completion, PR, merge, discard, or long pause.

## Stop Conditions

Stop and surface the issue when:

- A plan instruction conflicts with current code reality.
- A verification fails twice for the same unresolved reason.
- A dependency, credential, environment, or user decision is missing.
- The workspace is detached HEAD or a host-managed worktree but the plan assumes a normal branch merge or cleanup.
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
