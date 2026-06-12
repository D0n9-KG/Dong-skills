# Codex Project Ops

Use Chinese by default unless the user asks otherwise or the project requires another language.

## Main Skill

For non-trivial project work, use `codex-project-governance` first. It coordinates discovery, spec, plan, implementation, debugging, verification, review, delivery, learning, and handoff.

## Phase Gates

For non-trivial work, keep the phase boundary explicit:

1. Use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work.
2. Do not implement until the design/spec is approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria.
3. Use `writing-plans` before multi-step implementation.
4. Do not execute the plan until the user approves execution or explicitly requested plan-then-execute.

Record spec approval in `.codex-context/spec.md` and execution approval in `.codex-context/plan-progress.md`.

## Curated Skills

Use only the bundled curated set by default:

- `using-superpowers`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `systematic-debugging`
- `verification-before-completion`
- `codex-git-checkpoint`
- `codex-architecture-governance`
- `codex-docs-stewardship`
- `codex-review-panel`
- `codex-solution-memory`
- `codex-session-history`
- `codex-strategy-anchor`
- `codex-evidence-capture`
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
- `learned-instincts.md`
- `handoff-summary.md`

Use `.codex-context/raw/` for raw logs or large outputs.
Project bootstrap should keep `.codex-context/raw/*` ignored in `.gitignore`, with only `.codex-context/raw/.gitkeep` trackable.
Use `.codex-context/archive/` for old but still useful verification or handoff history.
Use `.codex-context/instincts/` for learned instincts; keep `learned-instincts.md` as a compact index, not a dumping ground.
Use `.codex-context/solution-index.md` as the compact pointer to `docs/solutions/` and `CONCEPTS.md`; do not paste full solution docs into active state.

If present:

- `STRATEGY.md` is the project/product direction anchor for major brainstorming and planning.
- `CONCEPTS.md` is stable project vocabulary.
- `docs/solutions/` stores structured verified learnings with YAML frontmatter.

Use `codex-architecture-governance` before or after structural changes, major refactors, large-file growth, flat-directory growth, unclear ownership, or repeated bugs caused by coupling. Keep architecture facts in `project-map.md`, decisions in `decisions.md`, and structural risks in `risks.md`.

Use `codex-docs-stewardship` at milestones, before handoff, after API/architecture changes, or when README/AGENTS/docs/.codex-context may be stale. Delete, merge, or archive stale docs instead of keeping misleading notes.

Use `codex-review-panel` for meaningful code, plan, docs, architecture, or delivery reviews where correctness, testing, maintainability, standards, security, performance, reliability, API contract, UX/product, or adversarial lenses reduce risk.

## Learning Memory

Learning is curated. Hooks may automatically capture likely learning signals in `.codex-context/raw/observations.jsonl`, but those observations are compact/redacted and are not active rules.

Before compaction, final delivery, or a long pause, review pending observations with `codex-learning-memory`: save useful patterns as instincts, absorb duplicates into existing docs, or record dropped noise. Refresh `.codex-context/learned-instincts.md` after review.

For non-trivial verified fixes or reusable solutions, use `codex-solution-memory` instead of saving a loose instinct. Refresh `docs/solutions/`, `CONCEPTS.md`, and `.codex-context/solution-index.md` as needed.

## Session History

Use `codex-session-history` only when project files are insufficient or the user references previous sessions. Search metadata/keyword counts first, never paste full transcripts, and move durable findings into `.codex-context/` or `docs/solutions/`.

## Compaction

Write a fresh handoff at phase boundaries and before long pauses. The `PreCompact` hook blocks stale manual compaction. For automatic compaction, it writes an emergency `handoff-summary.md` snapshot and allows compaction to continue, because automatic compaction may happen under context pressure where a hard block can leave the session stalled.

After compaction, recover in this order:

1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/project-map.md`
4. `.codex-context/spec.md`
5. `.codex-context/plan-progress.md`
6. `.codex-context/artifact-index.md`
7. `.codex-context/solution-index.md`
8. `.codex-context/learned-instincts.md`
9. `STRATEGY.md`, `CONCEPTS.md`, or relevant `docs/solutions/` entries only when the task needs them
10. latest user instruction

## Completion

Before claiming work is complete, run fresh verification or record the explicit verification gap in `verification.md`. For observable UI/CLI/API/artifact/workflow changes, capture product evidence or explicitly record why it is blocked/not applicable. Then use `codex-git-checkpoint` to commit/push a checkpoint or record why it is deferred in `handoff-summary.md`, and refresh `handoff-summary.md`.

For installation or release hygiene, run `node .codex/hooks/project-ops.mjs health-check` from the target project when hooks are installed.
