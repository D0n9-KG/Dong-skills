---
name: codex-learning-memory
description: Project-scoped and global-candidate learning memory for Codex, adapted from ECC continuous-learning-v2. Use after verified work, user corrections, repeated workflow discoveries, failed assumptions, review outcomes, or when evaluating, promoting, retiring, deduplicating, or pruning learned instincts.
---

# Codex Learning Memory

Capture reusable experience as curated instincts, not loose notes. This skill adapts ECC continuous-learning-v2's instinct model for Codex without requiring vendor-specific observer agents.

Use `codex-solution-memory` instead when the learning needs a full problem/solution document, examples, cross-references, or `CONCEPTS.md` vocabulary. This skill is for short trigger/action instincts.

If the signal is about Dong Skills itself, do not turn it into a project instinct. Record it in the global Dong Skills improvement backlog instead of active project memory.

## Capture Mode

Learning is curated, not fully automatic.

- Automatic hooks may capture raw learning observations from `UserPromptSubmit` when the user gives an explicit learning request, correction, durable preference, or recurring workflow rule.
- Raw observations are stored in `.codex-context/raw/observations.jsonl`.
- Raw observations are not active memory and must not be treated as rules.
- Raw observations contain a short redacted excerpt plus a prompt fingerprint; do not reconstruct or store secrets from the original prompt.
- Active instincts are created only after this skill applies the quality gate below.
- After reviewing raw observations, refresh `.codex-context/learned-instincts.md`; its timestamp is the hook-visible signal that pending learning review was handled.

If a hook blocks Stop or PreCompact because learning review is pending, read the newest raw observations, decide Save / Improve then Save / Absorb into Existing / Drop, then update `learned-instincts.md` with the result.

## Storage

Project truth lives in the repo:

- `.codex-context/learned-instincts.md` - readable index and maintenance summary
- `.codex-context/instincts/project/` - active project-scoped instincts
- `.codex-context/instincts/candidates/` - draft instincts awaiting evidence or review
- `.codex-context/instincts/retired/` - contradicted, obsolete, or superseded instincts
- `.codex-context/raw/observations.jsonl` - compact raw learning events captured by hooks or manual review

Use global scope only as a candidate unless the user explicitly asks for a global rule. Global candidates can be copied to a personal global store later, but this kit does not silently write outside the project.

## What To Capture

Capture only when the pattern is likely to be used again and would reduce future trial-and-error. At least one must be true:

- The user corrected a misunderstanding, boundary, workflow, style, or priority.
- A verified fix revealed a reusable project convention.
- Review feedback exposed a repeatable risk.
- A repeated workflow saved time and has evidence.
- A failed assumption should be avoided in future work.
- A cross-project environment or tooling fact will affect future Codex behavior, such as Windows paths, PowerShell command shape, encoding, line endings, or hook/worktree behavior.

Do not capture:

- secrets, private raw chat, credentials, or long excerpts
- unverified fixes
- simple typos or one-off tool failures
- one-time status, progress, or file-change summaries that belong in `current-state.md`, `plan-progress.md`, or `handoff-summary.md`
- vague preferences with no trigger
- duplicate guidance already present in `AGENTS.md`, `.codex-context/`, or a skill
- material that belongs as a structured `docs/solutions/` entry

## Dong Skills Meta-Learning

If the observation is about hooks, skills, docs, installation, recovery flow, or other Dong Skills behavior:

- record it in `docs/improvements/backlog.md`
- classify it as a skill optimization candidate, not a project instinct
- keep it separate from reusable project behavior and from solution memory

## Quality Gate

Before saving an instinct, run this decision process:

1. **Extract** one candidate pattern with one trigger and one action.
2. **Classify scope**:
   - `project`: repo conventions, architecture, file locations, framework choices
   - `global-candidate`: user workflow preferences or cross-project practices
3. **Deduplicate**: search existing instincts, `AGENTS.md`, state files, and relevant skills.
   - Also search `docs/solutions/` for durable solution docs before saving an instinct.
4. **Evaluate**:
   - Save: unique, specific, evidence-backed, reusable
   - Improve then Save: valuable but too broad or underspecified
   - Absorb into Existing: duplicate or better as an update to another instinct/doc
   - Promote to Solution Memory: needs full problem, solution, rationale, examples, or vocabulary
   - Drop: trivial, one-off, unverified, stale, or unsafe
5. **Record evidence**: command output, user correction, review item, or file reference.
6. **Update index**: refresh `.codex-context/learned-instincts.md`.

If unsure, save to `instincts/candidates/` with confidence `0.3`, not to active project instincts.

## Instinct File Format

Use one Markdown file per instinct:

```markdown
---
id: prefer-existing-helper-before-new-one
title: Prefer existing helpers before adding new ones
scope: project
domain: code-style
status: active
confidence: 0.5
created: 2026-06-09
last_checked: 2026-06-09
source: user-correction
---

# Prefer existing helpers before adding new ones

## Trigger
Before adding a new utility, helper, wrapper, or abstraction.

## Action
Search existing helpers and call sites first; reuse or extend an existing helper when it fits.

## Evidence
- 2026-06-09: User rejected a duplicate helper in `path/to/file`.

## Contraindications
- Do not force reuse when the existing helper has the wrong contract or ownership.
```

## Confidence

- `0.3`: candidate; mention only when directly relevant.
- `0.5`: useful pattern; apply with judgment.
- `0.7`: strong project behavior; apply by default when relevant.
- `0.9`: near-certain rule; requires repeated evidence and no contradiction.

Increase confidence when the pattern repeats or the user confirms it. Decrease or retire it when contradicted.

## Domains

Use one of these unless a better project-specific domain is obvious:

- `workflow`
- `code-style`
- `architecture`
- `testing`
- `debugging`
- `verification`
- `docs`
- `security`
- `performance`
- `user-preference`
- `tooling`

## Maintenance Commands

Run from the target project after installing hooks:

```powershell
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs instinct-promotion-candidates
node .codex/hooks/project-ops.mjs learning-status
```

Or from this kit:

```powershell
node scripts/instincts.mjs status C:\path\to\repo
node scripts/instincts.mjs validate C:\path\to\repo
node scripts/instincts.mjs prune C:\path\to\repo --dry-run
```

## Maintenance Rules

During handoff, cleanup, or after a user correction:

- merge duplicates
- move weak drafts older than 30 days to `retired/` or drop them
- retire contradicted instincts instead of leaving stale rules active
- promote only when the same behavior appears in at least two unrelated projects or the user says it is global
- keep `learned-instincts.md` short enough to read after compaction
