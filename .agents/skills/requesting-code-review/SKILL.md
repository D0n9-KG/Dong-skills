---
name: requesting-code-review
description: Use after meaningful implementation, before merge or delivery, or when a fresh review would reduce risk.
---

# Requesting Code Review

Run a focused review against the actual diff, spec, plan, and verification evidence. For meaningful changes, route to `codex-review-panel`; keep this skill as the lightweight entry point and review request discipline.

## When

- After a major task or feature.
- Before merge, PR, or delivery.
- After a complex bug fix.
- When implementation drift from the plan is possible.

## Mandatory Review Gate

Run `requesting-code-review` or route directly to `codex-review-panel` before delivery when any of these are true:

- the change touches multiple implementation files or shared modules
- public API, schema, auth, permissions, security, migration, data loss, or privacy behavior changed
- user-visible UI/CLI/API behavior changed
- a plan was completed and the final diff has not had a fresh review
- tests were skipped, limited, or only manual
- the agent had to deviate from the approved plan

If review is skipped, record the low-risk reason in `.codex-context/verification.md` or `handoff-summary.md`. "Looks small" is not enough; name why the blast radius is limited.

## Inputs

Collect:

- Requirement or spec path.
- Plan path.
- `git diff --stat` and relevant `git diff`.
- Verification evidence from `.codex-context/verification.md`.
- Known risks or open questions.
- Related `docs/solutions/` entries, if the changed area has prior solution memory.

## Review Checklist

- Does the implementation match approved scope?
- Are there unapproved behavior changes?
- Are errors, edge cases, security, and data loss risks handled?
- Are tests real unit or end-to-end checks rather than mock-only proof?
- Does the code fit existing architecture and conventions?
- Are docs and state files updated where needed?
- Would a persona panel add value because the change is high-risk, cross-cutting, user-visible, or plan-heavy? If yes, use `codex-review-panel`.

## Feedback Handling

- Fix Critical issues before proceeding.
- Fix Important issues unless there is a clear technical reason not to.
- Record Minor issues if they are not worth doing now.
- Push back on incorrect feedback with code, tests, or repo evidence.

Use `requesting-code-review/code-reviewer.md` as an optional prompt or inline checklist.

## State Updates

After review:

- update `.codex-context/risks.md` with unresolved review risks
- update `.codex-context/decisions.md` for accepted or rejected review findings that affect future work
- update `.codex-context/verification.md` after fixes or additional checks
- append `## 审查证据` / `## Review Evidence` with the reviewed range, verdict, blocking findings or explicit none, residual risks, and any required fix cycle before closing review
- use `codex-review-panel` when findings are cross-cutting, high-risk, or plan/spec related

When no project fix remains, finish the review phase explicitly:

- Normal completion: run `node .codex/hooks/project-ops.mjs workflow-state transition review-complete`.
- Low-risk Lane 0/1 skip only: record the concrete low-risk reason, confirm verification passed, then run `node .codex/hooks/project-ops.mjs workflow-state transition review-skipped`.

Lane 2/3 cannot use `review-skipped`. If review findings require edits, use `review-changes-requested` instead of either closure transition.

The closure transition records a content hash of `verification.md`; changing review or verification evidence afterward reopens the delivery gate.
