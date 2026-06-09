---
name: writing-plans
description: Use after a spec or clear requirements exist, before multi-step implementation, to create a verifiable execution plan.
---

# Writing Plans

Create a plan that a future Codex session can execute without relying on chat memory.

## Output Location

Update `.codex-context/plan-progress.md` for every plan. If the plan is large, also write it to `docs/codex/plans/YYYY-MM-DD-<feature>.md` and link that file from `.codex-context/plan-progress.md`.

## Plan Header

```markdown
# [Feature] Implementation Plan

**Goal:** [One sentence.]
**Spec:** [Path to spec or inline requirement.]
**Current Step:** [Exactly one active step or "Not started".]
**Verification:** [Commands or checks that prove success.]
```

## Checklist

1. Re-read the spec or requirements.
2. Map files to create, modify, inspect, and leave alone.
3. Break work into small tasks with explicit verification after risky steps.
4. Include exact commands and expected signals where known.
5. Record risks, assumptions, and rollback notes when changes are destructive or broad.
6. Update `.codex-context/artifact-index.md` with files that matter.
7. Review the plan for gaps before implementation.

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

## Standards

- Prefer unit or end-to-end tests that exercise real behavior. Do not add mock-only tests as proof.
- Do not require red-green test-first work unless the user asked for it or the codebase already uses that workflow.
- Do not require commits, branches, separate checkouts, or PRs unless the user asked for delivery through git.
- If a plan step would require broad refactoring, call that out before implementation.
- If the plan is larger than one session can safely hold, split it by milestone and write a handoff-ready checkpoint after each milestone.

## Self-Review

Before executing:

- Every acceptance criterion maps to at least one task.
- No placeholders remain.
- File paths are concrete.
- Verification is realistic for the local project.
- Risks and open questions are captured in `.codex-context/risks.md` and `.codex-context/open-questions.md`.

Then use `executing-plans`.
