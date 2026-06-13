# Spec

## Problem
Dong Skills already has many governance skills and hooks, but real use can still drift if state templates do not expose phase gates, old projects do not get diagnosed, or release checks allow unreadable text regressions. The user asked for another whole-system audit focused on practical failure modes after compaction, new sessions, delayed records, and state confusion.

## Goals
- Identify remaining Dong Skills issues that could cause agents to drift, forget state, or recover incorrectly.
- Repair verified low-risk gaps directly in the source kit and bootstrap assets.
- Keep residual risks explicit when a change is intentionally deferred.

## Approval Status
Approved by user instruction on 2026-06-14: perform whole-system audit and repair practical issues found.

## User Decisions
- Prefer practical guardrails over a lightweight workflow that only looks good in docs.
- Do not add noisy hooks unless the trade-off is clearly worth it.

## Candidate Options
- Broaden PostToolUse matcher to shell/script tools: deferred because it may create noisy blocks after command-based workflows.
- Keep PostToolUse scoped and strengthen schema/release checks: selected for this pass.

## Non-Goals
- No global hooks.
- No full Superpowers ritual import.
- No automatic update of target projects or global installed copies in this pass.
- No broad pre-edit/pre-shell hook expansion in this pass.

## Approved Scope
- Add missing approval/execution fields to new project state templates.
- Teach health-check to detect old state files missing those gate sections.
- Add release-time text readability/mojibake scanning.
- Synchronize root files and bootstrap asset copies.
- Add regression tests and update Dong Skills improvement backlog/state files.

## Design
- Template schema: `spec.md` includes `Approval Status`; `plan-progress.md` includes `Execution Approval`.
- Health check: required section checks make old projects visibly stale instead of silently missing phase-boundary fields; `Goal` and `Goals` are both accepted to match existing skill/spec variants.
- Release check: scan active text assets for replacement characters, private-use mojibake, Latin mojibake, and a conservative set of Chinese mojibake markers. Exclude raw/archive runtime material.
- Tests: cover bootstrap templates, health-check failures, and release-check readability failures.

## Acceptance Criteria
- `node --test tests\project-ops.test.mjs` passes.
- `node scripts\release-check.mjs .` passes.
- `node .codex\hooks\project-ops.mjs asset-governance` passes or any advisory is resolved/recorded.
- `git diff --check` passes.
- Residual risk around shell/script/generated edits is recorded.

## Open Questions
- Whether to broaden PostToolUse to shell/script tools remains open; current recommendation is to defer until real usage shows Stop/PreCompact is too late.

## Next Step
Checkpoint the verified repair.
