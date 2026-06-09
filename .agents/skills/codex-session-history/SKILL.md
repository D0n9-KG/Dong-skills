---
name: codex-session-history
description: Safely search prior Codex, Claude Code, or Cursor session history for relevant technical context without loading raw transcripts. Use when the user references previous attempts, after compaction/new sessions need recovery beyond project files, or before documenting solution memory from prior work.
---

# Codex Session History

## Purpose

Recover relevant technical facts from prior agent sessions without importing raw chat, private content, tool outputs, or reasoning into the active context.

Project files are the primary memory. Session history is a fallback for missing context, previous failed attempts, or user references such as "之前那次", "上次试过", or "前面那个 session".

## Guardrails

- Never read an entire session file into chat context.
- Never reproduce raw prompts, tool inputs, tool outputs, credentials, personal remarks, or reasoning blocks.
- Search metadata and keyword counts first.
- Deep-read only a tiny relevant excerpt when necessary, then summarize technical facts.
- Store durable conclusions in `.codex-context/decisions.md`, `verification.md`, `handoff-summary.md`, or `docs/solutions/`; do not rely on chat.
- If access fails, report the access issue. Do not repeatedly retry broad home-directory reads.

## Scan

Run the helper from a target project:

```powershell
node .codex/hooks/project-ops.mjs session-history scan --days 7 --keywords auth,token
```

Or from this kit:

```powershell
node scripts/session-history.mjs "C:\path\to\repo" scan --days 7 --keywords auth,token
```

The script returns metadata and keyword counts only. It intentionally does not print transcript content.

## Workflow

1. Define one concrete question. Narrow beats broad.
2. Start with 7 days; widen only if no candidates are found and the user intent requires it.
3. Search by repo name, branch hint, module name, error text, or feature keyword.
4. Pick at most five candidates for deeper inspection.
5. Extract only the relevant skeleton or excerpt with native file tools.
6. Summarize only:
   - what was tried before
   - what did not work
   - key decisions
   - related context
7. Move useful durable facts into project files.

## Output

Report:

- scan window and keywords
- candidate count
- technical findings
- what was deliberately excluded for privacy
- project files updated, if any

If nothing relevant is found, say `no relevant prior sessions` and stop.

