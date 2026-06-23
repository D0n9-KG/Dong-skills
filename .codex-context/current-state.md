# Current State

## Objective
Deliver the current Dong Skills optimization batch:

- keep specs focused on What, truth hierarchy, and the lowest sufficient risk lane
- reduce freshness churn for docs-only discussion work without weakening code-change verification
- improve hook diagnostics so Stop/PreCompact output points to the real changed file and actual Git root
- separate hot recovery context from warm on-demand skills and cold runtime/bootstrap maintenance
- enforce hot context budget thresholds during release checks

## Latest User Instruction
User approved optimizing `Reduce Active Context Footprint In Project Ops` after confirming Dong Skills is not severely too large but needs budget governance.

## Current Phase
delivery

## Active Assumptions
- Dong Skills remains Codex-only.
- No global hooks should be installed.
- Full workflow skills belong in each initialized project under `.agents/skills/`.
- Installers and bootstraps must not silently delete or overwrite same-name non-Dong local skills.
- Freshness gates should stay strict for code/config changes and lighter for docs-only discussion changes.
- Hook status output should prefer real project files over governance noise when naming the latest changed file.
- `context-budget` total scanned tokens should not be reported as "loaded every time"; hot recovery path is the main active-context signal.

## Blockers
- None for implementation or local verification.

## Next Action
Run final health/release/Stop checks, then commit and push the verified batch.

## Last Updated
2026-06-23 16:00 +08:00
