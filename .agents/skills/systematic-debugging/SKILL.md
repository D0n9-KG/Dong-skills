---
name: systematic-debugging
description: Use when encountering any bug, test failure, build failure, regression, performance issue, or unexpected behavior before proposing fixes.
---

# Systematic Debugging

## Rule

No fixes before root-cause investigation.

Reproduction is the entry ticket to fixing. Do not edit implementation code for a bug, failing test, regression, or unexpected behavior until you have one of these:

- a reliable automated failing test or command that demonstrates the issue
- a reliable manual reproduction with exact steps and observed output
- an explicit user-approved exception that records the risk of fixing without reproduction

If the issue is intermittent, first gather enough logs, diagnostics, or repeated attempts to characterize when it happens. If it cannot be reproduced yet, keep investigating or record the blocked state; do not guess-patch.

Do not propose a patch until you can state:

- what failed
- where it failed
- why that location received bad input, state, config, timing, or dependency behavior
- what evidence distinguishes the root cause from nearby symptoms

## Use When

- tests, builds, typechecks, lint, CI, or runtime behavior fail
- a previous fix did not work
- the issue crosses multiple layers such as workflow -> build -> service -> database
- you feel tempted to make a quick obvious change
- three attempted fixes have failed, which means the design may need review

## Required Loop

1. Reproduce and read the evidence.
   Capture the exact command, error, stack, logs, changed files, environment/config, and whether the failure is consistent.
   For bug fixes, add or identify the smallest reliable failing unit/e2e/CLI/API test before changing implementation when practical. If no automated reproduction is practical, record the manual reproduction and verification gap in `.codex-context/verification.md`.

2. Trace to origin.
   Follow the bad value, state, event, dependency, or timing condition backwards until the first wrong source is identified. For deep call stacks, use `root-cause-tracing.md`.

3. Compare with working patterns.
   Find the closest working example in the same codebase or official reference. List meaningful differences before deciding what matters.

4. Form one hypothesis.
   Write: "I think X is the root cause because Y evidence." Test one variable at a time.

5. Fix the root cause.
   Add or run the smallest reliable unit/e2e reproduction available. Confirm it fails for the expected reason when possible. Then make one focused fix and verify.

6. If the fix fails, reset the hypothesis.
   Do not stack patches. After three failed fixes, stop and use `codex-architecture-governance` or discuss whether the current design is wrong.

7. Record the debugging state.
   Update `.codex-context/current-state.md` with the current hypothesis, changed files, and next action. Update `.codex-context/verification.md` with reproduction and verification evidence. If the root cause exposes a durable risk, update `.codex-context/risks.md`.

## Evidence Discipline

- Prefer real unit/e2e tests or the project's normal verification commands.
- A bug fix without an automated failing test needs a recorded reason, exact manual reproduction, and follow-up verification gap.
- Do not change tests just to make them pass unless the user explicitly approved that scope.
- Do not mock away the failure when real behavior can be tested.
- If no automated reproduction is practical, record the exact manual evidence and the verification gap.

## Stop Conditions

Stop and ask or re-plan when:

- the root cause depends on a user decision, credential, external service, or destructive data change
- three focused fixes fail for the same symptom
- evidence shows the approved plan/spec is wrong
- the next step would require architecture changes beyond the current approved scope

Do not convert debugging into unapproved refactoring. If the fix needs design changes, return to `brainstorming` or `writing-plans`.

## Multi-Layer Failures

At each boundary, capture what enters, what exits, and which config/state is present. Add temporary diagnostic output only when it directly distinguishes components, then remove it after the fix unless it is valuable production instrumentation.

## Supporting Files

Load only the relevant reference:

- `references/debugging-workflow.md`: full phase checklist and common rationalizations.
- `references/root-cause-patterns.md`: symptoms, likely missing evidence, and next probes.
- `root-cause-tracing.md`: backward tracing through call stacks and data flow.
- `defense-in-depth.md`: validation layers after the root cause is known.
- `condition-based-waiting.md`: replacing arbitrary sleeps with condition polling.
- `find-polluter.sh`: helper for order-dependent test pollution.

Use `verification-before-completion` before claiming the issue is fixed.
