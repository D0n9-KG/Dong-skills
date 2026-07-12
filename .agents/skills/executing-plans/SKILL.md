---
name: executing-plans
description: Use when a written implementation plan exists and Codex should execute it task by task with checkpoints and verification.
---

# Executing Plans

Execute the plan without losing the thread. Keep progress, evidence, and next actions outside chat.

## Hard Gate

Do not execute a plan until `.codex-context/plan-progress.md` records one of these values under `## 执行审批` or legacy `## Execution Approval`:

- `Approved by user for Traditional task-by-task execution`
- `Approved by user for Codex Goal mode`
- `plan-then-execute requested` with `## 执行模式` or `## Execution Mode` set to `Traditional task-by-task execution`

If execution approval is missing or pending, stop and ask the user whether to execute, revise the plan, or pause. Do not treat a written plan as permission to implement.

If `## 执行模式` / `## Execution Mode` is missing, ambiguous, or set to Codex Goal mode without explicit user selection, stop and ask for the execution mode. Do not infer Codex Goal mode from "continue", "execute", "go ahead", or plan-then-execute.

Also stop if `.codex-context/spec.md` has no approved scope for the current task, unless the user explicitly skipped brainstorming or the task is a tiny mechanical edit.

Confirm the plan's artifact readiness before execution. `requirements-only` means return to `writing-plans`; only `implementation-ready` plans may execute. Legacy plans without an Artifact Readiness field may proceed only after the executor confirms that the Product Contract, Planning Contract, Verification Contract, Definition of Done, and launch-blocking questions are fully resolved and records that assessment.

Treat approved `spec.md` and `plan-progress.md` content as immutable execution inputs. A normal workflow context hash refresh records current recovery state; it does not authorize changed scope or plan content. If the spec must change, run `brainstorming-start` and reapprove the written spec. If only the implementation plan must change, run `plan-start`, refresh the plan, and obtain fresh execution approval.

When workflow state is available, run this before editing implementation files:

```powershell
node .codex/hooks/project-ops.mjs workflow-state check execution
```

If the check fails, repair the state or ask for the missing decision before editing.

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
- The plan's `Loop Review` says `Approved after codex-loop-design-check`, and workflow state has `loop_review_status: approved`.
- The current Codex session exposes an actual goal or workflow mechanism that can record the objective, expose progress, and be explicitly closed as complete or blocked. This may be dedicated goal tools, a model-native workflow runner, or an equivalent surfaced orchestration mechanism. If no such mechanism is exposed, Goal mode is unavailable; ask before falling back to Traditional mode.

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

