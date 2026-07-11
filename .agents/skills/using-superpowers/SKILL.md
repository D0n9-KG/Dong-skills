---
name: using-superpowers
description: Use at the start of any non-trivial project task, new session, resumed session, or explicit `$using-superpowers` request to route Dong Skills before acting. Decides whether to brainstorm, plan, execute, debug, verify, review, checkpoint, or clean up; process skills must be loaded before implementation work.
---

# Using Project Ops Skills

Use this as the lightweight router for Dong Skills. It should prevent improvising past the user's intent without turning every task into a heavy ritual.

## Routing Gate

Before any non-trivial action, choose the relevant process skill and use it. A non-trivial action includes code edits, config changes, multi-file docs, architecture choices, UX/API behavior, debugging, verification claims, commits, or project state updates.

Direct execution is allowed only for tiny mechanical edits with clear acceptance criteria.

Use the lowest sufficient work lane:

- `Lane 0`: tiny mechanical edit; direct execution is allowed with a clear acceptance criterion.
- `Lane 1`: small bounded change; use compact planning and targeted verification.
- `Lane 2`: multi-file or behavior-changing work; use brainstorming, written spec approval, planning, execution, verification, and checkpoint discipline.
- `Lane 3`: high-risk core logic, migration, security, money, permissions, release, or production-sensitive work; require stronger tests, review, rollback notes, and checkpointing.

When workflow state is available, record the chosen lane before phase-specific work:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition work-lane-<0|1|2|3>
```

For a genuine Lane 0 edit, record the compact scope and acceptance criterion, then run `workflow-state transition mechanical-exception` before the direct edit. If the user explicitly says to skip brainstorming for a clear multi-step task, record the compact scope and run `workflow-state transition spec-skipped`; this skip is task-scoped and does not approve execution.

Changing the lane during planning invalidates the existing plan approval and downstream verification/review/checkpoint evidence. Rebuild the plan at the new risk depth before execution.

When records conflict, follow the truth hierarchy: latest user instruction; verified behavior from code/tests/commands/product evidence/live repo inspection; approved spec and plan; current state and handoff; older chat/raw notes/stale specs.

## Workflow State Gate

Dong Skills uses a split installation model:

- Global install exposes entry skills: `codex-codebase-onboarding`, `using-superpowers`, and the global maintenance entry `codex-skill-evolution`.
- Full workflow skills are project-scoped and should live in the target repo at `.agents/skills/`.
- Do not assume full Dong Skills are available in an uninitialized project just because global entry skills are visible.
- `codex-skill-evolution` is the exception to the project bootstrap gate only for Dong Skills maintenance. It must locate and operate on the real Dong Skills source repo, not the current business project.

Before routing to any full workflow skill, confirm the current repository has project-level Dong Skills installed. The expected marker is:

```text
.agents/skills/.dong-skills-project.json
```

If the marker is missing, or `.codex-context/workflow-state.yaml`, `.codex/hooks/project-ops.mjs`, `.codex/hooks.json`, or the `AGENTS.md` managed block is missing, use `codex-codebase-onboarding` first and bootstrap the project. Do not route directly to `brainstorming`, `writing-plans`, `executing-plans`, review, learning, or governance skills until project bootstrap is present.

If the user is asking to inspect, run, validate, adopt, or improve Dong Skills itself through SkillOpt/SkillOpt-Sleep, route to `codex-skill-evolution` even without project bootstrap. Do not install project hooks just to perform Dong Skills maintenance.

For a project with Dong Skills installed, read `.codex-context/workflow-state.yaml` or run this before routing:

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
```

Use the output contract:

- `NEXT: auto` + `SKILL: <skill>` means load that skill and continue from the recorded phase.
- `NEXT: manual` means a blocking decision, stale state, or manual handoff is required; ask the user only for that decision and stop.
- `NEXT: done` means the workflow is complete; use verification/checkpoint/handoff only if delivery evidence still needs refresh.
- When `workflow-state next` prints `TRANSITIONS: ...`, those are the only registered resolution transitions for the pending decision. Present the user with the corresponding mutually exclusive choices, wait for a matching response, then use exactly one listed transition. Do not infer an unlisted transition or run it before the user response receipt exists.

If the file is missing, run `codex-codebase-onboarding` or `node .codex/hooks/project-ops.mjs workflow-state init` before continuing. If the state conflicts with the latest user instruction, the latest user instruction wins, but repair it through a validated `workflow-state transition <event>` before moving on. Direct `workflow-state set` and direct edits to `workflow-state.yaml` are not normal workflow paths.

When the recorded phase is `complete` and the user starts a distinct task, run `node .codex/hooks/project-ops.mjs workflow-state transition new-task` before discovery or brainstorming. This increments task identity and clears prior approvals, verification, review, checkpoint, and handoff hash state. When resuming from `blocked`, use `workflow-state transition resume`; it must restore the recorded `resume_phase` and `resume_skill`, not guess from chat memory.

Do not route from chat memory alone when a valid workflow state exists.

### Compaction And Session Recovery Gate

