---
name: codex-context-budget
description: Audit context cost and bloat for Codex project work. Use when the user asks about token usage, context pressure, too many skills/hooks/MCP tools, slow or drifting sessions, installing new skills, or whether AGENTS.md, skills, hooks, and `.codex-context` files are too large.
---

# Codex Context Budget

Use this skill to keep the governance system from becoming the problem.

## Quick Audit

Run:

```powershell
node .codex/hooks/project-ops.mjs context-budget
```

If the hook script is not installed in the target project, run the bundled script from this kit:

```powershell
node scripts/context-budget.mjs <project-root>
```

If `.codex-context/verification.md` is bloated with old command history, preview archival:

```powershell
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
```

For broader asset lifecycle pressure, run:

```powershell
node .codex/hooks/project-ops.mjs asset-governance
```

## What To Inspect

- `AGENTS.md` and nested `AGENTS.md`
- `.agents/skills/*/SKILL.md`
- `.codex/hooks.json`
- `.codex/hooks/*.mjs`
- `.codex-context/*.md`
- `STRATEGY.md`, `CONCEPTS.md`, and `docs/solutions/` indexes when they are loaded into active context
- MCP configs if present: `.mcp.json`, `.codex/config.toml`

`.codex-context/raw/`, `.codex-context/archive/`, full session histories, and full `docs/solutions/` bodies are excluded from active-budget estimates because they are read only on demand. Keep `.codex-context/solution-index.md` as the compact active pointer.

## Report Buckets

Read the report by bucket, not just by total scanned tokens:

- `Hot recovery path`: files likely to be read on session start, compaction recovery, or router selection. This is the number that should stay small.
- `Warm on-demand path`: phase skills and state files that should be read only when their workflow is active.
- `Cold runtime/bootstrap path`: hook/runtime/helper scripts. These affect Dong Skills maintenance cost, but they are not normally model context in ordinary project work.

Default thresholds:

- Hot path over 35k tokens: warning; reduce active state or router/spec verbosity.
- Hot path over 45k tokens: failure-level context pressure; prune/archive or split before adding more process.
- Warm/cold heaviness is an optimization queue, not an immediate user-work blocker unless the current task is modifying those files.

Do not tell the user "Dong Skills uses X tokens" from the total scanned number alone. State both total scanned and hot recovery path.

## Heuristics

- prose: words times 1.3
- code or mixed files: chars divided by 4
- long skill body over 400 lines: candidate for references
- `AGENTS.md` over 250 lines: candidate for slimming
- state files with raw logs pasted in: move logs to `.codex-context/raw/`
- old verification history: archive with `state-prune` instead of deleting evidence
- old `precompact-auto-*.md` raw snapshots: prune with `asset-governance --apply`; do not prune `observations.jsonl` generically
- `docs/solutions/` growth: consolidate duplicates with `codex-solution-memory`; do not paste all solutions into active state
- session history: search metadata first with `codex-session-history`; never bulk-load transcripts

## Recommendations

Report:

- total scanned tokens
- hot recovery path tokens and status
- warm on-demand and cold runtime/bootstrap tokens
- largest hot files vs largest warm/cold files
- duplicate or stale guidance
- top three reductions with estimated savings

Do not remove guidance automatically. Recommend deletions or splits, then let the user decide unless they already asked for cleanup.

Do not weaken phase gates, verification gates, privacy rules, or destructive-operation safeguards just to save tokens. If a rule is too verbose, shorten it while preserving the constraint.

## Recovery Probe Evaluation

Token size is not enough to judge compaction quality. After changing handoff, recovery, summary, or context-loading behavior, start from the recovered artifacts and answer a fixed probe set without relying on chat memory:

For an actual post-compaction or new-session resume, read `.codex-context/handoff-summary.md` first. The Active Wayfinder path in `current-state.md` is only a pointer: recovery must include the bounded Wayfinder summary and the referenced map sections before work continues.

Run the executable evaluator:

```powershell
node .codex/hooks/project-ops.mjs context-recovery-eval
```

- Do not continue when the evaluator fails. Repair the stale or missing state first.
- file and symbol locations needed for the next edit
- decisions and rejected paths that constrain implementation
- risks and forbidden actions
- next action and verification evidence
- current task identity, approvals, execution mode, and blocking decision

Record whether each probe is correct, missing, stale, or ambiguous. A compact handoff that cannot answer these probes is lower quality than a larger one that can.

Also observe repeated re-fetches after recovery. If the agent repeatedly reopens the same files or rediscovers the same decision because the recovery path omitted a pointer, treat that as context-loss evidence and improve the handoff or index. Do not copy full source bodies into hot context to eliminate every re-fetch; preserve concise pointers and the decisions that make those reads meaningful.

Prefer reductions in this order:

1. Archive oversized active state files into `.codex-context/archive/` while keeping compact active summaries.
2. Move long skill examples, templates, or checklists into `references/` and keep hard gates in `SKILL.md`.
3. Split large hook/runtime modules only when maintaining Dong Skills itself; runtime size is usually cold context for ordinary projects.

## State Updates

When the audit changes project direction or exposes bloat that affects future work:

- update `.codex-context/risks.md` with context-pressure risks
- update `.codex-context/decisions.md` for accepted guidance removals or splits
- update `.codex-context/plan-progress.md` if cleanup becomes a task
- update `.codex-context/handoff-summary.md` before pausing
