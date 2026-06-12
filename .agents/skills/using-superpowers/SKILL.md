---
name: using-superpowers
description: Use at the start of any non-trivial project task, new session, resumed session, or explicit `$using-superpowers` request to route Dong Skills before acting. Decides whether to brainstorm, plan, execute, debug, verify, review, checkpoint, or clean up; process skills must be loaded before implementation work.
---

# Using Project Ops Skills

Use this as the lightweight router for Dong Skills. It should prevent improvising past the user's intent without turning every task into a heavy ritual.

## Routing Gate

Before any non-trivial action, choose the relevant process skill and use it. A non-trivial action includes code edits, config changes, multi-file docs, architecture choices, UX/API behavior, debugging, verification claims, commits, or project state updates.

Direct execution is allowed only for tiny mechanical edits with clear acceptance criteria.

## Phase Order

For project work, keep this order:

1. **Scope:** use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction work.
2. **Plan:** use `writing-plans` after the design/spec is approved or requirements are explicitly clear.
3. **Execute:** use `executing-plans` only after a written plan exists and execution is approved.
4. **Workspace:** use `codex-worktree-governance` before execution in a new/resumed worktree, when hook source paths are confusing, or before branch completion/cleanup.
5. **Debug:** use `systematic-debugging` for bugs, failures, regressions, or unexpected behavior.
6. **Verify:** use `codex-verification-loop` or `verification-before-completion` before completion claims.
7. **Review:** use `codex-review-panel` or review skills for meaningful implementation, plan, docs, or high-risk changes.
8. **Checkpoint / handoff:** use `codex-git-checkpoint` and refresh `.codex-context/handoff-summary.md` before long pauses, compaction, delivery, or archive/push.

Do not jump from scope directly to implementation for multi-step or behavior-changing work.

## Skill Selection

- New repo or unclear structure: `codex-codebase-onboarding`.
- Unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product direction: `brainstorming`.
- Approved spec or clear multi-step requirements: `writing-plans`.
- Written plan to execute: `executing-plans`.
- Starting, resuming, finishing, or debugging path confusion in a Git worktree: `codex-worktree-governance`.
- Bug, failing test, build failure, regression, or unexpected behavior: `systematic-debugging`.
- Structural refactor, large-file growth, flat directories, unclear boundaries, or coupling concerns: `codex-architecture-governance`.
- Product/project direction, strategy drift, or missing upstream grounding: `codex-strategy-anchor`.
- Prior session context needed beyond project files: `codex-session-history`.
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

- A design/spec is not approved until the user explicitly approves the presented design/spec or explicitly asks to skip brainstorming.
- A plan is not execution-approved until the user chooses execution or explicitly asked earlier to plan-then-execute.
- If the user says "continue" after a question, treat it as continuing the current phase, not approval to skip later gates.
- If there is doubt, ask one short question and wait.

## State Discipline

- Before edits: know the relevant files and update `artifact-index.md` when they matter.
- During work: keep `plan-progress.md` and `current-state.md` current.
- In or near a worktree: keep `worktree-state.md` current before execution, checkpoint, merge, PR, discard, or cleanup.
- Before long pauses, compaction, or final response: refresh `handoff-summary.md`.
- Before long pauses or final response with meaningful changes: commit/push a Git checkpoint or record the deferred reason in `handoff-summary.md`.
- Before success claims: run or record verification in `verification.md`.

## Tool Mapping

If a retained upstream note mentions another agent harness, translate it through `references/codex-tools.md` when present. Prefer Codex-native tools and the current workspace.
