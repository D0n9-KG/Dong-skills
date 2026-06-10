# Learned Instincts

## Summary
Keep this file as a compact index. Store individual instincts under `.codex-context/instincts/`.

## Raw Observation Review
- Last reviewed raw observations: None yet.
- Review rule: convert useful events into instincts, absorb duplicates into existing docs, or record a deliberate drop.

## Active Project Instincts
- `windows-hooks-use-encoded-command`: use `-EncodedCommand` for Windows hook wrappers and verify through an outer PowerShell invocation before release.
- `precompact-auto-writes-emergency-handoff`: automatic PreCompact must write emergency handoff and allow compaction instead of hard-blocking silently.

## Candidate Instincts
- None yet.

## Retired / Contradicted / Superseded
- None yet.

## Promotion Candidates
- None yet.

## Maintenance Log
- 2026-06-09: Learning status checked after governance optimization; no raw observations or candidate instincts were pending.
- 2026-06-10: Observed that `state-prune` keeps later `Commands Run` entries as newer; absorbed the rule into `codex-verification-loop` and `codex-docs-stewardship` instead of creating a separate instinct.
- 2026-06-10: Saved verified project instinct for Windows hook command quoting after `/hooks` surfaced PowerShell parser failures.
- 2026-06-10: Saved verified project instinct for automatic PreCompact fallback after user reported silent stopping without hook feedback.