After automatic compaction, a new session, or any resume where workflow state is already active, do not continue from `current-state.md`, an Active Wayfinder path, or chat memory alone.

1. Read `.codex-context/handoff-summary.md` first, then the files listed under its re-read section.
2. Run `node .codex/hooks/project-ops.mjs context-recovery-eval`. Treat any failed, missing, stale, or ambiguous probe as a blocker.
3. Run `node .codex/hooks/project-ops.mjs workflow-state next`; use `workflow-state recover` when the state reports a recovery path.
4. If recovery reports an Active Wayfinder, read the injected Wayfinder summary and open the referenced map. A path without its Destination, decisions, frontier, fog, and boundaries is not recovered context.
5. Continue only when the handoff, workflow state, current plan/spec, verification evidence, and Active Wayfinder agree on the current task and next action.

Automatic compaction invalidates the recovery receipt, but a still-valid, unconsumed user decision receipt from the same session may survive because it is independently bound to task identity, evidence, and runtime hash. Re-run recovery after compaction; do not ask the user to repeat an approval unless `workflow-state next` still reports the decision and the prior receipt no longer matches.

When this evaluation runs through the installed hook path, success creates a session-scoped recovery receipt bound to the active task, handoff hash, and hook runtime. Supported project mutations are denied until that receipt is valid. A receipt from another session, an older handoff, a prior task generation, or an older runtime cannot authorize the current mutation. Read-only repair and diagnosis should remain available.

## Phase Order

For project work, keep this order:

1. **Scope:** use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction work.
   Use `codex-wayfinder` first when the destination is known but the route will span multiple sessions and cannot yet be written as a credible spec.
2. **Spec approval:** for non-trivial work, do not leave brainstorming until the written spec is approved by the user or brainstorming is explicitly skipped.
3. **Plan:** use `writing-plans` after the written spec is approved or requirements are explicitly clear.
4. **Execution mode:** the plan must record `Execution Mode` as `Traditional task-by-task execution` or `Codex Goal mode`.
5. **Execute:** use `executing-plans` only after a written plan exists and execution mode is approved. Do not infer Codex Goal mode from vague "continue" or "execute" language.
6. **Workspace:** use `codex-worktree-governance` before execution in a new/resumed worktree, when hook source paths are confusing, or before branch completion/cleanup.
7. **Debug:** use `systematic-debugging` for bugs, failures, regressions, or unexpected behavior.
   When a failure occurs while an execution plan still has work remaining, run `workflow-state transition debugging-start` before debugging. After the reproduced root cause is fixed and the focused check passes, run `workflow-state transition debugging-resolved` to return to the same execution plan. Verification-phase failures continue to use `verification-fail` and `verification-retry`.
8. **Verify:** use `codex-verification-loop` or `verification-before-completion` before completion claims.
9. **Simplicity review:** use `codex-simplicity-review` when a diff or plan may be overbuilt, adds dependencies/abstractions, or the user asks what can be deleted.
10. **Review:** use `codex-review-panel` or review skills for meaningful implementation, plan, docs, or high-risk changes.
    If accepted review findings require project-file edits, use `receiving-code-review`. A real project mutation in review/delivery/handoff automatically reopens debugging and invalidates old verification/review evidence; then return through `execution-complete` -> verification -> review. Use `review-changes-requested` explicitly only when reopening must be recorded before mutation, such as a cross-session or delegated handoff.
11. **Asset cleanup:** use `codex-asset-governance` before milestone handoff, compaction, release, or when docs/state/raw/code assets may be stale, duplicated, orphaned, or bloated.
12. **Checkpoint / handoff:** use `codex-git-checkpoint` and refresh `.codex-context/handoff-summary.md` before long pauses, compaction, delivery, or archive/push.

Do not jump from scope directly to implementation for multi-step or behavior-changing work.

## Skill Selection

