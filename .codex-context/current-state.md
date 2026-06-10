# Current State

## Objective
Fix Dong Skills Windows hook invocation so project hooks run correctly in Codex `/hooks`, especially PreCompact/PostCompact.

## Latest User Instruction
User provided `/hooks` error details showing PowerShell parser failures for UserPromptSubmit, PreCompact, PostCompact, PostToolUse, and Stop.

## Current Phase
checkpoint

## Active Assumptions
- Project-level hooks remain the default; global hooks stay out of scope.
- The screenshot indicates hooks were installed and invoked; the failure was Windows command parsing, not missing hook registration.
- Existing affected projects need bootstrap repair or `.codex/hooks.json` replacement to pick up the fixed `commandWindows`.
- New projects should be protected by onboarding health-check repair and release regression tests.

## Blockers
- None.

## Next Action
Commit and push the verified Windows hook hardening, then tell the user how to repair the affected project and confirm hook behavior.

## Last Updated
2026-06-10 15:41 +08:00
