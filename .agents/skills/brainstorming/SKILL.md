---
name: brainstorming
description: MUST use before ambiguous, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work. Turns user intent into a discussed, explicit, written, user-approved spec before implementation; do not edit code until the written spec is approved unless the user explicitly skips brainstorming or the change is a tiny mechanical edit with clear acceptance criteria.
---

# Brainstorming

Use this skill to turn intent into an approved spec through collaborative discussion. Keep it lighter than upstream Superpowers, but preserve the upstream flow discipline: after every user answer, either ask the next single question, advance to approaches/design/approval, or explicitly state the blocker. Keep the phase boundary hard: no implementation before approval and no loss of confirmed discussion state before approval.

## Hard Gate

Do not implement, scaffold, edit code, change configuration, or invoke implementation skills until one of these is true:

- The user explicitly approves the written spec in the current chat.
- `.codex-context/spec.md` records `Approval Status: Approved by user` for the current task.
- The user explicitly says to skip brainstorming and proceed.
- The task is a tiny mechanical edit with clear acceptance criteria and no design choice.

Read-only discovery is allowed before approval. If you are unsure whether a request is mechanical, treat it as brainstorming.

When Dong Skills project hooks are installed, start or refresh the workflow state before the first substantive brainstorming response:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition brainstorming-start
```

## What Good Brainstorming Does

- Understand the real problem, not just the first requested implementation.
- Expose constraints, non-goals, risks, acceptance criteria, and open questions.
- Explore alternatives before committing to one path, without overwhelming the user with a large questionnaire.
- Produce a living written spec that survives compaction and new sessions even before final approval.
- Maintain forward motion through the brainstorming flow; state-file updates are never the final answer unless the user asked only for documentation.
- Hand off to `writing-plans` for multi-step implementation.

## Process

1. **Discover context.** Read `AGENTS.md`, `.codex-context/current-state.md`, `.codex-context/project-map.md`, relevant docs/code, and recent changes. Do not read the whole repo.
2. **Restate the objective.** One sentence, including the user-visible outcome.
3. **Clarify.** Ask exactly one important question per assistant message when the answer changes scope, UX, architecture, data model, API, verification, or delivery. You may include 2-3 concrete choices for that one question, but do not bundle multiple questions.
4. **Update the living spec, then continue.** As soon as the user confirms a decision, boundary, non-goal, acceptance criterion, or open question, update `.codex-context/spec.md` with `Approval Status: Living Draft / Not Approved`. Also refresh `.codex-context/decisions.md`, `.codex-context/open-questions.md`, `.codex-context/current-state.md`, and `.codex-context/handoff-summary.md` when the discussion is long enough that compaction would lose context. Run `workflow-state transition spec-living` when the workflow state is available. After updating state, immediately continue the brainstorming loop in the same assistant response unless a tool failure or user instruction blocks you.
5. **Explore options.** For direction-setting, architecture, product behavior, API, UX, data model, workflow, or other behavior-changing work, assume there is a real choice and compare 2-3 viable approaches before selecting one. Skip comparison only for tiny mechanical edits, an already-approved approach, or an explicit user request to skip. Include trade-offs and a recommendation, then ask one focused follow-up question.
6. **Present the design section by section.** Scale detail to complexity. Cover only relevant sections: behavior, boundaries, files/modules, data flow, UX/API, error handling, migration, verification, non-goals. For complex work, ask for confirmation after each section before moving to the next section.
7. **Ask for final approval.** Ask the user to approve the complete design/spec or request changes. Do not treat silence, vague acknowledgement, or a question as approval.
8. **Finalize the spec draft.** After final discussion approval, rewrite `.codex-context/spec.md` from `Living Draft / Not Approved` into a clean written spec with `Approval Status: Pending written-spec approval`. Use `docs/codex/specs/YYYY-MM-DD-<topic>.md` when the spec is too large for the state file, then link it from `spec.md`. Run `workflow-state transition spec-ready`; this records `decision_required: written-spec-approval`.
9. **Run the Final Spec Gate.** Self-review the written spec, fix issues inline, then ask the user to review the written spec. If the user requests changes, update the spec and rerun the gate.
10. **Update state.** Update `.codex-context/current-state.md`, `.codex-context/decisions.md`, `.codex-context/open-questions.md`, and `.codex-context/handoff-summary.md`.
11. **Transition only after written-spec approval.** For multi-step work, use `writing-plans` next. Do not jump from brainstorming directly to implementation unless the approved spec is tiny and mechanical.

## Continuation Loop

This is the core upstream Superpowers behavior Dong Skills must preserve.

After every user response during brainstorming:

1. Classify the response: answer to current question, correction, new constraint, approval, rejection, or request to pause.
2. Record any confirmed decision in the living spec/state files when useful.
3. Decide the next state:
   - If essential context is still missing, ask the next single highest-impact question.
   - If context is sufficient but approaches have not been compared, present 2-3 approaches with a recommendation and ask one focused choice question.
   - If the approach is selected, present the next design section and ask whether it looks right so far.
   - If all design sections are approved, ask for final design/spec approval.
   - If final approval is given, finalize the spec and transition to `writing-plans`.
   - If the user asks to pause, stop with a clear resume point.
4. End the assistant response with exactly one of these:
   - the next single question,
   - a request to approve/revise the current design section,
   - a request for final spec approval,
   - the `writing-plans` transition,
   - or a specific blocker.

Do not end a brainstorming turn by only saying that files were updated, tests passed, or hooks are green. Those can be mentioned briefly, but the response must still advance the loop.

## Living Spec Mode

Living Spec mode starts when brainstorming begins and ends only when the user approves the final design/spec or explicitly cancels the effort.

- Store confirmed discussion state in `.codex-context/spec.md` before approval, marked `Approval Status: Living Draft / Not Approved`.
- Clearly separate `Confirmed Decisions`, `Candidate Options`, `Open Questions`, and `Not Approved Yet`.
- Do not present living draft content as permission to implement.
- Do not let living-spec maintenance interrupt the conversation. After writing the draft, continue to the next question or next phase.
- If a discussion spans multiple turns, a likely compaction boundary, or a new session handoff, refresh `handoff-summary.md` with the current living draft status.
- When final discussion approval arrives, rewrite the spec into the final written-spec shape and preserve the important confirmed decisions.
- Final approval of the discussion is not enough to leave brainstorming. The written spec must pass the Final Spec Gate and be approved by the user as the written spec before `Approval Status` can become `Approved by user`.

## Spec Shape

Use this structure unless the project already has a stronger one:

```markdown
# Spec

