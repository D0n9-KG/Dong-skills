# Plan Progress

## Active Plan
[Path to detailed plan/spec, or "No formal plan yet".]

## Spec Approval
[Approved by user / skipped by user / mechanical exception / pending.]

## Execution Approval
[Approved by user for Traditional task-by-task execution / Approved by user for Codex Goal mode / plan-then-execute requested with Traditional task-by-task execution / pending.]

## Execution Mode
Pending user choice. Allowed values: Traditional task-by-task execution; Codex Goal mode. Do not infer Codex Goal mode from "continue", "execute", or plan-then-execute.

## Goal Mode Objective
Not selected. If Codex Goal mode is explicitly selected, include the goal mechanism available in the current Codex session, objective, spec path, plan path, approved scope, non-goals, current step, verification commands, checkpoint cadence, required state updates, and stop conditions. Goal mode is unavailable when the current session does not expose an actual goal mechanism.

## Runtime Constraints
- Follow the approved plan tasks in order unless a blocker requires replanning.
- Keep `plan-progress.md`, `artifact-index.md`, `verification.md`, `current-state.md`, and `handoff-summary.md` current.
- Stop on ambiguity, repeated verification failure, scope change, destructive action, missing credentials, missing user decisions, architecture conflict, or state contradiction.
- Do not silently expand scope beyond the approved spec.

## Checkpoint Cadence
- Checkpoint after each meaningful verified task or milestone, or record why checkpointing is deferred.

## Tasks
- [ ] Task 1: [status and evidence]

## Current Step
[Exactly one active step, or "None".]

## Verification
- [Command/check and expected signal.]

## Out Of Scope
- [Explicit non-goals.]
