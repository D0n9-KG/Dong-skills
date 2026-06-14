# Spec

## Problem
Dong Skills had Living Spec mode, but the workflow still had gaps that could let Codex move from discussion into planning or long-running execution too loosely:

- `brainstorming` could imply final approval before the written spec itself was reviewed.
- `writing-plans` did not require an explicit execution mode.
- `executing-plans` had only traditional task-by-task execution rules and no guarded Codex Goal mode path.
- Project-level AGENTS snippets, templates, health checks, and tests did not enforce the new execution-mode schema.

## Goals
- Preserve the useful upstream Superpowers written-spec gate: discussion approval, written spec self-review, user approval of the written spec, then planning.
- Add two approved execution modes after planning: Traditional task-by-task execution and explicit Codex Goal mode.
- Make Goal mode usable for full-plan execution without letting the agent drift, skip checkpoints, or silently expand scope.
- Make the execution-mode schema recoverable after compaction and diagnosable in old projects.

## Approval Status
Approved by user instruction on 2026-06-14: add self-review for spec/planning/execution and support both traditional execution and Codex Goal mode with strong runtime constraints.

## User Decisions
- If requirements are ambiguous, stop and continue discussion rather than guessing.
- Reuse or reference high-quality external skills when appropriate; keep useful upstream Superpowers gates instead of over-lightening them.
- Do not use Goal mode for this Dong Skills edit; add support for future project execution.

## Candidate Options
- Import full upstream Superpowers flow: rejected for this pass because Dong Skills should stay lighter and Codex-native.
- Keep only traditional task-by-task execution: rejected because the user wants a safe Codex Goal mode option for complete-project execution.
- Add execution mode choice and Goal mode constraints to existing skills/templates: selected.

## Non-Goals
- No new runtime hooks for Goal mode in this pass.
- No automatic use of Codex Goal mode without explicit user selection.
- No target-project or global installed-copy update in this pass unless separately requested.
- No wholesale import of Claude-specific/subagent-specific Superpowers mechanics.

## Approved Scope
- Update `brainstorming`, `writing-plans`, `executing-plans`, `using-superpowers`, and `codex-project-governance` skill rules.
- Update root and bootstrap `AGENTS` project-ops guidance.
- Update plan-progress templates and bootstrap `.codex-context` seeds.
- Update `project-ops-health` required sections and regression tests.
- Update README/backlog/state files.

## Design
- `brainstorming` now distinguishes final discussion approval from written-spec approval. The spec becomes `Pending written-spec approval` after discussion approval and becomes `Approved by user` only after the user approves the written spec.
- `writing-plans` now requires `Execution Mode`, `Goal Mode Objective Draft`, `Runtime Constraints`, and `Checkpoint Cadence`.
- `executing-plans` now supports Traditional task-by-task execution and Codex Goal mode. Goal mode is allowed only after an approved written spec, approved plan, explicit user selection, and a complete Goal objective with stop conditions.
- `using-superpowers` and `codex-project-governance` route through written spec approval and execution mode approval.
- New templates and health checks make missing execution-mode sections visible in old projects.

## Acceptance Criteria
- Tests cover written-spec gate preservation, execution-mode planning, Goal mode execution constraints, bootstrap template sections, and health-check failures for missing execution-mode sections.
- `node --test tests\project-ops.test.mjs` passes.
- `node scripts\release-check.mjs .` passes.
- `node .codex\hooks\project-ops.mjs asset-governance` passes or any advisory is resolved/recorded.
- `git diff --check` passes.

## Open Questions
- None blocking.
- Future question: whether Goal mode needs dedicated hook telemetry or whether skill/state constraints are sufficient in practice.

## Next Step
Run final verification, update handoff, then checkpoint and push.
