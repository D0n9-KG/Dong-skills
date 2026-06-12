---
name: codex-project-governance
description: Full project lifecycle governance for Codex. Use when a task spans files, turns, phases, project setup, implementation, debugging, verification, review, context compaction risk, or handoff.
---

# Codex Project Governance

Use this as the main loop for non-trivial Codex work.

## First Principle

Keep recoverable project truth outside chat:

- `.codex-context/current-state.md`
- `.codex-context/project-map.md`
- `.codex-context/spec.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/decisions.md`
- `.codex-context/open-questions.md`
- `.codex-context/risks.md`
- `.codex-context/verification.md`
- `.codex-context/learned-instincts.md`
- `.codex-context/handoff-summary.md`
- `.codex-context/raw/`

If those files conflict with the latest user instruction, the latest user instruction wins. Update the files before continuing.

## Phase Gates

Do not skip gates for non-trivial work:

1. **Scope gate:** unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work uses `brainstorming` first.
2. **Approval gate:** implementation waits until the design/spec is explicitly approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria.
3. **Plan gate:** multi-step work uses `writing-plans` before implementation.
4. **Execution gate:** execute a written plan only after the user approves execution or explicitly asked earlier to plan-then-execute.

Tiny mechanical edits can use a compact spec and direct implementation. If the boundary is uncertain, treat it as non-trivial and use the gates.

## Skill Map

- `using-superpowers`: choose the relevant workflow skill.
- `brainstorming`: unclear requirements, creative work, behavior changes.
- `codex-codebase-onboarding`: bootstrap Dong Skills project config when needed, then map an unfamiliar repo.
- `writing-plans`: approved spec or multi-step implementation.
- `executing-plans`: execute a written plan task by task.
- `systematic-debugging`: bug, test failure, build failure, unexpected behavior.
- `codex-architecture-governance`: structural changes, large files, flat directories, unclear boundaries, refactors, or repeated fixes caused by coupling.
- `codex-verification-loop`: select build, type, lint, test, security, and diff checks.
- `codex-evidence-capture`: capture real product-use evidence for UI, CLI, API, generated artifact, workflow, or bug-fix behavior.
- `verification-before-completion`: before claiming complete, fixed, passing, ready, or delivered.
- `codex-git-checkpoint`: archive verified work with clear commits and optional GitHub push before pauses, compaction, or delivery.
- `codex-review-panel`: persona-based review for meaningful implementation, plans, docs, architecture, and delivery evidence.
- `requesting-code-review`: lightweight review entry or handoff to `codex-review-panel`.
- `receiving-code-review`: when review feedback arrives.
- `codex-learning-memory`: record, validate, prune, and promote evidence-backed project instincts.
- `codex-solution-memory`: capture and maintain structured solution docs in `docs/solutions/` and `CONCEPTS.md`.
- `codex-session-history`: safely search prior agent sessions when project files do not contain enough recovery context.
- `codex-strategy-anchor`: create or maintain `STRATEGY.md` as upstream grounding for product/project direction.
- `codex-docs-stewardship`: milestone cleanup, stale docs, state-file archiving, README/AGENTS/docs reconciliation, or handoff cleanliness.
- `codex-context-budget`: audit skill, hook, and state-file context cost.

Load only the skill needed for the current phase.

## Lifecycle

1. Discover: if Dong Skills project config is missing, use `codex-codebase-onboarding` to bootstrap it; then read instructions, state files, project map, `STRATEGY.md` when present, relevant docs, and relevant code.
2. Recover: if the latest context is missing and project files are insufficient, use `codex-session-history` narrowly; store durable findings in `.codex-context/` or `docs/solutions/`.
3. Scope: if intent is unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product-directional, use `brainstorming`; use `codex-strategy-anchor` when product direction is missing or stale; update `spec.md` with approval status.
4. Plan: for multi-step work, use `writing-plans`; update `plan-progress.md`; ask for execution approval unless the user explicitly requested plan-then-execute.
5. Implement: only after the approval and plan gates are satisfied; follow the plan and existing codebase patterns; search `docs/solutions/` when the area has prior learnings; keep `artifact-index.md` fresh.
6. Govern architecture: if structure changes or starts degrading, use `codex-architecture-governance`; update `project-map.md`, `decisions.md`, and `risks.md`.
7. Debug: if anything fails unexpectedly, use `systematic-debugging`; do not stack fixes without a root-cause hypothesis.
8. Verify: use `codex-verification-loop` and/or `verification-before-completion`; use `codex-evidence-capture` for observable behavior; update `verification.md`.
9. Review: use `codex-review-panel` for meaningful diffs, plans, docs, or high-risk delivery; record accepted and rejected findings.
10. Steward docs: at milestones or when docs/state files grow stale, use `codex-docs-stewardship`; archive old verification evidence when useful.
11. Learn: after verified work or user correction, use `codex-learning-memory` for short instincts and `codex-solution-memory` for structured reusable solutions.
12. Checkpoint: use `codex-git-checkpoint` after verified meaningful work, before long pauses, compaction, delivery, branch switches, or GitHub archive/push.
13. Handoff: refresh `handoff-summary.md` before compaction, long pause, final response, or task switch.

## Hooks

When `.codex/hooks/project-ops.mjs` and `.codex/hooks.json` are installed and trusted:

- `SessionStart` injects recovery context.
- `UserPromptSubmit` captures likely learning signals as raw observations, not active memory.
- `PostToolUse` blocks after non-context file changes until `artifact-index.md` is fresh.
- `PreCompact` blocks stale manual compaction; for automatic compaction, it writes an emergency handoff snapshot and lets compaction continue.
- `PostCompact` confirms compaction completion with common hook output only; recovery context is injected by `SessionStart` when the start source is `compact`.
- `Stop` blocks final stopping when state, artifacts, verification, Git checkpoint notes, handoff, or learning review are stale.

If a hook blocks, update the named state files. Do not disable hooks unless the user explicitly asks.

## Completion Gate

Before any completion claim:

1. Re-read `spec.md`, `plan-progress.md`, and `artifact-index.md`.
2. Run the smallest command that proves the claim, or state why no reliable command exists.
3. Update `verification.md` with command, result, evidence, date, and gaps.
4. Use `codex-git-checkpoint` to commit/push a checkpoint, or record the deferred reason in `handoff-summary.md`.
5. If `.codex-context/raw/observations.jsonl` has pending learning events, use `codex-learning-memory` to save, absorb, or drop them, then refresh `learned-instincts.md`.
6. If verified work produced a durable solution or stale learning signal, use `codex-solution-memory` or record why it is not worth capturing.
7. Refresh `.codex-context/solution-index.md` when `docs/solutions/` or `CONCEPTS.md` changed.
8. Refresh `handoff-summary.md`.
9. Then answer the user with verified state and remaining gaps.
