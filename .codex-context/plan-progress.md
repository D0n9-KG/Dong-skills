# Plan Progress

## Active Plan
PostCompact hook output schema repair.

## Tasks
- [x] Reproduce the Science Evo `PostCompact` hook output manually and confirm stdout is valid JSON.
- [x] Identify root cause as unsupported event-specific `hookSpecificOutput.additionalContext` on `PostCompact`, not JSON syntax corruption.
- [x] Change `PostCompact` to emit only common hook output: `{ "continue": true }`.
- [x] Remove `hookSpecificOutput` from `PreCompact` auto path while keeping `continue: true` and `systemMessage`.
- [x] Keep `SessionStart` recovery context injection unchanged.
- [x] Sync onboarding asset `events.mjs`.
- [x] Update README and project governance skill wording for `PostCompact`.
- [x] Add regression tests for `PostCompact` common-only output and `PreCompact` auto without `hookSpecificOutput`.
- [x] Run syntax checks, targeted tests, health check, and release check.
- [x] Sync global skills.
- [x] Sync Science Evo project hook runtime.
- [ ] Commit and push Dong Skills.
- [ ] Report result to user.

## Current Step
Commit and push Dong Skills.

## Out Of Scope
- Changing Codex internal compaction behavior.
- Adding hook-run telemetry logs in this fix.
- Editing Science Evo business/source/docs files beyond project hook runtime repair.