## Problem
[What the user wants solved and why.]

## Goal
- [Observable outcome.]

## Approval Status
Living Draft / Not Approved, Pending written-spec approval, or Approved by user on [date/time].

## User Decisions
- [Decision, trade-off, and source.]

## Candidate Options
- [Options still under discussion, or "None."]

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

## Final Spec Gate

After the user approves the discussed design, but before `writing-plans`:

1. Rewrite the living draft into the final written spec. Keep confirmed decisions, remove abandoned options, and make unresolved questions explicit. Mark it `Approval Status: Pending written-spec approval` until the user approves the written file.
2. Run this self-review and fix issues inline:
   - no `TODO`, `TBD`, placeholder, or incomplete section remains
   - no section contradicts another section
   - design, architecture, data flow, UX/API behavior, and acceptance criteria match the approved goals
   - non-goals and out-of-scope work are explicit
   - acceptance criteria are observable and testable
   - open questions are `None` or explicitly blocking
   - scope fits one implementation plan; if not, split the work or return to brainstorming
   - a fresh session could write a plan from the spec file without relying on chat memory
3. Ask the user to review the written spec file before planning.
4. If the user requests changes, update the spec and rerun this gate.
5. Only after the user approves the written spec, update `Approval Status` to `Approved by user on [date/time]`, run `workflow-state transition spec-approved`, and transition to `writing-plans`.

Use this gate instead of relying on a vague "looks good" after a conversation. A section approval, approach choice, or casual acknowledgement is not written-spec approval.

## Approval Rules

- "Looks good", "approved", "go with option B", or "yes, implement this spec" count as the approval that was explicitly requested by the immediately preceding assistant message: section approval, final discussion approval, or written-spec approval.
- "可以", "继续", or "sounds reasonable" count only if the immediately preceding message asked for design/spec approval.
- "Keep discussing", "what about X", or "try exploring Y" do not count as approval.
- If the user approves only one section, continue brainstorming remaining sections before writing the final spec.

At the written-spec approval decision point, do not infer approval from silence, history, or the fact that a recommendation was presented. Ask for approval/revision and stop until the user answers.

## Lightweight Exceptions

For a tiny mechanical edit, keep the process compact:

1. State the assumption and acceptance criterion.
2. Update `.codex-context/spec.md` with the compact scope.
3. If the work is single-step, implement; otherwise use `writing-plans`.

Examples: typo fix, one clearly named config value, one obvious import path fix. Not examples: feature behavior, architecture, data migration, API shape, UX, test strategy, or anything touching multiple modules.

## Self-Review

Before leaving brainstorming, verify:

- The user approved the written spec file or explicitly skipped brainstorming.
- No `TODO`, `TBD`, or placeholder requirements remain.
- The architecture/design matches the feature descriptions and accepted decisions.
- The spec says what will not be done.
- Acceptance criteria are observable.
- Open questions are resolved or explicitly blocking.
- Scope fits one implementation plan; otherwise the work is decomposed.
- The next skill/action is recorded in `.codex-context/current-state.md`.
