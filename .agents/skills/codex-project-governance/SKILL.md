---
name: codex-project-governance
description: Full project lifecycle governance for Codex. Use when a task spans files, turns, phases, route discovery, project setup, implementation, debugging, verification, review, context compaction risk, or handoff.
---

# Codex Project Governance

Use this as the main loop for non-trivial Codex work.

## State Language

Write user-facing `.codex-context/*.md` content in Chinese by default, including section headings, summaries, decisions, open questions, specs, plans, verification notes, and handoff notes. Keep internal file names, command names, workflow-state YAML keys, enum values, skill names, hook names, and code identifiers in English.

Common English terms such as `spec`, `handoff`, `checkpoint`, `Goal mode`, `workflow-state`, file paths, commands, and status enum values may remain English when translating them would reduce precision.

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
- `.codex-context/working-notes.md`
- `.codex-context/learned-instincts.md`
- `.codex-context/worktree-state.md`
- `.codex-context/workflow-state.yaml`
- `.codex-context/handoff-summary.md`
- `.codex-context/raw/`

If those files conflict with the latest user instruction, the latest user instruction wins. Update the files before continuing.

Use this truth hierarchy when project records conflict:

1. Latest user instruction.
2. Verified behavior from code, tests, commands, product evidence, or live repo inspection.
3. Approved written spec and approved plan for the current task.
4. Current state files and handoff.
5. Older chat, raw notes, stale specs, or unreviewed observations.

`spec.md` is a current-task intent and acceptance record. It is not a permanent system truth. After delivery, migrate only durable knowledge into `CONCEPTS.md`, `STRATEGY.md`, `docs/solutions/`, or curated instincts; do not maintain duplicate spec text that overlaps executable code.

