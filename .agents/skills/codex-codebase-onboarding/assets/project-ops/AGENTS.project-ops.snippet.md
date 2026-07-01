# Codex Project Ops

Use Chinese by default unless the user asks otherwise or the project requires another language.

Write user-facing `.codex-context/*.md` state files in Chinese by default. Keep file names, commands, workflow-state YAML keys, enum values, skill names, hook names, code identifiers, and precise terms such as `spec`, `handoff`, `checkpoint`, and `Goal mode` in English when useful.

## Main Skill

For non-trivial project work, use `codex-project-governance` first. It coordinates discovery, spec, plan, implementation, debugging, verification, review, delivery, learning, and handoff.

## Phase Gates

For non-trivial work, keep the phase boundary explicit:

1. Use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work.
2. Do not implement until the written spec is approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria. Discussion approval is not enough for non-trivial work.
3. Use `writing-plans` before multi-step implementation.
4. Do not execute the plan until the user approves the execution mode or explicitly requested plan-then-execute. Plan-then-execute defaults to Traditional task-by-task execution unless the user explicitly selects Codex Goal mode.

Record spec approval in `.codex-context/spec.md`; record `执行模式`, `Goal 模式目标` when applicable, and execution approval in `.codex-context/plan-progress.md`.

## Truth Hierarchy And Work Lanes

When records conflict, use this order: latest user instruction; verified behavior from code, tests, commands, product evidence, or live repo inspection; approved spec and plan; current state files and handoff; older chat, raw notes, stale specs, or unreviewed observations.

`spec.md` is a current-task intent and acceptance record, not a permanent system truth. After delivery, move durable knowledge into `CONCEPTS.md`, `STRATEGY.md`, `docs/solutions/`, or curated instincts, and do not keep duplicate spec prose that overlaps executable code.

Use the lowest sufficient lane: `Lane 0` tiny mechanical edit; `Lane 1` small bounded change; `Lane 2` multi-file or behavior-changing work; `Lane 3` high-risk core logic, migration, security, money, permissions, release, or production-sensitive work. The lane controls plan depth, verification depth, state update cadence, review, rollback, and checkpoint cadence.

## Curated Skills

Use only the bundled curated set by default:

- `using-superpowers`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `systematic-debugging`
- `verification-before-completion`
- `codex-git-checkpoint`
- `codex-worktree-governance`
- `codex-architecture-governance`
- `codex-docs-stewardship`
- `codex-asset-governance`
- `codex-simplicity-review`
- `codex-review-panel`
- `codex-solution-memory`
- `codex-session-history`
- `codex-strategy-anchor`
- `codex-evidence-capture`
- `codex-skill-evolution`
- `requesting-code-review`
- `receiving-code-review`
- `codex-codebase-onboarding`
- `codex-verification-loop`
- `codex-learning-memory`
- `codex-context-budget`
- `codex-project-governance`

Do not assume removed Superpowers/ECC components exist.
Use `codex-learning-memory` for curated instincts only; do not save loose notes as memory without evidence, scope, and a save/improve/absorb/drop decision.

## State Files

Keep `.codex-context/` current when work spans files, turns, or phases:

- `current-state.md`
- `project-map.md`
- `spec.md`
- `plan-progress.md`
- `artifact-index.md`
- `decisions.md`
- `open-questions.md`
- `risks.md`
- `verification.md`
- `working-notes.md`
- `learned-instincts.md`
- `dong-skills-outbox.md`
- `worktree-state.md`
- `workflow-state.yaml`
- `handoff-summary.md`

Use `.codex-context/raw/` for raw logs or large outputs.
Project bootstrap should keep `.codex-context/raw/*` and `.codex-context/discussion-state.json` ignored in `.gitignore`, with only `.codex-context/raw/.gitkeep` trackable.
Use `.codex-context/archive/` for old but still useful verification or handoff history.
Use `.codex-context/working-notes.md` for compact externalized investigation state: checked facts, rejected paths, current hypothesis, current conclusion, open investigation questions, and next verification step. Do not store hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning there. Promote durable conclusions into spec, decisions, current-state, handoff, or solution docs at phase boundaries.
Use `.codex-context/instincts/` for learned instincts; keep `learned-instincts.md` as a compact index, not a dumping ground.
Use `.codex-context/dong-skills-outbox.md` only for Dong Skills improvement candidates when the real Dong Skills source repo cannot be found. It is not project memory and not an active instinct.
Use `.codex-context/solution-index.md` as the compact pointer to `docs/solutions/` and `CONCEPTS.md`; do not paste full solution docs into active state.

Use `.codex-context/worktree-state.md` to record whether the current workspace is the primary checkout, a Codex-managed worktree, a Dong-managed fallback worktree, a manual worktree, a submodule, or unknown. Refresh it before execution, checkpoint, branch completion, cleanup, or whenever hook UI source paths differ from the actual Git root.

Use `.codex-context/workflow-state.yaml` as the script-readable phase state. Before routing non-trivial work, run `node .codex/hooks/project-ops.mjs workflow-state next` or read the file directly. If phase, next action, or compaction recovery is ambiguous, run `node .codex/hooks/project-ops.mjs workflow-state recover` before acting. Update state at phase boundaries with `workflow-state transition <event>` so compaction recovery can identify the current phase, blocking decision, and next skill.

If present:

- `STRATEGY.md` is the project/product direction anchor for major brainstorming and planning.
- `CONCEPTS.md` is stable project vocabulary.
- `docs/solutions/` stores structured verified learnings with YAML frontmatter.

Use `codex-architecture-governance` before or after structural changes, major refactors, large-file growth, flat-directory growth, unclear ownership, or repeated bugs caused by coupling. Keep architecture facts in `project-map.md`, decisions in `decisions.md`, and structural risks in `risks.md`.

