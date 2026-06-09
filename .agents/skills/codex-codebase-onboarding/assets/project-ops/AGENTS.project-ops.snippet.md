# Codex Project Ops

Use Chinese by default unless the user asks otherwise or the project requires another language.

## Main Skill

For non-trivial project work, use `codex-project-governance` first. It coordinates discovery, spec, plan, implementation, debugging, verification, review, delivery, learning, and handoff.

## Curated Skills

Use only the bundled curated set by default:

- `using-superpowers`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `systematic-debugging`
- `verification-before-completion`
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
Use `.codex-context/instincts/` for learned instincts; keep `learned-instincts.md` as a compact index, not a dumping ground.

## Learning Memory

Learning is curated. Hooks may automatically capture likely learning signals in `.codex-context/raw/observations.jsonl`, but those observations are compact/redacted and are not active rules.

Before compaction, final delivery, or a long pause, review pending observations with `codex-learning-memory`: save useful patterns as instincts, absorb duplicates into existing docs, or record dropped noise. Refresh `.codex-context/learned-instincts.md` after review.

## Compaction

Write a fresh handoff at phase boundaries and before long pauses. The `PreCompact` hook may block manual or automatic compaction when the handoff, core state files, or learning review are stale.

After compaction, recover in this order:

1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/project-map.md`
4. `.codex-context/spec.md`
5. `.codex-context/plan-progress.md`
6. `.codex-context/artifact-index.md`
7. `.codex-context/learned-instincts.md`
8. latest user instruction

## Completion

Before claiming work is complete, run fresh verification or record the explicit verification gap in `verification.md`. Then refresh `handoff-summary.md`.