- New repo or unclear structure: `codex-codebase-onboarding`.
- Multi-session discovery with a known destination but unresolved route: `codex-wayfinder`.
- Unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction: `brainstorming`.
- Approved written spec or explicit skip-brainstorming multi-step requirements: `writing-plans`.
- Explicit skip-brainstorming instruction: record compact scope, run `spec-skipped`, then use `writing-plans`.
- Tiny mechanical edit: classify `work-lane-0`, run `mechanical-exception`, then execute directly with targeted verification.
- Written plan to execute: `executing-plans`.
- Starting, resuming, finishing, or debugging path confusion in a Git worktree: `codex-worktree-governance`.
- Bug, failing test, build failure, regression, or unexpected behavior: `systematic-debugging`.
- Execution-time user correction: a pure continuation or status question does not reopen state. A changed implementation instruction must be externalized before the next mutation; a scope, requirement, goal, acceptance, or priority change requires `workflow-state transition brainstorming-start` and fresh spec/plan approval.
- Structural refactor, large-file growth, flat directories, unclear boundaries, or coupling concerns: `codex-architecture-governance`.
- Overbuilt diff/plan, avoidable dependency, unnecessary abstraction, or "what can be deleted/simplified": `codex-simplicity-review`.
- Stale, duplicate, orphaned, bloated, unsafe, or lifecycle-unclear docs/state/raw/code assets: `codex-asset-governance`.
- Product/project direction, strategy drift, or missing upstream grounding: `codex-strategy-anchor`.
- Prior session context needed beyond project files: `codex-session-history`.
- Offline validation-gated evolution of Dong Skills itself from backlog/outbox issues: `codex-skill-evolution`.
- Agent, LLM wrapper, tool harness, memory, rendering, or persistence audit: `codex-agent-architecture-audit`.
- Autonomous, Goal-mode, scheduled, repeated, or self-improving loop design/review: `codex-loop-design-check`.
- Before completion claim: `verification-before-completion`.
- Observable UI/CLI/API/artifact behavior needs proof: `codex-evidence-capture`.
- Before long pause, compaction, final delivery, or GitHub archive/push: `codex-git-checkpoint`.
- Meaningful implementation, plan, doc, or high-risk change ready for risk review: `codex-review-panel`.
- Review feedback received: `receiving-code-review`.
- Context drift, compaction, or state size concern: `codex-context-budget`.
- Milestone cleanup, stale docs, state archiving, or handoff/documentation hygiene: `codex-docs-stewardship`.
- Learning from repeated corrections or project-specific instincts: `codex-learning-memory`.
- Structured reusable solution or stale `docs/solutions/` learning: `codex-solution-memory`.

Do not load every skill. Read only the one needed now, plus directly referenced files if required.

## Approval Semantics

- A written spec is not approved until the user explicitly approves the written spec file or inline written spec, or explicitly asks to skip brainstorming.
- For non-trivial work, final discussion approval is not enough; the user must approve the written spec before planning.
- A plan is not execution-approved until the user chooses execution mode or explicitly asked earlier to plan-then-execute.
- Written-spec and execution approvals bind to the approved contents of `spec.md` and `plan-progress.md`. Editing either approved artifact invalidates the matching approval; refreshing the general context hash does not reapprove changed content.
- Reopen changed scope with `brainstorming-start`; reopen an implementation-plan change with `plan-start`, then obtain the matching approval again before project mutations continue.
- Plan-then-execute without an explicit Goal mode request means Traditional task-by-task execution.
- Codex Goal mode requires an explicit user choice, a Goal Mode Objective in `plan-progress.md`, and an actual goal or workflow mechanism exposed in the current Codex session with visible progress and closure state. If no such mechanism is available, ask before falling back to Traditional task-by-task execution.
- If the user says "continue" after a question, treat it as continuing the current phase, not approval to skip later gates.
- If there is doubt, ask one short question and wait.

## Decision Point Protocol

Decision points are blocking points. They include written-spec approval, execution-mode approval, verification failure handling, branch handling, archive confirmation, scope expansion, and any user choice recorded in `workflow-state.yaml` as `decision_required`.

At a decision point:

- State exactly what decision is being made.
- Present mutually exclusive, actionable options.
- Do not choose from historical preference, defaults, or "the user probably wants this."
- Do not write the chosen state fields or execute the branch until the user explicitly chooses.
- After the user chooses, update `workflow-state.yaml` and the matching `.codex-context` state files, then continue.

## State Discipline

- Before edits: know the relevant files and update `artifact-index.md` when they matter.
- At phase boundaries: update `.codex-context/workflow-state.yaml` with the phase, `next_skill`, and `decision_required`.
- During work: keep `plan-progress.md` and `current-state.md` current.
- Reopening brainstorming/spec or restarting a plan invalidates downstream plan approval, execution approval, verification, review, and checkpoint state. Never carry old approvals or evidence into changed scope.
- During discussion, discovery, planning, debugging, or substantial exploration: keep `working-notes.md` current at meaningful investigation checkpoints, before compaction, and before a pause when new findings would otherwise be lost. A normal read/search call does not by itself create state debt. Do not store hidden chain-of-thought, raw transcripts, secrets, or private reasoning.
- During Goal mode work: periodically re-read `spec.md` and `plan-progress.md`, compare progress against acceptance criteria, and stop on ambiguity, scope change, repeated verification failure, destructive action, missing user decision, or state contradiction.
- In or near a worktree: keep `worktree-state.md` current before execution, checkpoint, merge, PR, discard, or cleanup.
- Before long pauses, compaction, or final response: refresh `handoff-summary.md`.
- Before long pauses or final response with meaningful changes: commit/push a Git checkpoint or record the deferred reason in `handoff-summary.md`.
- Before success claims: run or record verification in `verification.md`.
- Before milestone handoff or release: run `asset-governance` when state files, raw snapshots, archives, solution docs, or generated assets have grown.
- Before adding or accepting custom code/dependencies/abstractions, apply the Simplicity Gate from `writing-plans`/`executing-plans`: can avoid building, standard library, native platform. Before custom code, also check whether the needed behavior already exists in the codebase and should be reused.

## Tool Mapping

If a retained upstream note mentions another agent harness, translate it through `references/codex-tools.md` when present. Prefer Codex-native tools and the current workspace.
