---
name: codex-project-governance
description: Coordinate Dong Skills only when work crosses lifecycle phases, workflow state is inconsistent, or no specific next_skill owns the task. Avoid for ordinary execution when a narrower skill already applies.
---

# Codex Project Governance

Coordinate lifecycle boundaries without replacing engineering judgment. This skill is a router and consistency check, not a second implementation process.

## Entry

Run `node .codex/hooks/project-ops.mjs workflow-state next`.

- If `next_skill` is specific and state is consistent, load it and return.
- If state is invalid, repair the named contradiction before product work.
- If the current task is genuinely new after `complete`, use `workflow-state transition new-task`.

Use this truth hierarchy: latest user instruction; fresh code/test/product evidence; approved `spec` and plan; active state; older notes.

## Phase Boundaries

- Route discovery: `codex-wayfinder` only when a credible `spec` is not yet possible.
- Scope: `brainstorming` produces the written `spec` and explicit approval.
- Plan: `writing-plans` records tasks, verification, execution mode, and rollback.
- Execute: `executing-plans` owns approved implementation.
- Debug: `workflow-state transition debugging-start`, then `systematic-debugging`; return with `debugging-resolved`.
- Verify/review: use the narrowest verification and review depth justified by risk.
- Deliver: checkpoint or record a concrete deferred reason, then refresh handoff.

Use the lowest sufficient lane. Do not add ceremony merely because many files exist; lane follows behavioral and operational risk.

## State Discipline

Keep active recovery centered on `handoff-summary.md`, `workflow-state.yaml`, and `current-state.md`. Load the current `spec`, plan, Wayfinder map, or working notes only when the phase needs them.

`spec.md` is current-task intent, not permanent system truth. Keep active state semantic rather than chronological. Move raw logs to `.codex-context/raw/` and old evidence to archive.

Canonical approvals and phase changes use `workflow-state decision <transition>` and `workflow-state transition <event>`; never hand-edit workflow state.

## Model Autonomy

Do not make the model re-prove routine reasoning through checklists. Use skills for repeatable procedures, project-specific expertise, or risk boundaries the model cannot infer reliably. Prefer native tools, existing code, and standard libraries before adding Dong machinery.

Hooks are a minimal mechanical backstop. They must not infer scope from natural language, track every read, or block Stop. If hook behavior conflicts with the current minimal contract, use `systematic-debugging` in the real Dong Skills source repository.

## Completion

Before a completion claim, require fresh evidence proportional to risk. Use `codex-simplicity-review` when process or code looks overbuilt, independent review for meaningful/high-risk changes, and `codex-git-checkpoint` when verified work should be preserved.

Update only state files that gained new durable facts. Ordinary reads and diagnostics create no state debt.
