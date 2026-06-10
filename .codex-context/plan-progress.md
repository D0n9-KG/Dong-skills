# Plan Progress

## Active Plan
PreCompact automatic compaction fallback hardening.

## Tasks
- [x] Separate this issue from the earlier Windows `commandWindows` parser failure.
- [x] Verify official Codex hook behavior: `PreCompact` matcher values are `manual` and `auto`; hooks are enabled by default; `commandWindows` is the Windows override.
- [x] Change `preCompact` to receive hook input and detect compact trigger from compatible fields.
- [x] Keep strict blocking for explicit manual compaction when handoff/state/learning/checkpoint gates are stale.
- [x] For automatic or unknown trigger, write an emergency `handoff-summary.md`, archive the previous handoff under `.codex-context/raw/`, and return `continue: true`.
- [x] Sync onboarding asset hook runtime and hook entrypoint.
- [x] Update README, AGENTS snippet, and project governance skill docs to describe the new manual-vs-auto behavior.
- [x] Add regression coverage for manual blocking and automatic emergency handoff.
- [x] Save a project instinct for automatic PreCompact fallback.
- [x] Run syntax checks, targeted tests, health check, release check, and diff whitespace check.
- [x] Sync global skills.
- [x] Commit local checkpoint.
- [x] Push to GitHub.
- [ ] Report outcome and affected-project repair path to user.

## Current Step
Report outcome and affected-project repair path to user.

## Out Of Scope
- Changing Codex's internal automatic compaction implementation.
- Guaranteeing Codex Desktop will always render hook feedback in chat for blocked automatic compaction.
- Programmatic inspection of another project's live `/hooks` UI trust state.
