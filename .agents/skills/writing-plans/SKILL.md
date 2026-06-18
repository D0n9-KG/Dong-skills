---
name: writing-plans
description: MUST use after an approved spec or clear requirements exist, before touching code for any multi-step implementation, refactor, migration, workflow, API, UX, or architecture change. Creates a verifiable written plan, updates `.codex-context/plan-progress.md`, and asks for execution approval unless the user explicitly requested plan-then-execute.
---

# Writing Plans

Create a plan that a future Codex session can execute without relying on chat memory. This is the bridge between approved intent and implementation.

## Hard Gate

Do not implement while writing the plan.

Before planning, confirm one of these is true:

- `.codex-context/spec.md` has `Approval Status: Approved by user` for the current task.
- The current chat contains explicit approval of the written spec file or inline written spec.
- The user gave clear requirements and explicitly asked to skip brainstorming.
- The work is a tiny mechanical edit that does not need a multi-step plan.

If the task is behavior-changing or multi-file and no approved spec exists, return to `brainstorming`.

When workflow state is available, run this before drafting the plan:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition plan-start
```

## Output Location

Always update `.codex-context/plan-progress.md`.

If the plan is larger than a compact checklist, also write it to `docs/codex/plans/YYYY-MM-DD-<topic>.md` and link it from `.codex-context/plan-progress.md`.

## Scope Check

Before writing tasks, check whether the approved spec covers multiple independent subsystems or loosely related goals. If it does, split it into separate plans or stop and ask the user to choose the first slice. A plan should produce working, testable software on its own.

Do not hide decomposition problems inside a long checklist. If the plan depends on unapproved architecture, data model, UX, or API decisions, return to `brainstorming`.

## File Structure

Before defining tasks, map files and responsibilities:

- Files to create, modify, test, document, and explicitly leave alone.
- Ownership boundaries and interfaces between modules.
- Existing patterns to follow.
- Any large-file or flat-directory risk that should be addressed in the plan.

Prefer focused files with clear responsibilities. In an existing codebase, do not restructure unrelated areas just because the upstream Superpowers plan style prefers smaller files; include a split only when it reduces real risk for the approved change.

## Test-First Default

For bug fixes, behavior changes, API changes, migrations, and user-visible workflow changes, the plan defaults to test-first or characterization-first work:

- First capture the current failing behavior or current contract with a unit/e2e/CLI/API test when practical.
- If a failing automated test is impractical, write the exact manual reproduction and the verification gap.
- Do not plan implementation-only behavior changes without either test coverage or a recorded reason.

## Simplicity Gate

Before choosing an implementation path, run this gate and record the result in the plan's `Runtime Constraints`, `Execution Note`, or task notes:

1. **Can this be avoided?** If the approved outcome can be reached by deleting, configuring, documenting, or doing nothing, plan that instead of new code.
2. **Does the standard library already do it?** Prefer language/runtime standard library behavior over custom code.
3. **Does the native platform already do it?** Prefer browser, OS, database, framework, shell, or built-in service features over dependencies or custom abstractions.

The gate is a constraint, not a research project. If a higher rung clearly works, use it and move on. Do not add the Ponytail one-line/minimum-implementation rungs to the mandatory Dong Skills gate unless the user explicitly asks for them.

## Plan Requirements

1. Re-read the approved spec or clear requirements.
2. Map files to inspect, create, modify, and leave alone.
3. Identify module boundaries and decomposition before tasks.
4. Apply the Simplicity Gate: avoid building, standard library, native platform.
5. Map every acceptance criterion to at least one task and one verification step.
6. Break work into bite-sized tasks. Prefer 2-5 minute steps for risky code changes: write/adjust test, run expected failure, implement minimal change, run expected pass, update docs/state, checkpoint.
7. Include exact commands and expected success signals where known.
8. Include test scenarios: happy path, edge/error path, regression path, and any explicit non-goal that must remain unchanged.
9. Include an `Execution Mode` section with two choices: `Traditional task-by-task execution` and `Codex Goal mode`.
10. Include a `Goal Mode Objective Draft` even when Goal mode is not selected yet. It must be safe to copy into Codex Goal mode only after explicit user selection.
11. State that Codex Goal mode requires a real goal mechanism in the current Codex session, such as available `create_goal` and `update_goal` tools. If that mechanism is absent, Goal mode is not selectable.
12. Include `Runtime Constraints` and `Checkpoint Cadence` so long-running execution cannot drift away from the spec.
13. Include an `Execution Note` for implementers: files that must be read first, constraints that must not be violated, test commands to prefer, rollback notes, and the Simplicity Gate decision.
14. Record risks, assumptions, rollback notes, and open questions.
15. Update `.codex-context/artifact-index.md` with files that matter.
16. Review the plan for gaps before offering execution.
17. When the plan is ready but execution is not yet approved, run `node .codex/hooks/project-ops.mjs workflow-state transition plan-ready`.

## Plan Header

```markdown
# [Feature] Implementation Plan

