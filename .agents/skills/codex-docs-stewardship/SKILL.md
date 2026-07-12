---
name: codex-docs-stewardship
description: Keep project docs, AGENTS guidance, README, docs, and `.codex-context` clean and current. Use at milestones, before handoff, after architecture or API changes, when docs may be stale, when state files grow too large, or when the user asks to sync, tidy, clean up, archive, update memory, or make the project easy for a new agent or developer to resume.
---

# Codex Docs Stewardship

## Purpose

Act as an editor, not a recorder. The goal is a small, accurate knowledge system that lets a human or future Codex session recover the project quickly. For whole-workspace lifecycle sweeps that include raw files, archives, generated evidence, scripts, hooks, tests, or code assets, use `codex-asset-governance` first.

## Inventory First

1. Enumerate docs and state files before editing:
   - `README.md`
   - `AGENTS.md`
   - `STRATEGY.md`
   - `CONCEPTS.md`
   - `docs/**/*.md`
   - `docs/solutions/**/*.md`
   - `.codex-context/*.md`
   - `.codex-context/instincts/**/*.md`
2. Run the optional scan when useful:

```powershell
node "<skill-dir>\scripts\docs-scan.mjs" "<project-root>"
```

For broader asset lifecycle issues, also run:

```powershell
node .codex/hooks/project-ops.mjs asset-governance
```

3. Mark each file internally as `update`, `delete/archive`, or `leave`.

## Reader / Owner / Reason Test

Every durable document should have:

- a current reader
- a current owner or maintenance trigger
- a current reason to exist

If a file fails this test, either delete it, merge the useful part into the right file, or archive it under an explicit archive path. Do not leave stale breadcrumbs.

## Reconcile Against Code

Check docs against current repo facts:

- paths and filenames exist
- commands match manifests, scripts, or CI
- environment variables are documented where users need them
- APIs/routes/data models are reflected in external-facing docs and architecture docs
- `.codex-context/project-map.md` matches current structure
- `.codex-context/decisions.md` records load-bearing decisions
- `.codex-context/verification.md` has recent evidence or explicit gaps
- `.codex-context/solution-index.md` matches `docs/solutions/` and `CONCEPTS.md`
- `docs/solutions/` entries have valid frontmatter and are not stale, duplicate, or contradicted by current code
- `CONCEPTS.md` contains stable vocabulary only, not implementation notes or task logs

When `docs/solutions/` exists, run:

```powershell
node .codex/hooks/project-ops.mjs solution-status --update-index
```

## State File Hygiene

- Keep `.codex-context/current-state.md`, `plan-progress.md`, `working-notes.md`, and `handoff-summary.md` compact.
- Keep active state files semantic, not chronological. They should answer "what is true now, what should happen next" before they preserve how the project got there.
- `handoff-summary.md` must start with the current business/project task and next action. Move resolved Dong Skills upgrades, Stop loops, PreCompact notices, hook runtime investigations, Git identity rebuilds, and recovery debugging into archive or a short audit note below the main handoff.
- `current-state.md` must not carry contradictory stale/resolved versions of the same issue. Rewrite the active summary to one current conclusion, then archive the superseded trail.
- Treat `working-notes.md` as transient investigation state: promote durable findings into spec, decisions, current-state, handoff, or solution docs, then remove stale exploration residue.
- Treat `open-questions.md` as a decision queue with lifecycle. Mark old questions `resolved`, `superseded`, or `archived`; consolidate repeated headings instead of appending the same maintenance question again.
- Append new verification evidence to the end of `.codex-context/verification.md`; `state-prune` treats later command entries as newer.
- Move long logs to `.codex-context/raw/` when they are runtime-only.
- Archive old verification evidence with:

```powershell
node .codex/hooks/project-ops.mjs state-prune --keep 8 --apply
```

- Keep `.codex-context/learned-instincts.md` as an index; detailed instincts live under `.codex-context/instincts/`.

## Update Matrix

- New command: update README/AGENTS, project-map Commands, and verification.
- New API or integration: update README or docs, project-map Architecture, risks, and verification.
- New module or structural decision: update project-map, decisions, risks, and architecture watchpoints.
- User correction or durable preference: evaluate with `codex-learning-memory`, then update learned instincts.
- Verified non-trivial fix or reusable solution: evaluate with `codex-solution-memory`, then update `docs/solutions/`, `CONCEPTS.md`, and `solution-index.md`.
- Strategy change: update `STRATEGY.md`, decisions, risks, and any specs/plans that depend on it.
- Milestone handoff: update handoff-summary, artifact-index, verification, working-notes promotion/cleanup, and Git Checkpoint.
- Dong Skills maintenance in a business project: close with a concise audit record, then restore active handoff/current-state focus to the business project before handing off.

## Final Check

Before reporting completion:

- no stale relative dates such as today/yesterday/recently unless they are intentionally quoted
- no docs claim commands that were not verified or marked as gaps
- no duplicate/conflicting instructions across README, AGENTS, and `.codex-context`
- no active handoff/current-state/open-questions sections that are dominated by resolved Dong Skills maintenance instead of the current project task
- `docs/solutions/` and `CONCEPTS.md` are surfaced in `AGENTS.md` once adopted
- no raw observations or logs committed outside `.codex-context/raw/`
- handoff names files to re-read first
