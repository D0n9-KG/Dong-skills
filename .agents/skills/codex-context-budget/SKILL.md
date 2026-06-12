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

## What To Inspect

- `AGENTS.md` and nested `AGENTS.md`
- `.agents/skills/*/SKILL.md`
- `.codex/hooks.json`
- `.codex/hooks/*.mjs`
- `.codex-context/*.md`
- `STRATEGY.md`, `CONCEPTS.md`, and `docs/solutions/` indexes when they are loaded into active context
- MCP configs if present: `.mcp.json`, `.codex/config.toml`

`.codex-context/raw/`, `.codex-context/archive/`, full session histories, and full `docs/solutions/` bodies are excluded from active-budget estimates because they are read only on demand. Keep `.codex-context/solution-index.md` as the compact active pointer.

## Heuristics

- prose: words times 1.3
- code or mixed files: chars divided by 4
- long skill body over 400 lines: candidate for references
- `AGENTS.md` over 250 lines: candidate for slimming
- state files with raw logs pasted in: move logs to `.codex-context/raw/`
- old verification history: archive with `state-prune` instead of deleting evidence
- `docs/solutions/` growth: consolidate duplicates with `codex-solution-memory`; do not paste all solutions into active state
- session history: search metadata first with `codex-session-history`; never bulk-load transcripts

## Recommendations

Report:

- total estimated tokens
- largest files
- always-loaded files vs on-demand skills
- duplicate or stale guidance
- top three reductions with estimated savings

Do not remove guidance automatically. Recommend deletions or splits, then let the user decide unless they already asked for cleanup.

Do not weaken phase gates, verification gates, privacy rules, or destructive-operation safeguards just to save tokens. If a rule is too verbose, shorten it while preserving the constraint.

## State Updates

When the audit changes project direction or exposes bloat that affects future work:

- update `.codex-context/risks.md` with context-pressure risks
- update `.codex-context/decisions.md` for accepted guidance removals or splits
- update `.codex-context/plan-progress.md` if cleanup becomes a task
- update `.codex-context/handoff-summary.md` before pausing
