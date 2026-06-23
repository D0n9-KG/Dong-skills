# Spec

## Problem
Dong Skills still needed stricter execution discipline and better recovery signals:

- agents could drift into How too early instead of locking What
- long tasks could accumulate freshness churn in state files
- hooks could block, but the reason was not always precise enough to act on quickly
- active context could grow without enough explicit lane-based control

## Goal
- Keep spec/plan writing focused on What, boundaries, invariants, and acceptance criteria.
- Route work through the lowest sufficient risk lane.
- Reduce unnecessary freshness churn for docs-only discussion work.
- Make hook diagnostics and recovery state clearer when the agent nears compaction or checkpoint boundaries.

## Approval Status
Approved by user through iterative instructions on 2026-06-23.

## Truth Hierarchy
- Latest user instruction.
- Verified behavior from code, tests, commands, product evidence, or live repo inspection.
- Approved written spec and approved plan for the current task.
- Current state files and handoff.
- Older chat, raw notes, stale specs, or unreviewed observations.

## Work Class / Risk Lane
- Lane 1 / Lane 2 for the current batch: multi-file Dong Skills governance and hook behavior changes, but not production-sensitive code.

## User Decisions
- Keep Dong Skills Codex-only.
- Do not add global hooks.
- Preserve non-Dong local skills.
- Preserve the upstream brainstorming continuation loop and final spec gate.
- Add explicit truth hierarchy and work-lane guidance.
- Reduce freshness churn for docs-only discussion changes while keeping code-change verification intact.
- Improve hook diagnostics rather than hiding failures.

## Non-Goals
- Claude Code compatibility.
- Cross-platform installer work.
- Model-in-hook summarization.
- Touching non-Dong local skills.

## Approved Scope
- Update brainstorming, planning, execution, and governance skills with truth hierarchy and work-lane rules.
- Tighten hook freshness checks so docs-only changes do not require code-style verification or Git checkpointing.
- Keep code/config changes on the stronger verification path.
- Refresh templates, health checks, tests, and bootstrap mirrors so the new rules are recoverable after compaction.

## Design
- The spec locks What, not How.
- Docs-only discussion work may keep state fresh without forcing verification/checkpoint loops.
- Code/config/script changes still require verification and checkpoint discipline.
- Hook status output should name the Git root, phase, next skill, latest changed file, and whether checkpoint or learning state is the blocker.

## Acceptance Criteria
- Spec and plan files contain explicit `Truth Hierarchy` and `Work Class / Risk Lane` sections.
- `Stop` does not force verification/checkpoint for docs-only discussion changes, but still blocks code/config changes that need verification.
- Hook diagnostics identify stale handoff/checkpoint problems with a concrete refresh reason.
- Bootstrap assets and root project-ops files stay synchronized.

## Open Questions
- None.

## Next Step
executing-plans