Use `.codex-context/workflow-state.yaml` as the script-readable workflow state. It records the current phase, next skill, pending decision, spec/plan/execution status, verification result, review status, and checkpoint status. Before routing work after compaction, new sessions, or long pauses, run:

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
```

Use `workflow-state transition <event>` at phase boundaries instead of relying on chat memory alone.

When `workflow-state next` prints `TRANSITIONS: ...`, treat that list as the executable decision contract. Present the corresponding mutually exclusive choices, wait for the user's matching response, and run exactly one listed transition.

## Phase Gates

Do not skip gates for non-trivial work:

1. **Scope gate:** unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work uses `brainstorming` first.
2. **Written spec gate:** multi-step or behavior-changing implementation waits until the written spec is approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria. A discussion approval or section approval is not enough.
3. **Plan gate:** multi-step work uses `writing-plans` before implementation.
4. **Execution mode gate:** the written plan must record `Execution Mode`: `Traditional task-by-task execution` or `Codex Goal mode`.
5. **Execution gate:** execute a written plan only after the user approves execution mode or explicitly asked earlier to plan-then-execute. Plan-then-execute defaults to Traditional mode unless the user explicitly selects Codex Goal mode.

Tiny mechanical edits can use a compact spec and direct implementation. If the boundary is uncertain, treat it as non-trivial and use the gates.

Before choosing the gate depth, classify the work into the lowest sufficient lane:

- `Lane 0`: tiny mechanical edit.
- `Lane 1`: small bounded change with compact planning and targeted verification.
- `Lane 2`: multi-file or behavior-changing work with approved spec, plan, evidence, and checkpoint discipline.
- `Lane 3`: high-risk core logic, migration, security, money, permissions, release, or production-sensitive work with stronger tests, review, rollback notes, and checkpointing.

## Skill Map

- `using-superpowers`: choose the relevant workflow skill.
- `brainstorming`: unclear requirements, creative work, behavior changes.
- `codex-wayfinder`: multi-session discovery where the destination is known but the route is too uncertain for a credible spec, especially unresolved research, prototype, user-grilling, frontier-ticket, or blocking-edge questions.
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
- `codex-simplicity-review`: anti-overengineering review for avoid-building, existing-codebase reuse, standard library, native platform, unnecessary abstraction, and simplification-debt findings.
- `requesting-code-review`: lightweight review entry or handoff to `codex-review-panel`.
- `receiving-code-review`: when review feedback arrives.
- `codex-learning-memory`: record, validate, prune, and promote evidence-backed project instincts; route Dong Skills improvement candidates to the real Dong Skills backlog or fallback outbox.
- `codex-solution-memory`: capture and maintain structured solution docs in `docs/solutions/` and `CONCEPTS.md`.
- `codex-session-history`: safely search prior agent sessions when project files do not contain enough recovery context.
- `codex-strategy-anchor`: create or maintain `STRATEGY.md` as upstream grounding for product/project direction.
- `codex-docs-stewardship`: milestone cleanup, stale docs, state-file archiving, README/AGENTS/docs reconciliation, or handoff cleanliness.
- `codex-context-budget`: audit skill, hook, and state-file context cost.
- `codex-asset-governance`: lifecycle audit and cleanup for state files, raw snapshots, archives, docs, scripts, hooks, tests, generated evidence, and code assets.
- `codex-skill-evolution`: offline SkillOpt-Sleep evolution for Dong Skills itself; use backlog/outbox issues as candidates, run validation-gated dry-run/run, inspect staged proposals, and adopt only after user review.
- `codex-agent-architecture-audit`: wrapper, memory, tool, rendering, hidden-repair, and persistence diagnosis for agent systems.
- `codex-loop-design-check`: decidable-goal, boundary, retry, independent-judge, and human-judgment review for autonomous loops.

Load only the skill needed for the current phase.

## Lifecycle

1. Discover: if Dong Skills project config is missing, use `codex-codebase-onboarding` to bootstrap it; then read instructions, state files, worktree state, project map, `STRATEGY.md` when present, relevant docs, and relevant code.
2. Recover: read `workflow-state.yaml` and run `workflow-state recover` when phase or next action is unclear. If project files are still insufficient, use `codex-session-history` narrowly; store durable findings in `.codex-context/` or `docs/solutions/`.
3. Scope: run the Wayfinder pre-check before ordinary brainstorming. If the destination is known but discovery will span sessions and the route is not yet specifiable, use `codex-wayfinder` and default to one frontier decision per session; bounded parallel exploration is allowed only when related tickets share one decision boundary and are reconciled into the map before stopping. Otherwise, if intent is unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product-directional, use `brainstorming`; use `codex-strategy-anchor` when product direction is missing or stale; update `spec.md` with living/final approval status, truth hierarchy, work class/risk lane, and What-level scope; transition workflow state through `brainstorming-start`, `spec-living`, `spec-ready`, and `spec-approved`; require written-spec approval before planning. Canonical scope artifacts may live in `STRATEGY.md`, `docs/codex/specs/`, or `docs/codex/wayfinder/`; they are governance evidence, not permission to edit product code.
4. Plan: for multi-step work, use `writing-plans`; update `plan-progress.md`; include work class/risk lane, execution mode choices, runtime constraints, checkpoint cadence, and a Goal Mode objective draft; use `workflow-state transition plan-ready` when the plan is awaiting execution approval, then ask for execution mode approval unless the user explicitly requested plan-then-execute.
5. Workspace: before execution in a new/resumed worktree, or when hook source/root paths are confusing, use `codex-worktree-governance` and refresh `worktree-state.md`.
6. Implement: only after the written spec, plan, and execution mode gates are satisfied; use `workflow-state transition execution-approved-traditional` or `execution-approved-goal` after explicit approval; follow the plan and existing codebase patterns; apply the Simplicity Gate before adding custom code, dependencies, abstractions, scripts, docs, or state assets; search `docs/solutions/` when the area has prior learnings; keep `artifact-index.md` fresh. During substantial investigation, keep `working-notes.md` fresh with checked facts, rejected paths, current hypothesis/conclusion, open questions, and next verification step.
7. Govern architecture: if structure changes or starts degrading, use `codex-architecture-governance`; update `project-map.md`, `decisions.md`, and `risks.md`.
8. Debug: if anything fails unexpectedly during execution, run `workflow-state transition debugging-start`, use `systematic-debugging`, and do not stack fixes without a root-cause hypothesis. After the focused reproduction passes, run `debugging-resolved` to return to the same execution plan. Verification failures and review changes keep their dedicated return paths.
9. Verify: use `codex-verification-loop` and/or `verification-before-completion`; use `codex-evidence-capture` for observable behavior; update `verification.md`; transition workflow state to `verification-pass`, `verification-gap-recorded`, or `verification-fail`.
10. Review: use `codex-simplicity-review` for overengineering risk and `codex-review-panel` for meaningful diffs, plans, docs, or high-risk delivery. If accepted findings require project-file edits, use `receiving-code-review`; the first real project mutation automatically reopens debugging and invalidates old verification/review evidence. Then return through `execution-complete`, verification, and review.
11. Govern assets: at milestones, compaction risk, release, or when docs/state/raw/code assets may be stale, duplicated, orphaned, unsafe, or bloated, use `codex-asset-governance`; delegate detailed docs cleanup to `codex-docs-stewardship`.
12. Steward docs: when README/AGENTS/docs/state files need reconciliation, use `codex-docs-stewardship`; archive old verification evidence when useful.
13. Learn: after verified work or user correction, use `codex-learning-memory` for short instincts and `codex-solution-memory` for structured reusable solutions. If the signal is about improving Dong Skills hooks, skills, docs, installers, or governance behavior, record it in the real Dong Skills repo `docs/improvements/backlog.md`; if the repo cannot be found, write `.codex-context/dong-skills-outbox.md` and report the migration path instead of using project memory.
14. Evolve Dong Skills: for recurring Dong Skills failures with clear acceptance criteria, use `codex-skill-evolution` as an offline maintenance workflow. Do not run SkillOpt-Sleep in hooks, do not auto-adopt, and do not use it for business project code.
15. Checkpoint: use `codex-git-checkpoint` after verified meaningful work, before long pauses, compaction, delivery, branch switches, or GitHub archive/push.
16. Handoff: refresh `handoff-summary.md` before compaction, long pause, final response, or task switch.

## Hooks

When `.codex/hooks/project-ops.mjs` and `.codex/hooks.json` are installed and trusted:

- `SessionStart` injects recovery context, including `workflow-state.yaml` and the `workflow-state recover` summary.
- A successful `context-recovery-eval` reached through the hooked tool path writes a session-scoped recovery receipt bound to the active task identity, handoff hash, and hook runtime hash. A new session, changed handoff, new task, or runtime update invalidates that receipt.
- `PreToolUse` protects supported mutating/destructive paths before the action. It denies direct `workflow-state.yaml` edits, arbitrary workflow administration, unresolved decisions, stale recovery, pre-execution product changes, missing execution approval, unavailable Git state, and scope changes that have not been reopened. Reads, tests, lint, typecheck, builds, check-only format commands, unknown external MCP tools, and canonical governance artifacts remain available. Verification/review fixes are allowed, but their first real project mutation automatically invalidates old evidence.
- `UserPromptSubmit` captures likely learning signals as raw observations, not active memory. During active discussion/spec/planning, it may mark `.codex-context/discussion-state.json` dirty so user answers are written into state before stopping or compacting. During execution or delivery phases, a non-status instruction is externalized before the next supported project mutation; scope/requirement/goal/acceptance/priority changes require `brainstorming-start`. Bare continuation, pure status inquiry, and learning-only future preferences do not reopen the active task.
- `PostToolUse` leaves ordinary reads/searches debt-free. It combines invocation-scoped intent with Git evidence, accumulates all unclosed changes for the current task, and emits a reminder rather than interrupting the next tool call. No-op tests and commit-only operations preserve valid refresh evidence; failed or no-op governance edits do not earn it.
- `PreCompact` blocks stale manual compaction; for automatic compaction, it prepends an emergency notice to `handoff-summary.md`, preserves meaningful existing handoff content below it, writes a raw backup snapshot including discussion marker and working notes, and lets compaction continue.
- `PostCompact` confirms compaction completion with common hook output only; recovery context is injected by `SessionStart` when the start source is `compact`. Recovery receipts are invalidated, while an unconsumed session-scoped user decision may remain valid only when its task, evidence, session, and runtime hashes still match.
- `SubagentStart` injects parent task identity, phase, lane, lifecycle boundaries, and a result contract. `SubagentStop` records lifecycle or summary-quality gaps as evidence warnings; it does not block native multi-agent completion or force immediate parent-state writes. Incomplete summaries cannot be used as completion/verification evidence without independent parent review.
- `Stop` re-evaluates Git, mutation receipts, workflow, discussion state, required delivery evidence, checkpoint state, and severe asset issues. Learning observations and ordinary hygiene remain advisory rather than blocking normal delivery.
- Repeated unresolved `Stop` findings use a bounded continuation receipt. After the bound is exhausted, stopping is allowed only with an explicit unresolved-gap message; the final response must not claim verified completion.
- `Stop` and `PreCompact` report malformed or missing `workflow-state.yaml`, but do not require it to be newer than every source edit.
- `health-check` reports static hook configuration, root/bootstrap runtime parity, and recent liveness separately. Required critical events must each be fresh under the current runtime; missing liveness is a warning and cannot prove whether host trust is enabled, while runtime or parity failures are release issues.
- Hook output includes a compact status line with the actual Git root, phase, next skill, blocking decision, learning state, asset state, checkpoint state, and latest changed file when known.

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
9. If Dong Skills itself should evolve from repeated failures, use `codex-skill-evolution` to stage and validate the proposal before changing skills.
10. Run `codex-asset-governance` when assets, docs, raw snapshots, archives, generated evidence, or active state files grew during the task; prune or record deferred cleanup.
11. Refresh `.codex-context/solution-index.md` when `docs/solutions/` or `CONCEPTS.md` changed.
12. Refresh `handoff-summary.md`.
13. Then answer the user with verified state and remaining gaps.
