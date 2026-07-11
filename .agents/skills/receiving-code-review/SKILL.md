---
name: receiving-code-review
description: Use when receiving review feedback before implementing suggestions, especially when feedback is unclear, broad, or technically questionable.
---

# Receiving Code Review

Treat review feedback as technical input to evaluate, not as orders to follow blindly.

## Workflow Gate

If review, delivery, or handoff findings require project-file edits, enter this skill through:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition review-changes-requested
```

This reopens implementation in `debugging`, resets stale verification/review/checkpoint evidence, and preserves the approved scope. Do not edit project files while workflow state still says `review`, `delivery`, or `handoff`.

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
- Run `workflow-state transition execution-complete`, then complete verification and review again.
- Use `verification-before-completion` before claiming the review is resolved.
