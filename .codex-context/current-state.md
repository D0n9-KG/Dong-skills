# Current State

## Objective
Fix Dong Skills Windows hook invocation so project hooks run correctly in Codex `/hooks`, especially PreCompact/PostCompact.

## Latest User Instruction
User provided `/hooks` error details showing PowerShell parser failures for UserPromptSubmit, PreCompact, PostCompact, PostToolUse, and Stop.

## Current Phase
delivery

## Active Assumptions
- Project-level hooks remain the default; global hooks stay out of scope.
- The screenshot indicates hooks were installed and invoked; the failure was Windows command parsing, not missing hook registration.
- Existing affected projects need bootstrap repair or `.codex/hooks.json` replacement to pick up the fixed `commandWindows`.
- New projects should be protected by onboarding health-check repair and release regression tests.

## Blockers
- None.

## Next Action
Report the hook failure root cause, the pushed Dong Skills fix, and how to repair the affected project.

## Last Updated
2026-06-10 15:49 +08:00
