---
name: requesting-code-review
description: Use after meaningful implementation, before merge or delivery, or when a fresh review would reduce risk.
---

# Requesting Code Review

Run a focused review against the actual diff, spec, plan, and verification evidence. Default to inline self-review. Use a separate reviewer mechanism only when the user explicitly asks and the tool is available.

## When

- After a major task or feature.
- Before merge, PR, or delivery.
- After a complex bug fix.
- When implementation drift from the plan is possible.

## Inputs

Collect:

- Requirement or spec path.
- Plan path.
- `git diff --stat` and relevant `git diff`.
- Verification evidence from `.codex-context/verification.md`.
- Known risks or open questions.

## Review Checklist

- Does the implementation match approved scope?
- Are there unapproved behavior changes?
- Are errors, edge cases, security, and data loss risks handled?
- Are tests real unit or end-to-end checks rather than mock-only proof?
- Does the code fit existing architecture and conventions?
- Are docs and state files updated where needed?

## Feedback Handling

- Fix Critical issues before proceeding.
- Fix Important issues unless there is a clear technical reason not to.
- Record Minor issues if they are not worth doing now.
- Push back on incorrect feedback with code, tests, or repo evidence.

Use `requesting-code-review/code-reviewer.md` as an optional prompt or inline checklist.