Run `codex-loop-design-check` before Goal approval. After it passes, record the result in the plan and run:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition loop-review-approved
```

Only then may `execution-approved-goal` succeed.

Launching Goal mode means creating or activating one concrete, visible Codex goal/workflow from this objective and then working inside that mechanism until it is complete or genuinely blocked. Do not simulate Goal mode by merely writing a heading in `plan-progress.md` or narrating an internal loop.

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
5. Read and honor the plan's `工作类别 / 风险等级`, `执行模式`, `Goal 模式目标`, `运行约束`, `存档节奏`, and `执行备注` sections, or their legacy English equivalents. If any of these are missing for non-tiny work, derive the missing non-Goal constraints from the plan and record them before editing; if Goal mode details are missing, stop and ask.
6. Run the Simplicity Gate before adding code, dependencies, abstractions, scripts, docs, or state files:
   - can the approved outcome be reached by avoiding the new thing?
   - does the needed helper, type, validator, workflow, or pattern already exist in the codebase?
   - does the standard library already do it?
   - does the native platform already do it?
   If the plan omitted the gate, record the decision in `.codex-context/plan-progress.md` before editing. Do not add one-line/minimum-implementation checks as mandatory Dong Skills rungs.
   If the task touches package/module boundaries, confirm the plan's public entry point/private internals note before editing. Do not introduce unauthorized deep imports, accidental public APIs, or barrel files that hide ownership.
7. Match execution depth to the lane without weakening acceptance criteria:
   - Lane 0/1 may use compact state updates and targeted verification.
   - Lane 2/3 must keep task-by-task evidence, review triggers, rollback notes, and checkpoint cadence current.
8. Run Test Discovery before editing implementation files:
   - identify the closest existing unit/e2e/CLI/API tests for the touched area
   - identify the smallest command that proves the task
   - for behavior changes, decide whether to add/update a test before implementation or record why that is impractical
   - ensure expected values come from an independent source of truth; reject tautological tests that recompute the assertion with the implementation's own algorithm
   - check every applicable scenario category: happy path, edge cases, error paths, and integration
   - when the change touches callbacks, middleware, observers, and event handlers, trace at least two levels from the changed entrypoint and identify retries, fallbacks, persistence, and sibling interfaces
   - use real-object integration coverage for the interacting layers; mocks may supplement unit tests but must not be the only proof of the chain
9. Mark exactly one task as active.
10. Implement the task using the repo's existing patterns.
11. If taking a deliberate simplification with a known ceiling, mark it with a `dong-debt:` comment that names the ceiling and the revisit trigger.
12. For behavior-changing tasks, add/update the planned test or record the explicit reason no automated test was added.
13. Run the task's verification command or record why it cannot be run.
    - If the command exposes an unexpected bug or regression while planned work remains, update `working-notes.md`, run `workflow-state transition debugging-start`, and use `systematic-debugging`. After the focused reproduction passes, run `workflow-state transition debugging-resolved` and resume the same active task. Do not use `execution-complete` to escape an execution-time debugging detour.
    - If the latest user instruction changes scope, requirements, goals, acceptance criteria, or priority, stop project mutations, run `workflow-state transition brainstorming-start`, and refresh/reapprove the spec and plan. A bare continuation, status question, or learning-only preference does not reopen scope.
14. Update `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, `.codex-context/current-state.md`, and `.codex-context/worktree-state.md` at meaningful task/phase checkpoints, before compaction or pause, and before delivery. Do not interrupt every read, test, or small edit to rewrite all state files.
15. After a verified meaningful task, use `codex-git-checkpoint` to commit/push a checkpoint or record why the checkpoint is deferred.
16. Repeat until the plan is complete or a blocker is reached.
17. When implementation tasks are complete and verification is next, run `node .codex/hooks/project-ops.mjs workflow-state transition execution-complete`.

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
- For meaningful code or architecture changes, run `codex-simplicity-review` or include an equivalent Simplicity lens in `codex-review-panel`.
- Use `requesting-code-review` or `codex-review-panel` for meaningful, high-risk, cross-file, API/security/migration/user-visible, or plan-completion work. If review is skipped, record the low-risk reason in `.codex-context/verification.md` or `handoff-summary.md`.
- Use `codex-worktree-governance` and `codex-git-checkpoint` before branch completion, PR, merge, discard, or long pause.

## Stop Conditions

Stop and surface the issue when:

- A plan instruction conflicts with current code reality.
- A verification fails twice for the same unresolved reason.
- A dependency, credential, environment, or user decision is missing.
- The workspace is detached HEAD or a host-managed worktree but the plan assumes a normal branch merge or cleanup.
- The next step would delete data, rewrite history, force-push, or perform another destructive action without explicit approval.

When the stop condition is an external blocker and no workflow decision is already pending, update `current-state.md` and `handoff-summary.md`, then run `node .codex/hooks/project-ops.mjs workflow-state transition blocked`. After the user explicitly chooses to continue and the matching decision receipt exists, run `node .codex/hooks/project-ops.mjs workflow-state transition resume` before editing again. Do not leave the workflow in `execution` while reporting that it is blocked.

## Completion

Before reporting completion:

- Use `verification-before-completion`.
- Use `codex-git-checkpoint` when meaningful changes should be archived before delivery.
- Re-read the spec and plan.
- Confirm all tasks and acceptance criteria are covered.
- Record verification evidence or explicit gaps.
- Refresh `.codex-context/handoff-summary.md`.

Do not claim completion from intent or partial checks.