**Goal:** [One sentence.]
**Spec:** [Path to approved spec or inline requirement.]
**Spec Approval:** [Approved by user / skipped by user / mechanical exception.]
**Execution Mode:** Pending user choice.
**Current Step:** Not started.
**Verification:** [Commands or checks that prove success.]
**Execution Approval:** Pending user choice and execution mode.
```

Include these sections in the plan when the work is not tiny:

```markdown
## Execution Mode
- Pending user choice.
- Option A: Traditional task-by-task execution.
- Option B: Codex Goal mode.
- Do not infer Codex Goal mode from vague "continue", "execute", or plan-then-execute language.

## Goal Mode Objective Draft
Use only if the user explicitly selects Codex Goal mode.
- Goal mechanism available in this session:
- Objective:
- Spec path:
- Plan path:
- Approved scope:
- Non-goals:
- Current step:
- Verification commands:
- Checkpoint cadence:
- Required state updates:
- Stop conditions:

Goal mode is unavailable if the current Codex session does not expose an actual goal mechanism. Do not treat this draft as permission to simulate Goal mode manually.

## Runtime Constraints
- Follow the approved plan tasks in order unless a blocker requires replanning.
- Keep `.codex-context/plan-progress.md`, `artifact-index.md`, `verification.md`, `current-state.md`, and `handoff-summary.md` current.
- Stop on ambiguity, failed verification loops, scope changes, destructive actions, missing credentials, missing user decisions, or architecture conflicts.
- Do not silently expand scope beyond the approved spec.
- Apply the Simplicity Gate before adding code, dependencies, abstractions, scripts, docs, or state files: can avoid building; standard library; native platform.
- Re-read the spec and plan at milestones and compare progress against acceptance criteria.

## Checkpoint Cadence
- Checkpoint after each meaningful verified task or milestone.
- If a checkpoint is deferred, record the reason and next checkpoint in `handoff-summary.md`.

## Acceptance Mapping
- [Criterion] -> Task N -> Verification command/action.

## Test Scenarios
- Happy path:
- Regression path:
- Error/edge path:
- Non-goal preservation:

## Execution Note
- Read first:
- Do not touch:
- Simplicity Gate:
- Test-first / characterization-first requirement:
- Preferred verification:
- Rollback:
```

## Task Shape

Use checkbox tasks so progress survives compaction:

```markdown
## Tasks

- [ ] Task 1: [specific outcome]
  - Files: `path/to/file`
  - Steps: [small concrete actions, preferably test -> expected fail -> implementation -> expected pass]
  - Verify: `[command]` or [manual check]
  - Checkpoint: commit/checkpoint after verification, or record why deferred
  - Evidence: [fill in after running]
```

## No Placeholder Plans

Do not leave vague plan items such as:

- "Handle edge cases"
- "Add tests"
- "Implement validation"
- "Clean up later"
- "Similar to previous task"
- `TODO`, `TBD`, or missing file paths

Replace them with concrete checks, files, commands, or a recorded blocker.

## Self-Review

Before offering execution:

- Every acceptance criterion maps to at least one task.
- Every behavior-changing task has test-first/characterization-first coverage or a recorded reason.
- The plan includes `Test Scenarios` and `Execution Note` when the work is not tiny.
- No placeholders remain.
- File paths are concrete enough to start.
- Verification is realistic for the local project.
- Risks and open questions are captured in `.codex-context/risks.md` and `.codex-context/open-questions.md`.
- `.codex-context/plan-progress.md` names exactly one `Current Step`.
- `.codex-context/plan-progress.md` records `Execution Mode`, `Goal Mode Objective`, `Runtime Constraints`, and `Checkpoint Cadence`.
- The Simplicity Gate result is recorded for any new code, dependency, abstraction, script, doc, or state asset.
- Codex Goal mode is presented as an explicit user choice, not the default.

## Execution Handoff

After saving the plan, ask for execution approval unless the user already explicitly said to plan and then execute without waiting.

Use this shape:

```text
Plan written to <path>.

Execution choices:
1. Execute now with `executing-plans` in Traditional task-by-task execution mode.
2. Execute now with `executing-plans` in Codex Goal mode.
3. Revise the plan first.
4. Pause here.

Which do you want?
```

Only proceed to `executing-plans` after user approval or an explicit earlier instruction to plan-then-execute. If the user previously asked to plan-then-execute but did not explicitly choose Codex Goal mode, record `Execution Mode: Traditional task-by-task execution`.

After the user chooses execution mode, update workflow state before executing:

- Traditional task-by-task execution: `node .codex/hooks/project-ops.mjs workflow-state transition execution-approved-traditional`
- Codex Goal mode: `node .codex/hooks/project-ops.mjs workflow-state transition execution-approved-goal`
