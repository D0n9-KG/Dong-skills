# Current State

## Objective
Deliver the current Dong Skills optimization batch:

- keep specs focused on What, truth hierarchy, and the lowest sufficient risk lane
- reduce freshness churn for docs-only discussion work without weakening code-change verification
- improve hook diagnostics so Stop/PreCompact output points to the real changed file and actual Git root
- keep bootstrap asset copies synchronized with the root implementation

## Latest User Instruction
User asked to optimize Dong Skills using the agreed truth-hierarchy, risk-lane, freshness, and hook-diagnostics changes.

## Current Phase
delivery

## Active Assumptions
- Dong Skills remains Codex-only.
- No global hooks should be installed.
- Full workflow skills belong in each initialized project under `.agents/skills/`.
- Installers and bootstraps must not silently delete or overwrite same-name non-Dong local skills.
- Freshness gates should stay strict for code/config changes and lighter for docs-only discussion changes.
- Hook status output should prefer real project files over governance noise when naming the latest changed file.

## Blockers
- None for implementation or local verification.

## Next Action
Commit and push the verified batch after the remaining state files are refreshed.

## Last Updated
2026-06-23 14:58 +08:00
