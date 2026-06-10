# Current State

## Objective
Fix Dong Skills hook JSON output so `PostCompact` no longer returns event-specific fields unsupported by Codex.

## Latest User Instruction
User showed `/hooks` reporting `hook returned invalid PostCompact hook JSON output`, noted `PreCompact` itself did not show the same error, and asked to fix it.

## Current Phase
delivery

## Active Assumptions
- Official Codex hook behavior distinguishes common output fields from event-specific outputs.
- `PostCompact` should use common hook output only; recovery context should continue to come from `SessionStart` when start source is `compact`.
- `PreCompact` manual path is not currently failing, but its auto path should avoid event-specific `hookSpecificOutput` to prevent the same schema issue.
- The active Science Evo project should receive the fixed project hook runtime after the Dong Skills kit is verified.

## Blockers
- None.

## Next Action
Report the hook schema fix, GitHub push, and Science Evo runtime sync to user.

## Last Updated
2026-06-10 21:04 +08:00
