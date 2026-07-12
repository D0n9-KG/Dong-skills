---
name: codex-asset-governance
description: Govern project asset lifecycle for Dong Skills. Use when docs, `.codex-context`, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, or code assets may be stale, duplicated, orphaned, too large, unsafe to commit, or accumulating without a reader/owner/reason; also use before milestone handoff, compaction, release, or long-running project cleanup.
---

# Codex Asset Governance

Use this as the lifecycle sweep across files that accumulate during long Codex work. This skill coordinates docs stewardship, context budget, architecture governance, solution memory, and Git checkpointing without replacing them.

## First Principle

Every durable asset needs a current reader, owner, reason, and maintenance trigger. If it lacks one, classify it and act.

## Classification

- `Keep`: accurate, referenced, current, and still useful.
- `Update`: useful, but paths, commands, examples, metadata, or status are stale.
- `Consolidate`: overlaps another asset; merge into one canonical file and delete the duplicate.
- `Replace`: conflicts with verified current behavior; write the new truth and remove the old one.
- `Delete`: no current reader, owner, reason, reference, or retention requirement.
- `Stale`: cannot verify now; mark it stale and stop treating it as active truth.
- `Raw-Prune`: runtime-only raw material exceeds retention.
- `Safe-Auto`: generated emergency notices and retained raw snapshots that can be archived or pruned without changing project truth.
- `Confirm-First`: tracked docs, source code, specs, decisions, solution memory, user-approved records, or any asset whose reader/owner/reason is unclear.

Prefer deletion over archive folders for duplicate or obsolete durable docs; Git history is the archive. Use `.codex-context/archive/` only for evidence/history that must remain easy to find but should not load in active context.

## Scope

Inspect:

- `.codex-context/*.md`
- `.codex-context/raw/*`
- `.codex-context/archive/*`
- `.codex-context/instincts/**/*.md`
- `README.md`, `AGENTS.md`, nested `AGENTS.md`
- `docs/**/*.md`, `docs/solutions/**/*.md`, `docs/improvements/backlog.md`
- `STRATEGY.md`, `CONCEPTS.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks/**`, `.codex/scripts/**`, `scripts/**`, tests, and generated evidence paths
- deliberate simplification markers: `dong-debt: <ceiling>; revisit when <trigger>`

Do not treat raw runtime data as active knowledge. Do not commit raw observations, logs, backups, local paths, or private evidence.

## Audit Command

Run:

```powershell
node .codex/hooks/project-ops.mjs asset-governance
```

Useful options:

```powershell
node .codex/hooks/project-ops.mjs asset-governance --keep-verification 8 --keep-precompact 5 --raw-days 30
node .codex/hooks/project-ops.mjs asset-governance --raw-total-warn-mb 100 --raw-largest-warn-mb 1
node .codex/hooks/project-ops.mjs asset-governance --apply
```

Dry-run is the default. `--apply` only performs Safe-Auto cleanup: it prunes generated `precompact-auto-*.md` raw snapshots that exceed retention, and archives a temporary `PreCompact Emergency Notice` out of `handoff-summary.md` when a preserved normal handoff body exists below it. It must not delete `observations.jsonl`.

## Raw Lifecycle

- `observations.jsonl`: learning-candidate input. Review with `codex-learning-memory`; do not prune with generic raw cleanup.
- `precompact-auto-*.md`: backup/audit snapshot. Keep the newest few, and prune old ones by count or age.
- `PreCompact Emergency Notice` in `handoff-summary.md`: temporary rescue content. After recovery, run `asset-governance --apply` to archive the notice if the normal handoff body was preserved below it, or refresh a clean handoff manually if no preserved body exists.
- UI screenshots, logs, command dumps, and generated evidence: keep in `.codex-context/raw/` only while needed for verification or handoff; summarize durable facts into `verification.md`, `handoff-summary.md`, or `docs/solutions/`, then prune raw files.
- Large raw corpora, PDFs, service dumps, or evidence batches need a current owner, reason, and retention trigger even when they are ignored by Git. If raw footprint warnings appear, classify the largest folders/files before the next milestone.
- `dong-debt:` markers: active code comments for accepted simplifications. They need a ceiling and a revisit trigger; markers without a trigger are lifecycle risk, not active memory.

## Active State Semantics

Asset governance now checks semantic drift, not only file size.

- `handoff-summary.md` must start from the current business/project task. If the top section is about Dong Skills upgrades, Stop loops, PreCompact, hooks, runtime, or recovery debugging, archive that maintenance history and rewrite the active handoff around the real task.
- `current-state.md` must contain one current conclusion. Do not leave both unresolved and resolved versions of the same Stop/runtime/recovery issue in the active summary; preserve the trail in `.codex-context/archive/`.
- `working-notes.md` is transient investigation state. Closed Stop/Git/hook/debug investigations should be promoted to a concise conclusion, then archived or removed from active notes.
- `open-questions.md` should use an explicit lifecycle: `open`, `resolved`, `superseded`, or `archived`. Repeated headings for the same infrastructure issue should be consolidated.
- Dong Skills maintenance records belong in a scoped audit section or archive after the maintenance task closes. They should not dominate the next session's recovery path for the business project.

## Update Matrix

- State file stale or contradictory: update `.codex-context/current-state.md`, `spec.md`, `plan-progress.md`, `working-notes.md`, `decisions.md`, `risks.md`, or `handoff-summary.md` as appropriate.
- Semantic state drift: rewrite the active state file around current project truth, then archive the old infrastructure/debug trail. Do not keep appending "fixed now" below stale contradictory sections.
- Verification bloat: run `state-prune --verification --archive --keep-latest 8 --apply` after ensuring fresh evidence remains. This archives older command evidence, keeps recent proof active, and adds an archive pointer to `verification.md`.
- PreCompact notice bloat: run `asset-governance --apply` after recovery. It archives the temporary notice to `.codex-context/archive/` and restores `handoff-summary.md` to the preserved normal body when safe.
- Docs duplicate or conflict: use `codex-docs-stewardship`; consolidate into the canonical doc and delete the duplicate.
- Solution docs duplicate/stale: use `codex-solution-memory` refresh mode.
- Code concentration, flat directories, duplicate concepts, or orphan scripts: use `codex-architecture-governance` before restructuring.
- Context pressure: use `codex-context-budget` and keep archives/raw/full solutions on demand.
- Dong Skills improvement ideas: update `docs/improvements/backlog.md`, not project instincts.
- Deliberate simplification debt: use `codex-simplicity-review` to decide whether to remove, keep, or upgrade the shortcut; keep valid `dong-debt:` markers near the code they explain.

## Milestone Sweep

Before long pauses, compaction, release, or major handoff:

1. Run `asset-governance`.
2. Run `state-prune --verification --archive --keep-latest 8 --dry-run` if verification bloat is reported.
3. If semantic state advisories appear, restore active handoff/current-state/working-notes/open-questions to current project truth before continuing.
4. Run docs/solution/architecture scans only for affected areas.
5. Apply only safe, scoped cleanup.
6. Refresh `artifact-index.md`, `current-state.md`, `verification.md`, and `handoff-summary.md`.
7. Use `codex-git-checkpoint` when cleanup or implementation changes should be archived.

## Stop Conditions

Stop before deleting or moving assets when:

- The asset may contain user data, credentials, generated deliverables, or private evidence.
- A file is referenced by README, AGENTS, hooks, scripts, tests, CI, or recovery order.
- The action would rewrite history, remove a worktree, or delete non-Dong-managed output.
- The classification is unclear after a quick reader/owner/reason check.
