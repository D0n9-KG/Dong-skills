---
name: brainstorming
description: MUST use before ambiguous, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work. Turns user intent into a discussed, explicit, user-approved spec before implementation; do not edit code until the design/spec is approved unless the user explicitly skips brainstorming or the change is a tiny mechanical edit with clear acceptance criteria.
---

# Brainstorming

Use this skill to turn intent into an approved spec through collaborative discussion. Keep it lighter than upstream Superpowers, but keep the phase boundary hard: no implementation before approval.

## Hard Gate

Do not implement, scaffold, edit code, change configuration, or invoke implementation skills until one of these is true:

- The user explicitly approves the presented design/spec in the current chat.
- `.codex-context/spec.md` records `Approval Status: Approved by user` for the current task.
- The user explicitly says to skip brainstorming and proceed.
- The task is a tiny mechanical edit with clear acceptance criteria and no design choice.

Read-only discovery is allowed before approval. If you are unsure whether a request is mechanical, treat it as brainstorming.

## What Good Brainstorming Does

- Understand the real problem, not just the first requested implementation.
- Expose constraints, non-goals, risks, acceptance criteria, and open questions.
- Explore alternatives before committing to one path.
- Produce a written spec that survives compaction and new sessions.
- Hand off to `writing-plans` for multi-step implementation.

## Process

1. **Discover context.** Read `AGENTS.md`, `.codex-context/current-state.md`, `.codex-context/project-map.md`, relevant docs/code, and recent changes. Do not read the whole repo.
2. **Restate the objective.** One sentence, including the user-visible outcome.
3. **Clarify.** Ask one important question at a time when the answer changes scope, UX, architecture, data model, API, verification, or delivery. Prefer 2-3 concrete choices when useful.
4. **Explore options.** Present 2-3 approaches when there is a real choice. Include trade-offs and a recommendation.
5. **Present the design.** Scale detail to complexity. Cover only relevant sections: behavior, boundaries, files/modules, data flow, UX/API, error handling, migration, verification, non-goals.
6. **Ask for approval.** Ask the user to approve or request changes. Do not treat silence, vague acknowledgement, or a question as approval.
7. **Write the spec.** After approval, update `.codex-context/spec.md`. Use `docs/codex/specs/YYYY-MM-DD-<topic>.md` only when the spec is too large for the state file, then link it from `spec.md`.
8. **Self-review the spec.** Remove placeholders, contradictions, hidden scope creep, and ambiguous requirements.
9. **Update state.** Update `.codex-context/current-state.md` and `.codex-context/open-questions.md`.
10. **Transition.** For multi-step work, use `writing-plans` next. Do not jump from brainstorming directly to implementation unless the approved spec is tiny and mechanical.

## Spec Shape

Use this structure unless the project already has a stronger one:

```markdown
# Spec

## Problem
[What the user wants solved and why.]

## Goal
- [Observable outcome.]

## Approval Status
Approved by user on [date/time or "Not approved yet"].

## User Decisions
- [Decision, trade-off, and source.]

## Non-Goals
- [Explicitly out of scope.]

## Approved Scope
- [What will be changed.]

## Design
- [Behavior, architecture, API, UX, data flow, or other relevant design detail.]

## Acceptance Criteria
- [How we know it works.]

## Open Questions
- [Question or "None". Unresolved blockers must stop implementation.]

## Next Step
[writing-plans / executing-plans / direct tiny edit / pause]
```

## Approval Rules

- "Looks good", "approved", "go with option B", or "yes, implement this spec" count as approval after the design/spec has been shown.
- "可以", "继续", or "sounds reasonable" count only if the immediately preceding message asked for design/spec approval.
- "Keep discussing", "what about X", or "try exploring Y" do not count as approval.
- If the user approves only one section, continue brainstorming remaining sections before writing the final spec.

## Lightweight Exceptions

For a tiny mechanical edit, keep the process compact:

1. State the assumption and acceptance criterion.
2. Update `.codex-context/spec.md` with the compact scope.
3. If the work is single-step, implement; otherwise use `writing-plans`.

Examples: typo fix, one clearly named config value, one obvious import path fix. Not examples: feature behavior, architecture, data migration, API shape, UX, test strategy, or anything touching multiple modules.

## Self-Review

Before leaving brainstorming, verify:

- The user approved the design/spec or explicitly skipped brainstorming.
- No `TODO`, `TBD`, or placeholder requirements remain.
- The spec says what will not be done.
- Acceptance criteria are observable.
- Open questions are resolved or explicitly blocking.
- The next skill/action is recorded in `.codex-context/current-state.md`.
