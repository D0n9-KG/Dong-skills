---
name: brainstorming
description: Use before ambiguous, creative, behavior-changing, or multi-file work to turn user intent into an approved spec before implementation.
---

# Brainstorming

Use this skill to prevent drift before implementation. The goal is not a long ritual; the goal is a shared, recoverable spec.

## Gate

Do not start implementation while the objective, scope, acceptance criteria, or constraints are unclear.

For a small mechanical change with clear acceptance criteria, keep the brainstorm compact: state assumptions, update `.codex-context/spec.md`, and proceed. For behavior-changing or multi-step work, get explicit user approval before editing code.

## Checklist

1. Read project context: `AGENTS.md`, `.codex-context/current-state.md`, `.codex-context/project-map.md`, relevant files, and recent changes.
2. State the objective in one sentence.
3. Identify constraints, non-goals, risks, and success criteria.
4. Ask one clarifying question at a time only when the answer changes implementation.
5. Present 2-3 approaches when meaningful, with trade-offs and a recommendation.
6. Write the approved result to `.codex-context/spec.md`; use `docs/codex/specs/YYYY-MM-DD-<topic>.md` only when the spec is too large for the state file.
7. Review the spec for placeholders, contradictions, ambiguity, and scope creep.
8. Update `.codex-context/current-state.md` and `.codex-context/open-questions.md`.
9. Move to `writing-plans` for multi-step implementation.

## Spec Shape

Use this structure unless the project already has a better one:

```markdown
# Spec

## Problem
[What the user wants solved.]

## Goals
- [Observable outcome.]

## Non-Goals
- [Explicitly out of scope.]

## Approved Scope
- [What will be changed.]

## Acceptance Criteria
- [How we know it works.]

## Open Questions
- [Question or "None".]
```

## Design Principles

- Keep scope small enough for one implementation plan. If the request contains independent subsystems, split it and start with the first valuable slice.
- Follow existing codebase patterns unless there is a specific reason to change them.
- Prefer fewer moving parts, but do not hide real complexity.
- Record decisions in `.codex-context/decisions.md` when they affect future work.
- User instructions override this workflow.

## Self-Review

Before leaving brainstorming, verify:

- No `TODO`, `TBD`, or placeholder requirements remain.
- The spec says what will not be done.
- Acceptance criteria are observable.
- Open questions are either resolved or explicitly marked as blockers.
- The next action is recorded in `.codex-context/current-state.md`.
