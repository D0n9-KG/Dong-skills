# Current State

## Objective
Fix the Dong Skills Stop hook schema so current Codex accepts blocking Stop output instead of showing `hook returned invalid stop hook JSON output`.

## Latest User Instruction
User showed a `cc-kg` hooks screenshot where `PreCompact` worked but `Stop` reported invalid JSON output, then asked to fix it.

## Current Phase
delivery

## Active Assumptions
- Dong Skills remains Codex-only.
- No global hooks should be installed.
- Full workflow skills belong in each initialized project under `.agents/skills/`.
- Installers and bootstraps must not silently delete or overwrite same-name non-Dong local skills.
- Stop hook should keep blocking stale state, but blocking output must use Codex-compatible `continue:false` schema.
- `hookSpecificOutput` can remain as diagnostic context, but it cannot replace the required Stop output fields.

## Blockers
- None for implementation or local verification.

## Next Action
Commit and push the verified Stop hook schema fix. Downstream `cc-kg` has already been refreshed and verified, but its project-level refresh changes remain uncommitted in that project.

## Final Verification Snapshot
- Source Stop simulation now returns `continue:false`, `stopReason`, and `systemMessage`; the old Stop block `decision:block` shape is gone.
- `cc-kg` Stop simulation now returns the same compatible shape.
- Remaining Stop blocks are normal state/checkpoint freshness blocks, not invalid JSON output.

## Last Updated
2026-06-29 15:48 +08:00
