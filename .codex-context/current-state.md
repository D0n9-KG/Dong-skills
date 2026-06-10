# Current State

## Objective
Fix Dong Skills `PreCompact` behavior so automatic compaction does not silently hard-stop when recovery state is stale.

## Latest User Instruction
User reported that hooks appear problematic, especially the pre-compaction hook: automatic compaction stops, but no hook feedback is shown.

## Current Phase
delivery

## Active Assumptions
- The latest screenshot indicates hooks are now invoked; the current failure mode is PreCompact behavior, not the earlier Windows command parser failure.
- Official Codex manual confirms `PreCompact` supports `manual` and `auto` matcher values, but does not guarantee chat-visible feedback when automatic compaction is blocked.
- Treating unknown compact trigger input as `auto` is safer than hard-blocking at context pressure.
- Existing projects need bootstrap repair or updated `.codex` project assets to receive the new behavior.

## Blockers
- None.

## Next Action
Report the root cause, fix, verification, and affected-project repair path to user.

## Last Updated
2026-06-10 16:38 +08:00
