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

If the file is missing, run `codex-codebase-onboarding` or `node .codex/hooks/project-ops.mjs workflow-state init` before continuing. If the state conflicts with the latest user instruction, the latest user instruction wins, but update `workflow-state.yaml` with `workflow-state transition <event>` or `workflow-state set <field> <value>` before moving on.

Do not route from chat memory alone when a valid workflow state exists.

## Phase Order

For project work, keep this order:

1. **Scope:** use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction work.
2. **Spec approval:** for non-trivial work, do not leave brainstorming until the written spec is approved by the user or brainstorming is explicitly skipped.
3. **Plan:** use `writing-plans` after the written spec is approved or requirements are explicitly clear.
4. **Execution mode:** the plan must record `Execution Mode` as `Traditional task-by-task execution` or `Codex Goal mode`.
5. **Execute:** use `executing-plans` only after a written plan exists and execution mode is approved. Do not infer Codex Goal mode from vague "continue" or "execute" language.
6. **Workspace:** use `codex-worktree-governance` before execution in a new/resumed worktree, when hook source paths are confusing, or before branch completion/cleanup.
7. **Debug:** use `systematic-debugging` for bugs, failures, regressions, or unexpected behavior.
8. **Verify:** use `codex-verification-loop` or `verification-before-completion` before completion claims.
9. **Simplicity review:** use `codex-simplicity-review` when a diff or plan may be overbuilt, adds dependencies/abstractions, or the user asks what can be deleted.
10. **Review:** use `codex-review-panel` or review skills for meaningful implementation, plan, docs, or high-risk changes.
11. **Asset cleanup:** use `codex-asset-governance` before milestone handoff, compaction, release, or when docs/state/raw/code assets may be stale, duplicated, orphaned, or bloated.
12. **Checkpoint / handoff:** use `codex-git-checkpoint` and refresh `.codex-context/handoff-summary.md` before long pauses, compaction, delivery, or archive/push.

Do not jump from scope directly to implementation for multi-step or behavior-changing work.

## Skill Selection

- New repo or unclear structure: `codex-codebase-onboarding`.
- Unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction: `brainstorming`.
- Approved written spec or explicit skip-brainstorming multi-step requirements: `writing-plans`.
- Written plan to execute: `executing-plans`.
- Starting, resuming, finishing, or debugging path confusion in a Git worktree: `codex-worktree-governance`.
- Bug, failing test, build failure, regression, or unexpected behavior: `systematic-debugging`.
- Structural refactor, large-file growth, flat directories, unclear boundaries, or coupling concerns: `codex-architecture-governance`.
- Overbuilt diff/plan, avoidable dependency, unnecessary abstraction, or "what can be deleted/simplified": `codex-simplicity-review`.
- Stale, duplicate, orphaned, bloated, unsafe, or lifecycle-unclear docs/state/raw/code assets: `codex-asset-governance`.
- Product/project direction, strategy drift, or missing upstream grounding: `codex-strategy-anchor`.
- Prior session context needed beyond project files: `codex-session-history`.
- Offline validation-gated evolution of Dong Skills itself from backlog/outbox issues: `codex-skill-evolution`.
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
- Plan-then-execute without an explicit Goal mode request means Traditional task-by-task execution.
- Codex Goal mode requires an explicit user choice, a Goal Mode Objective in `plan-progress.md`, and an actual goal mechanism exposed in the current Codex session. If goal tools are unavailable, ask before falling back to Traditional task-by-task execution.
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
- During discussion, discovery, planning, debugging, or substantial exploration: keep `working-notes.md` current with externalized findings, rejected paths, current hypothesis/conclusion, open investigation questions, and next verification step. Do not store hidden chain-of-thought or raw transcripts.
- During Goal mode work: periodically re-read `spec.md` and `plan-progress.md`, compare progress against acceptance criteria, and stop on ambiguity, scope change, repeated verification failure, destructive action, missing user decision, or state contradiction.
- In or near a worktree: keep `worktree-state.md` current before execution, checkpoint, merge, PR, discard, or cleanup.
- Before long pauses, compaction, or final response: refresh `handoff-summary.md`.
- Before long pauses or final response with meaningful changes: commit/push a Git checkpoint or record the deferred reason in `handoff-summary.md`.
- Before success claims: run or record verification in `verification.md`.
- Before milestone handoff or release: run `asset-governance` when state files, raw snapshots, archives, solution docs, or generated assets have grown.
- Before adding or accepting custom code/dependencies/abstractions, apply the Simplicity Gate from `writing-plans`/`executing-plans`: can avoid building, standard library, native platform.

## Tool Mapping

If a retained upstream note mentions another agent harness, translate it through `references/codex-tools.md` when present. Prefer Codex-native tools and the current workspace.
