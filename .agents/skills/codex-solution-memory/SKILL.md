---
name: codex-solution-memory
description: Capture and maintain structured project learnings in docs/solutions/ and CONCEPTS.md, adapted from Compound Engineering ce-compound and ce-compound-refresh. Use after verified non-trivial fixes, durable workflow discoveries, architecture decisions, stale learning cleanup, or when an agent should search past solutions before work.
---

# Codex Solution Memory

## Purpose

Use this for durable, structured learnings that are bigger than a small instinct. `codex-learning-memory` stores short behavioral instincts. This skill stores reusable solution documents under `docs/solutions/` and shared vocabulary in `CONCEPTS.md`.

The rule is the Compound Engineering rule: each solved unit of work should make the next related unit easier.

## When To Use

- A non-trivial bug was fixed and verified.
- A repeated investigation produced a reusable pattern.
- A project convention or architecture choice needs examples and rationale.
- Existing `docs/solutions/` entries may be stale, duplicate, misleading, or missing from project instructions.
- A new session is about to work in an area where past solutions may exist.

Do not save unverified speculation, raw chat, secrets, one-off typo fixes, or generic advice that is already obvious from `AGENTS.md`.

Do not use this skill for Dong Skills hook, skill, README, installer, or governance improvement proposals. Record those in `docs/improvements/backlog.md` as Dong Skills meta-learning unless the user explicitly asks to implement the optimization immediately.

## Knowledge Stores

- `docs/solutions/<category>/<slug>.md`: one solved problem or reusable guidance.
- `docs/solutions/README.md`: overview of the knowledge store.
- `CONCEPTS.md`: stable project vocabulary, not implementation notes.
- `.codex-context/solution-index.md`: compact index for recovery after compaction.

## Modes

### Capture

Use after verified work while context is fresh.

1. Confirm the problem is solved and verification is recorded in `.codex-context/verification.md`.
2. Search existing `docs/solutions/` before writing:

```powershell
node .codex/hooks/project-ops.mjs solution-status
```

3. If overlap is high, update the existing doc instead of creating a duplicate.
4. Create or update one solution document using `references/solution-template.md`.
5. Validate frontmatter:

```powershell
node .codex/hooks/project-ops.mjs solution-validate
```

6. Update `.codex-context/solution-index.md`:

```powershell
node .codex/hooks/project-ops.mjs solution-status --update-index
```

### Refresh

Use when learnings may have drifted.

1. Run status and inspect refresh candidates.
2. Classify each candidate as Keep, Update, Consolidate, Replace, Delete, or Stale.
3. Prefer no edit for Keep.
4. Update only when paths, metadata, examples, or references drifted but the core guidance remains correct.
5. Replace when the old solution conflicts with current code or a newer verified solution.
6. Consolidate overlapping docs into one canonical doc; delete the subsumed doc. Git history is the archive.
7. Mark ambiguous docs `status: stale` with `stale_reason` and `stale_date`.

### Search

Before implementing or debugging in a documented area:

1. Search by module, scope, tags, error text, and problem type.
2. Read frontmatter first; fully read only strong candidates.
3. Treat old docs as evidence to verify against current code, not as unquestionable truth.

## CONCEPTS.md

Read `references/concepts-vocabulary.md` before editing concepts.

Add a term only when it is a stable project-specific entity, named process, lifecycle state, or domain word that future agents need to share precisely. Do not add file names, function names, current config values, status reports, owners, dates, or implementation details.

## Required Frontmatter

Read `references/frontmatter-schema.md` when writing or validating a solution. Required fields are:

- `title`
- `date`
- `track`
- `category`
- `problem_type`
- `status`
- `scope`
- `tags`
- `verified_by`

Use `track: bug` for fixed failures and `track: knowledge` for reusable guidance.

## Discoverability

After creating `docs/solutions/` or `CONCEPTS.md`, make sure `AGENTS.md` surfaces them. A future agent should learn:

- the knowledge store exists
- how it is organized
- when it is relevant

Add the smallest natural line to an existing section rather than creating a new section unless no natural place exists.

## Final Output

Report:

- created/updated/deleted solution files
- validation result
- whether `CONCEPTS.md` changed
- whether `AGENTS.md` discoverability is sufficient
- whether `.codex-context/solution-index.md` was refreshed

## State Updates

After changing solution memory:

- update `.codex-context/solution-index.md`
- update `.codex-context/artifact-index.md` for solution docs, `CONCEPTS.md`, and `AGENTS.md`
- update `.codex-context/current-state.md` when the solution affects current work
- update `.codex-context/handoff-summary.md` before pausing or compacting