Before adding custom code, dependencies, abstractions, scripts, docs, or state assets, apply the Simplicity Gate: can the approved outcome be reached without building the new thing; does the standard library already cover it; does the native platform already cover it. Use `codex-simplicity-review` for overbuilt diffs/plans, avoidable dependencies, unnecessary abstractions, or deliberate simplification debt. If an accepted simplification has a known ceiling, mark it near the code as `dong-debt: <ceiling>; revisit when <trigger>`.

Use `codex-docs-stewardship` at milestones, before handoff, after API/architecture changes, or when README/AGENTS/docs/.codex-context may be stale. Delete, merge, or archive stale docs instead of keeping misleading notes.

Use `codex-asset-governance` before milestone handoff, compaction, release, or when docs, state files, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, or code assets may be stale, duplicated, orphaned, unsafe, or bloated. Classify assets as Keep, Update, Consolidate, Replace, Delete, Stale, or Raw-Prune.

Run `node .codex/hooks/project-ops.mjs asset-governance` for a dry-run lifecycle audit. Use `--apply` only for safe pruning of generated `precompact-auto-*.md` raw snapshots; do not prune `observations.jsonl` generically.

Use `codex-review-panel` for meaningful code, plan, docs, architecture, or delivery reviews where correctness, testing, maintainability, standards, security, performance, reliability, API contract, UX/product, or adversarial lenses reduce risk.

Use `codex-skill-evolution` only for offline, explicit SkillOpt-Sleep evolution of Dong Skills itself. It is a global maintenance entry, but it must operate on the real Dong Skills source repo, not the current business project. It turns Dong Skills backlog/outbox issues into reviewed replay tasks, runs SkillOpt-Sleep dry-run/run, inspects staged proposals, and adopts only after user review. Do not run SkillOpt-Sleep from hooks, do not use `--auto-adopt`, and do not use it for business project code or project memory.

## Learning Memory

Learning is curated. Hooks may automatically capture likely learning signals in `.codex-context/raw/observations.jsonl`, but those observations are compact/redacted and are not active rules.

Before compaction, final delivery, or a long pause, review pending observations with `codex-learning-memory`: save useful patterns as instincts, absorb duplicates into existing docs, or record dropped noise. Refresh `.codex-context/learned-instincts.md` after review.

For non-trivial verified fixes or reusable solutions, use `codex-solution-memory` instead of saving a loose instinct. Refresh `docs/solutions/`, `CONCEPTS.md`, and `.codex-context/solution-index.md` as needed.

If the signal is about improving Dong Skills itself, such as hooks, skills, README, installer, bootstrap, recovery, or governance behavior, record it in `docs/improvements/backlog.md` in the Dong Skills repo. Do not mix Dong Skills meta-learning with project instincts or project solution memory.

If the real Dong Skills repo cannot be found, write the item to `.codex-context/dong-skills-outbox.md` and report the target location, actual location, reason, risk, and migration next step. Use `node .codex/hooks/project-ops.mjs learning-status` to see the detected Dong Skills backlog target and pending outbox count. Never edit installed skill copies under `%USERPROFILE%\.agents\skills` as if they were source.

For recurring Dong Skills failures that need validation before changing skills, use `codex-skill-evolution` after the issue is in `docs/improvements/backlog.md` or `.codex-context/dong-skills-outbox.md`. Keep `.skillopt-sleep/` and generated task drafts ignored unless a sanitized eval fixture is intentionally created.

## Session History

Use `codex-session-history` only when project files are insufficient or the user references previous sessions. Search metadata/keyword counts first, never paste full transcripts, and move durable findings into `.codex-context/` or `docs/solutions/`.

## Compaction

Write a fresh handoff at phase boundaries and before long pauses. During discussion, discovery, planning, debugging, or substantial exploration, keep `working-notes.md` fresh before stopping or compacting. The `UserPromptSubmit` hook may mark `.codex-context/discussion-state.json` dirty, and `Stop`/`PreCompact` can require refreshed spec/current/decisions/open-questions/working-notes/handoff files. The `PreCompact` hook blocks stale manual compaction. For automatic compaction, it prepends an emergency notice to `handoff-summary.md`, preserves the existing handoff below that notice, writes a raw snapshot, and allows compaction to continue, because automatic compaction may happen under context pressure where a hard block can leave the session stalled.

After compaction, recover in this order:

1. `.codex-context/handoff-summary.md`
2. `.codex-context/worktree-state.md`
3. `.codex-context/workflow-state.yaml`
4. `.codex-context/current-state.md`
5. `.codex-context/project-map.md`
6. `.codex-context/spec.md`
7. `.codex-context/decisions.md`
8. `.codex-context/open-questions.md`
9. `.codex-context/working-notes.md`
10. `.codex-context/plan-progress.md`
11. `.codex-context/artifact-index.md`
12. `.codex-context/solution-index.md`
13. `.codex-context/learned-instincts.md`
14. `.codex-context/dong-skills-outbox.md` only when discussing Dong Skills improvements
15. `STRATEGY.md`, `CONCEPTS.md`, or relevant `docs/solutions/` entries only when the task needs them
16. latest user instruction

## Completion

Before claiming work is complete, run fresh verification or record the explicit verification gap in `verification.md`. For observable UI/CLI/API/artifact/workflow changes, capture product evidence or explicitly record why it is blocked/not applicable. Then use `codex-git-checkpoint` to commit/push a checkpoint or record why it is deferred in `handoff-summary.md`, and refresh `handoff-summary.md`.

For installation or release hygiene, run `node .codex/hooks/project-ops.mjs health-check` from the target project when hooks are installed.
