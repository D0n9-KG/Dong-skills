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
- The current chat contains explicit approval of the presented design/spec.
- The user gave clear requirements and explicitly asked to skip brainstorming.
- The work is a tiny mechanical edit that does not need a multi-step plan.

If the task is behavior-changing or multi-file and no approved spec exists, return to `brainstorming`.

## Output Location

Always update `.codex-context/plan-progress.md`.

If the plan is larger than a compact checklist, also write it to `docs/codex/plans/YYYY-MM-DD-<topic>.md` and link it from `.codex-context/plan-progress.md`.

## Plan Requirements

1. Re-read the approved spec or clear requirements.
2. Map files to inspect, create, modify, and leave alone.
3. Identify module boundaries and decomposition before tasks.
4. Break work into small tasks with explicit verification after risky steps.
5. Include exact commands and expected success signals where known.
6. Record risks, assumptions, rollback notes, and open questions.
7. Update `.codex-context/artifact-index.md` with files that matter.
8. Review the plan for gaps before offering execution.

## Plan Header

```markdown
# [Feature] Implementation Plan

**Goal:** [One sentence.]
**Spec:** [Path to approved spec or inline requirement.]
**Spec Approval:** [Approved by user / skipped by user / mechanical exception.]
**Current Step:** Not started.
**Verification:** [Commands or checks that prove success.]
**Execution Approval:** Pending user choice.
```

## Task Shape

Use checkbox tasks so progress survives compaction:

```markdown
## Tasks

- [ ] Task 1: [specific outcome]
  - Files: `path/to/file`
  - Steps: [small concrete actions]
  - Verify: `[command]` or [manual check]
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
- No placeholders remain.
- File paths are concrete enough to start.
- Verification is realistic for the local project.
- Risks and open questions are captured in `.codex-context/risks.md` and `.codex-context/open-questions.md`.
- `.codex-context/plan-progress.md` names exactly one `Current Step`.

## Execution Handoff

After saving the plan, ask for execution approval unless the user already explicitly said to plan and then execute without waiting.

Use this shape:

```text
Plan written to <path>.

Execution choices:
1. Execute now with `executing-plans`.
2. Revise the plan first.
3. Pause here.

Which do you want?
```

Only proceed to `executing-plans` after user approval or an explicit earlier instruction to plan-then-execute.
