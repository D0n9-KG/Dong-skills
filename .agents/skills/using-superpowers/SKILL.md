---
name: using-superpowers
description: Lightweight fallback router for Dong Skills when a project is not initialized or workflow routing is unclear. Do not use when workflow-state already names a specific next_skill.
---

# Dong Skills Router

Use this skill only to find the next workflow owner. It is not a mandatory preamble for every non-trivial task.

## Fast Path

1. Read `.codex-context/workflow-state.yaml` or run `node .codex/hooks/project-ops.mjs workflow-state next`.
2. If `next_skill` names a valid skill, load that skill and stop reading this router.
3. If project-level Dong Skills are missing, use `codex-codebase-onboarding`.
4. If state is malformed or contradictory, repair state before product work.

Do not preload a chain of skills. One current phase normally has one workflow owner.

## Routing

- Uncertain multi-session route -> `codex-wayfinder`.
- Bounded design or behavior change -> `brainstorming`.
- Approved scope needing a multi-step plan -> `writing-plans`.
- Approved plan execution -> `executing-plans`.
- Unexpected failure -> `systematic-debugging`.
- Completion claim -> `verification-before-completion`.
- Cross-phase coordination with no clear owner -> `codex-project-governance`.

Use the lowest sufficient work lane. Tiny mechanical work should not be inflated into a full lifecycle.

## Boundaries

- Latest user instruction and fresh evidence outrank stale state.
- A non-trivial implementation still requires approved written scope and execution mode.
- Reads, research, diagnostics, and discussion do not need execution ceremony.
- A pure continuation or status question does not reopen scope.
- Keep recovery state concise; do not store hidden chain-of-thought or raw transcripts.

Return control to the named skill as soon as routing is decided.
