---
name: receiving-code-review
description: Use when receiving review feedback before implementing suggestions, especially when feedback is unclear, broad, or technically questionable.
---

# Receiving Code Review

Treat review feedback as technical input to evaluate, not as orders to follow blindly.

## Response Pattern

1. Read all feedback before changing code.
2. Restate unclear items in concrete technical terms.
3. Check the feedback against the codebase, requirements, and user decisions.
4. Decide whether each item is valid, invalid, or needs clarification.
5. Implement valid items one at a time.
6. Verify each fix and record evidence.

## Forbidden Shortcuts

- Do not performatively agree before checking.
- Do not batch unclear feedback.
- Do not implement suggestions that conflict with the approved scope without asking.
- Do not modify tests merely to make them pass unless the user explicitly asks.

## Clarification Rule

If any feedback item is ambiguous and could change the implementation, stop and ask before editing. Do not partially implement a multi-item review when the unclear items may affect the clear ones.

## Push Back When

- The suggestion breaks existing behavior.
- The reviewer lacks relevant project context.
- The suggestion adds unused capability.
- The suggestion conflicts with user-approved architecture.
- Compatibility, security, or performance constraints make the suggestion unsafe.

Push back with evidence: file references, commands, test output, or documented decisions.

## Completion

After addressing review:

- Update `.codex-context/verification.md`.
- Update `.codex-context/decisions.md` for accepted or rejected review decisions.
- Use `verification-before-completion` before claiming the review is resolved.
