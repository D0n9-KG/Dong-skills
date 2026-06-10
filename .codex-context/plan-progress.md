# Plan Progress

## Active Plan
Windows hook invocation hardening.

## Tasks
- [x] Identify `/hooks` failures as outer PowerShell expansion of inline `$root` / `$null`.
- [x] Replace root and onboarding asset `commandWindows` with `-EncodedCommand`.
- [x] Strengthen health check to reject unsafe or wrong Windows hook commands.
- [x] Add regression tests for encoded command contents and outer PowerShell execution.
- [x] Update onboarding bootstrap gate so stale installed projects rerun bootstrap after health-check failure.
- [x] Sync global skills from the verified kit.
- [ ] Commit, push, and verify remote.

## Current Step
Checkpoint and remote verification.

## Out Of Scope
- Global hooks.
- Changing Codex's automatic compaction implementation.
- Programmatic inspection of another project's live `/hooks` UI trust state.
