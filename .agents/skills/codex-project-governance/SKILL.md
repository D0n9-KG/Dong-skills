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
- `.codex-context/worktree-state.md`
- `.codex-context/workflow-state.yaml`
- `.codex-context/handoff-summary.md`
- `.codex-context/raw/`

If those files conflict with the latest user instruction, the latest user instruction wins. Update the files before continuing.

Use `.codex-context/workflow-state.yaml` as the script-readable workflow state. It records the current phase, next skill, pending decision, spec/plan/execution status, verification result, review status, and checkpoint status. Before routing work after compaction, new sessions, or long pauses, run:

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
```

Use `workflow-state transition <event>` at phase boundaries instead of relying on chat memory alone.

## Phase Gates

Do not skip gates for non-trivial work:

1. **Scope gate:** unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work uses `brainstorming` first.
2. **Written spec gate:** multi-step or behavior-changing implementation waits until the written spec is approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria. A discussion approval or section approval is not enough.
3. **Plan gate:** multi-step work uses `writing-plans` before implementation.
4. **Execution mode gate:** the written plan must record `Execution Mode`: `Traditional task-by-task execution` or `Codex Goal mode`.
5. **Execution gate:** execute a written plan only after the user approves execution mode or explicitly asked earlier to plan-then-execute. Plan-then-execute defaults to Traditional mode unless the user explicitly selects Codex Goal mode.

Tiny mechanical edits can use a compact spec and direct implementation. If the boundary is uncertain, treat it as non-trivial and use the gates.

## Skill Map

- `using-superpowers`: choose the relevant workflow skill.
- `brainstorming`: unclear requirements, creative work, behavior changes.
- `codex-codebase-onboarding`: bootstrap Dong Skills project config when needed, then map an unfamiliar repo.
- `writing-plans`: approved spec or multi-step implementation.
- `executing-plans`: execute a written plan in Traditional task-by-task mode or explicit Codex Goal mode.
- `codex-worktree-governance`: detect worktree role, branch state, primary/worktree relationship, hook root mismatch, and cleanup ownership.
- `systematic-debugging`: bug, test failure, build failure, unexpected behavior.
- `codex-architecture-governance`: structural changes, large files, flat directories, unclear boundaries, refactors, or repeated fixes caused by coupling.
- `codex-verification-loop`: select build, type, lint, test, security, and diff checks.
- `codex-evidence-capture`: capture real product-use evidence for UI, CLI, API, generated artifact, workflow, or bug-fix behavior.
- `verification-before-completion`: before claiming complete, fixed, passing, ready, or delivered.
- `codex-git-checkpoint`: archive verified work with clear commits and optional GitHub push before pauses, compaction, or delivery.
- `codex-review-panel`: persona-based review for meaningful implementation, plans, docs, architecture, and delivery evidence.
- `requesting-code-review`: lightweight review entry or handoff to `codex-review-panel`.
- `receiving-code-review`: when review feedback arrives.
- `codex-learning-memory`: record, validate, prune, and promote evidence-backed project instincts; route Dong Skills improvement candidates to the real Dong Skills backlog or fallback outbox.
- `codex-solution-memory`: capture and maintain structured solution docs in `docs/solutions/` and `CONCEPTS.md`.
- `codex-session-history`: safely search prior agent sessions when project files do not contain enough recovery context.
- `codex-strategy-anchor`: create or maintain `STRATEGY.md` as upstream grounding for product/project direction.
- `codex-docs-stewardship`: milestone cleanup, stale docs, state-file archiving, README/AGENTS/docs reconciliation, or handoff cleanliness.
- `codex-context-budget`: audit skill, hook, and state-file context cost.
- `codex-asset-governance`: lifecycle audit and cleanup for state files, raw snapshots, archives, docs, scripts, hooks, tests, generated evidence, and code assets.

Load only the skill needed for the current phase.

## Lifecycle

1. Discover: if Dong Skills project config is missing, use `codex-codebase-onboarding` to bootstrap it; then read instructions, state files, worktree state, project map, `STRATEGY.md` when present, relevant docs, and relevant code.
2. Recover: read `workflow-state.yaml` and run `workflow-state recover` when phase or next action is unclear. If project files are still insufficient, use `codex-session-history` narrowly; store durable findings in `.codex-context/` or `docs/solutions/`.
3. Scope: if intent is unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product-directional, use `brainstorming`; use `codex-strategy-anchor` when product direction is missing or stale; update `spec.md` with living/final approval status, transition workflow state through `brainstorming-start`, `spec-living`, `spec-ready`, and `spec-approved`, and require written-spec approval before planning.
4. Plan: for multi-step work, use `writing-plans`; update `plan-progress.md`; include execution mode choices, runtime constraints, checkpoint cadence, and a Goal Mode objective draft; use `workflow-state transition plan-ready` when the plan is awaiting execution approval, then ask for execution mode approval unless the user explicitly requested plan-then-execute.
5. Workspace: before execution in a new/resumed worktree, or when hook source/root paths are confusing, use `codex-worktree-governance` and refresh `worktree-state.md`.
6. Implement: only after the written spec, plan, and execution mode gates are satisfied; use `workflow-state transition execution-approved-traditional` or `execution-approved-goal` after explicit approval; follow the plan and existing codebase patterns; search `docs/solutions/` when the area has prior learnings; keep `artifact-index.md` fresh.
7. Govern architecture: if structure changes or starts degrading, use `codex-architecture-governance`; update `project-map.md`, `decisions.md`, and `risks.md`.
8. Debug: if anything fails unexpectedly, use `systematic-debugging`; do not stack fixes without a root-cause hypothesis.
9. Verify: use `codex-verification-loop` and/or `verification-before-completion`; use `codex-evidence-capture` for observable behavior; update `verification.md`; transition workflow state to `verification-pass`, `verification-gap-recorded`, or `verification-fail`.
10. Review: use `codex-review-panel` for meaningful diffs, plans, docs, or high-risk delivery; record accepted and rejected findings; transition workflow state to `review-complete` or `review-skipped` with a recorded reason.
11. Govern assets: at milestones, compaction risk, release, or when docs/state/raw/code assets may be stale, duplicated, orphaned, unsafe, or bloated, use `codex-asset-governance`; delegate detailed docs cleanup to `codex-docs-stewardship`.
12. Steward docs: when README/AGENTS/docs/state files need reconciliation, use `codex-docs-stewardship`; archive old verification evidence when useful.
13. Learn: after verified work or user correction, use `codex-learning-memory` for short instincts and `codex-solution-memory` for structured reusable solutions. If the signal is about improving Dong Skills hooks, skills, docs, installers, or governance behavior, record it in the real Dong Skills repo `docs/improvements/backlog.md`; if the repo cannot be found, write `.codex-context/dong-skills-outbox.md` and report the migration path instead of using project memory.
14. Checkpoint: use `codex-git-checkpoint` after verified meaningful work, before long pauses, compaction, delivery, branch switches, or GitHub archive/push.
15. Handoff: refresh `handoff-summary.md` before compaction, long pause, final response, or task switch.

## Hooks

When `.codex/hooks/project-ops.mjs` and `.codex/hooks.json` are installed and trusted:

- `SessionStart` injects recovery context, including `workflow-state.yaml` and the `workflow-state recover` summary.
- `UserPromptSubmit` captures likely learning signals as raw observations, not active memory.
- `PostToolUse` blocks after non-context file changes until `artifact-index.md` is fresh.
- `PreCompact` blocks stale manual compaction; for automatic compaction, it prepends an emergency notice to `handoff-summary.md`, preserves meaningful existing handoff content below it, writes a raw backup snapshot, and lets compaction continue.
- `PostCompact` confirms compaction completion with common hook output only; recovery context is injected by `SessionStart` when the start source is `compact`.
- `Stop` blocks final stopping when state, artifacts, verification, Git checkpoint notes, handoff, or learning review are stale.
- `Stop` and `PreCompact` also report malformed or missing `workflow-state.yaml`, but they do not require it to be newer than every source edit.
- `Stop` also blocks severe asset bloat or unsafe tracked raw/runtime artifacts reported by asset governance.

If a hook blocks, update the named state files. Do not disable hooks unless the user explicitly asks.

## Completion Gate

Before any completion claim:

1. Re-read `spec.md`, `plan-progress.md`, and `artifact-index.md`.
2. Re-read `workflow-state.yaml` and confirm the phase/next skill matches the delivery state.
3. Run the smallest command that proves the claim, or state why no reliable command exists.
4. Update `verification.md` with command, result, evidence, date, and gaps.
5. If in a linked worktree or branch state matters, refresh `worktree-state.md` before checkpoint, PR, merge, discard, or cleanup.
6. Use `codex-git-checkpoint` to commit/push a checkpoint, or record the deferred reason in `handoff-summary.md`.
7. If `.codex-context/raw/observations.jsonl` has pending learning events, use `codex-learning-memory` to save, absorb, or drop them, then refresh `learned-instincts.md`.
8. If verified work produced a durable solution or stale learning signal, use `codex-solution-memory` or record why it is not worth capturing. If the learning is about Dong Skills itself, update the Dong Skills backlog or `.codex-context/dong-skills-outbox.md` fallback instead.
9. Run `codex-asset-governance` when assets, docs, raw snapshots, archives, generated evidence, or active state files grew during the task; prune or record deferred cleanup.
10. Refresh `.codex-context/solution-index.md` when `docs/solutions/` or `CONCEPTS.md` changed.
11. Refresh `handoff-summary.md`.
12. Then answer the user with verified state and remaining gaps.
