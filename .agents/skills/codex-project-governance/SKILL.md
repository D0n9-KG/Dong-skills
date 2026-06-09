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

## Skill Map

- `using-superpowers`: choose the relevant workflow skill.
- `brainstorming`: unclear requirements, creative work, behavior changes.
- `codex-codebase-onboarding`: bootstrap Dong Skills project config when needed, then map an unfamiliar repo.
- `writing-plans`: approved spec or multi-step implementation.
- `executing-plans`: execute a written plan task by task.
- `systematic-debugging`: bug, test failure, build failure, unexpected behavior.
- `codex-verification-loop`: select build, type, lint, test, security, and diff checks.
- `verification-before-completion`: before claiming complete, fixed, passing, ready, or delivered.
- `codex-git-checkpoint`: archive verified work with clear commits and optional GitHub push before pauses, compaction, or delivery.
- `requesting-code-review`: after meaningful implementation or before delivery.
- `receiving-code-review`: when review feedback arrives.
- `codex-learning-memory`: record, validate, prune, and promote evidence-backed project instincts.
- `codex-context-budget`: audit skill, hook, and state-file context cost.

Load only the skill needed for the current phase.

## Lifecycle

1. Discover: if Dong Skills project config is missing, use `codex-codebase-onboarding` to bootstrap it; then read instructions, state files, project map, relevant docs, and relevant code.
2. Scope: if intent is unclear or behavior-changing, use `brainstorming`; update `spec.md`.
3. Plan: for multi-step work, use `writing-plans`; update `plan-progress.md`.
4. Implement: follow the plan and existing codebase patterns; keep `artifact-index.md` fresh.
5. Debug: if anything fails unexpectedly, use `systematic-debugging`; do not stack fixes without a root-cause hypothesis.
6. Verify: use `codex-verification-loop` and/or `verification-before-completion`; update `verification.md`.
7. Checkpoint: use `codex-git-checkpoint` after verified meaningful work, before long pauses, compaction, delivery, branch switches, or GitHub archive/push.
8. Review: use `requesting-code-review` or an inline self-review; record accepted and rejected findings.
9. Learn: after verified work or user correction, use `codex-learning-memory`.
10. Handoff: refresh `handoff-summary.md` before compaction, long pause, final response, or task switch.

## Hooks

When `.codex/hooks/project-ops.mjs` and `.codex/hooks.json` are installed and trusted:

- `SessionStart` injects recovery context.
- `UserPromptSubmit` captures likely learning signals as raw observations, not active memory.
- `PostToolUse` blocks after non-context file changes until `artifact-index.md` is fresh.
- `PreCompact` asks for fresh recovery state and reviewed learning observations before compaction.
- `PostCompact` injects recovery order.
- `Stop` blocks final stopping when state, artifacts, verification, Git checkpoint notes, handoff, or learning review are stale.

If a hook blocks, update the named state files. Do not disable hooks unless the user explicitly asks.

## Completion Gate

Before any completion claim:

1. Re-read `spec.md`, `plan-progress.md`, and `artifact-index.md`.
2. Run the smallest command that proves the claim, or state why no reliable command exists.
3. Update `verification.md` with command, result, evidence, date, and gaps.
4. Use `codex-git-checkpoint` to commit/push a checkpoint, or record the deferred reason in `handoff-summary.md`.
5. If `.codex-context/raw/observations.jsonl` has pending learning events, use `codex-learning-memory` to save, absorb, or drop them, then refresh `learned-instincts.md`.
6. Refresh `handoff-summary.md`.
7. Then answer the user with verified state and remaining gaps.
