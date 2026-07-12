# Codex Project Ops

Use Chinese by default unless the user asks otherwise or the project requires another language.

Write user-facing `.codex-context/*.md` state files in Chinese by default. Keep file names, commands, workflow-state YAML keys, enum values, skill names, hook names, code identifiers, and precise terms such as `spec`, `handoff`, `checkpoint`, and `Goal mode` in English when useful.

On Windows, prefer PowerShell 7 / `pwsh` for shell work when available. Treat all Chinese and user-facing Markdown files as UTF-8. Do not rely on Windows PowerShell 5.1 `Get-Content` display output to decide whether a UTF-8 Chinese file is corrupt; verify with `pwsh`, Node `fs.readFileSync(file, "utf8")`, or another explicit UTF-8 reader. For manual edits, prefer `apply_patch`; avoid `>`, `Out-File`, or `Set-Content` without an explicit UTF-8 encoding for Chinese text.

## Main Skill

For non-trivial project work, use `codex-project-governance` first. It coordinates route discovery, spec, plan, implementation, debugging, verification, review, delivery, learning, and handoff.

## Phase Gates

For non-trivial work, keep the phase boundary explicit:

1. Use `codex-wayfinder` before ordinary brainstorming when the destination is known but the route is still too uncertain for a credible spec, especially when research, prototype, grilling, frontier-ticket, or blocking-edge decisions will span sessions.
2. Use `brainstorming` for unclear, creative, behavior-changing, multi-file, architecture, UX, API, workflow, or product/project direction work that can still become a credible written spec through discussion.
3. Do not implement until the written spec is approved by the user, the user explicitly skips brainstorming, or the task is a tiny mechanical edit with clear acceptance criteria. Discussion approval is not enough for non-trivial work.
4. Use `writing-plans` before multi-step implementation.
5. Do not execute the plan until the user approves the execution mode or explicitly requested plan-then-execute. Plan-then-execute defaults to Traditional task-by-task execution unless the user explicitly selects Codex Goal mode.

Record spec approval in `.codex-context/spec.md`; record `执行模式`, `Goal 模式目标` when applicable, and execution approval in `.codex-context/plan-progress.md`.

## Truth Hierarchy And Work Lanes

When records conflict, use this order: latest user instruction; verified behavior from code, tests, commands, product evidence, or live repo inspection; approved spec and plan; current state files and handoff; older chat, raw notes, stale specs, or unreviewed observations.

`spec.md` is a current-task intent and acceptance record, not a permanent system truth. After delivery, move durable knowledge into `CONCEPTS.md`, `STRATEGY.md`, `docs/solutions/`, or curated instincts, and do not keep duplicate spec prose that overlaps executable code.

Use the lowest sufficient lane: `Lane 0` tiny mechanical edit; `Lane 1` small bounded change; `Lane 2` multi-file or behavior-changing work; `Lane 3` high-risk core logic, migration, security, money, permissions, release, or production-sensitive work. The lane controls plan depth, verification depth, state update cadence, review, rollback, and checkpoint cadence.

For a genuine Lane 0 direct edit, record the compact scope and acceptance criterion, run `workflow-state transition work-lane-0`, then `workflow-state transition mechanical-exception`. If the user explicitly says to skip brainstorming, record the compact scope and run `workflow-state transition spec-skipped`; the task-bound skip does not approve execution.

## Curated Skills

Use only the bundled curated set by default:

- `using-superpowers`
- `codex-wayfinder`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `systematic-debugging`
- `verification-before-completion`
- `codex-git-checkpoint`
- `codex-worktree-governance`
- `codex-architecture-governance`
- `codex-docs-stewardship`
- `codex-asset-governance`
- `codex-simplicity-review`
- `codex-review-panel`
- `codex-solution-memory`
- `codex-session-history`
- `codex-strategy-anchor`
- `codex-evidence-capture`
- `codex-skill-evolution`
- `requesting-code-review`
- `receiving-code-review`
- `codex-codebase-onboarding`
- `codex-verification-loop`
- `codex-learning-memory`
- `codex-context-budget`
- `codex-project-governance`
- `codex-agent-architecture-audit`
- `codex-loop-design-check`

Do not assume removed Superpowers/ECC components exist.
Use `codex-learning-memory` for curated instincts only; do not save loose notes as memory without evidence, scope, and a save/improve/absorb/drop decision.

## State Files

Keep `.codex-context/` current when work spans files, turns, or phases:

- `current-state.md`
- `project-map.md`
- `spec.md`
- `plan-progress.md`
- `artifact-index.md`
- `decisions.md`
- `open-questions.md`
- `risks.md`
- `verification.md`
- `working-notes.md`
- `learned-instincts.md`
- `dong-skills-outbox.md`
- `worktree-state.md`
- `workflow-state.yaml`
- `handoff-summary.md`

`workflow-state.yaml` carries a task identity (`task_id`, `task_generation`) as well as phase, approval state, `verification_evidence_hash` / `review_evidence_hash`, and an execution-debug return path. A distinct task after `complete` must use `workflow-state transition new-task` so old approvals do not leak forward. A blocked task must resume through its recorded `resume_phase` and `resume_skill`. An unexpected execution failure uses `debugging-start` and returns through `debugging-resolved`; do not skip remaining plan work with `execution-complete`.

Use `.codex-context/raw/` for raw logs or large outputs.
Project bootstrap should keep `.codex-context/raw/*` and `.codex-context/discussion-state.json` ignored in `.gitignore`, with only `.codex-context/raw/.gitkeep` trackable.
Use `.codex-context/archive/` for old but still useful verification or handoff history.
Use `.codex-context/working-notes.md` for compact externalized investigation state: checked facts, rejected paths, current hypothesis, current conclusion, open investigation questions, and next verification step. Do not store hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning there. Promote durable conclusions into spec, decisions, current-state, handoff, or solution docs at phase boundaries.
Keep active state semantic, not chronological. `handoff-summary.md` must start from the current business/project task and next action; `current-state.md` must state one current conclusion; `open-questions.md` must consolidate or mark old questions as resolved/superseded/archived; closed Stop/Git/hook/runtime investigations should be promoted to a concise conclusion and archived instead of dominating active recovery.
Use `.codex-context/instincts/` for learned instincts; keep `learned-instincts.md` as a compact index, not a dumping ground.
Use `.codex-context/dong-skills-outbox.md` only for Dong Skills improvement candidates when the real Dong Skills source repo cannot be found. It is not project memory and not an active instinct.
Use `.codex-context/solution-index.md` as the compact pointer to `docs/solutions/` and `CONCEPTS.md`; do not paste full solution docs into active state.

Use `.codex-context/worktree-state.md` to record whether the current workspace is the primary checkout, a Codex-managed worktree, a Dong-managed fallback worktree, a manual worktree, a submodule, or unknown. Refresh it before execution, checkpoint, branch completion, cleanup, or whenever hook UI source paths differ from the actual Git root.

Use `.codex-context/workflow-state.yaml` as the script-readable phase state. Before routing non-trivial work, run `node .codex/hooks/project-ops.mjs workflow-state next` or read the file directly. If phase, next action, or compaction recovery is ambiguous, run `node .codex/hooks/project-ops.mjs workflow-state recover` before acting. Update state at phase boundaries with `workflow-state transition <event>` so compaction recovery can identify the current phase, blocking decision, and next skill. `workflow-state status`, hooks, and `health-check` also audit consistency between `workflow-state.yaml`, `spec.md`, and `plan-progress.md`; if they disagree, treat it as a blocking state repair before implementation.

If present:

- `STRATEGY.md` is the project/product direction anchor for major brainstorming and planning.
- `CONCEPTS.md` is stable project vocabulary.
- `docs/solutions/` stores structured verified learnings with YAML frontmatter.

Use `codex-architecture-governance` before or after structural changes, major refactors, large-file growth, flat-directory growth, unclear ownership, package/module boundary changes, deep-import risk, or repeated bugs caused by coupling. Keep architecture facts in `project-map.md`, decisions in `decisions.md`, and structural risks in `risks.md`. For package-style TypeScript/JavaScript work, identify public entry points and private internals, avoid unauthorized deep imports, and do not add barrel files that hide ownership or create cycles.

Before adding custom code, dependencies, abstractions, scripts, docs, or state assets, apply the Simplicity Gate: can the approved outcome be reached without building the new thing; does the standard library already cover it; does the native platform already cover it. Use `codex-simplicity-review` for overbuilt diffs/plans, avoidable dependencies, unnecessary abstractions, or deliberate simplification debt. If an accepted simplification has a known ceiling, mark it near the code as `dong-debt: <ceiling>; revisit when <trigger>`.

Use `codex-docs-stewardship` at milestones, before handoff, after API/architecture changes, or when README/AGENTS/docs/.codex-context may be stale. Delete, merge, or archive stale docs instead of keeping misleading notes.

Use `codex-asset-governance` before milestone handoff, compaction, release, or when docs, state files, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, or code assets may be stale, duplicated, orphaned, unsafe, or bloated. Classify assets as Keep, Update, Consolidate, Replace, Delete, Stale, Raw-Prune, Safe-Auto, or Confirm-First.

Run `node .codex/hooks/project-ops.mjs asset-governance` for a dry-run lifecycle audit. It reports semantic state advisories and raw footprint in addition to size/freshness. Use `--apply` only for safe auto-cleanup: pruning generated `precompact-auto-*.md` raw snapshots and archiving temporary PreCompact notices when a preserved normal handoff body exists below the notice. Do not prune `observations.jsonl` generically.

Use `codex-review-panel` for meaningful code, plan, docs, architecture, or delivery reviews where correctness, testing, maintainability, standards, security, performance, reliability, API contract, UX/product, or adversarial lenses reduce risk.

If accepted review findings require project-file edits, use `receiving-code-review` and implement the scoped fix. A real project mutation in review/delivery/handoff automatically reopens debugging and invalidates old verification/review evidence; then run `execution-complete` and repeat verification and review.

Before `verification-pass`, record concrete command/product evidence and no unresolved gap, or use the explicit verification-gap path. Before `review-complete` or a permitted low-risk `review-skipped`, append `Review Evidence` after verification closure. Delivery must reject missing, reused, or post-review-modified evidence.

Use `codex-skill-evolution` only for offline, explicit SkillOpt-Sleep evolution of Dong Skills itself. It is a global maintenance entry, but it must operate on the real Dong Skills source repo, not the current business project. It turns Dong Skills backlog/outbox issues into reviewed replay tasks, runs SkillOpt-Sleep dry-run/run, inspects staged proposals, and adopts only after user review. Redact secrets before persisting task drafts or adoption diagnostics, and surface backend/auth/model/version failures explicitly instead of converting them into scores. Do not run SkillOpt-Sleep from hooks, do not use `--auto-adopt`, and do not use it for business project code or project memory.

## Learning Memory

Learning is curated. Hooks may automatically capture likely learning signals in `.codex-context/raw/observations.jsonl`, but those observations are compact/redacted and are not active rules.

Before compaction, final delivery, or a long pause, review pending observations with `codex-learning-memory`: save useful patterns as instincts, absorb duplicates into existing docs, or record dropped noise. Refresh `.codex-context/learned-instincts.md` after review.

For non-trivial verified fixes or reusable solutions, use `codex-solution-memory` instead of saving a loose instinct. Refresh `docs/solutions/`, `CONCEPTS.md`, and `.codex-context/solution-index.md` as needed.

If the signal is about improving Dong Skills itself, such as hooks, skills, README, installer, bootstrap, recovery, or governance behavior, record it in `docs/improvements/backlog.md` in the Dong Skills repo. Do not mix Dong Skills meta-learning with project instincts or project solution memory.

If the real Dong Skills repo cannot be found, write the item to `.codex-context/dong-skills-outbox.md` and report the target location, actual location, reason, risk, and migration next step. Use `node .codex/hooks/project-ops.mjs learning-status` to see the detected Dong Skills backlog target and pending outbox count. Never edit installed skill copies under `%USERPROFILE%\.agents\skills` as if they were source.

For recurring Dong Skills failures that need validation before changing skills, use `codex-skill-evolution` after the issue is in `docs/improvements/backlog.md` or `.codex-context/dong-skills-outbox.md`. Keep `.skillopt-sleep/` and generated task drafts ignored unless a sanitized eval fixture is intentionally created.

## Session History

Use `codex-session-history` only when project files are insufficient or the user references previous sessions. Search metadata/keyword counts first, never paste full transcripts, and move durable findings into `.codex-context/` or `docs/solutions/`.

## Hooks Control Plane

When project hooks are installed and trusted, `PreToolUse` denies supported project mutations if recovery, task identity, a pending decision, the current lane/phase, execution approval, Git state, or an unexternalized execution-time user directive is invalid. Canonical governance artifacts under `.codex-context/`, `STRATEGY.md`, `docs/codex/specs/`, `docs/codex/plans/`, and `docs/codex/wayfinder/` remain writable before execution approval; Lane 2/3 product-code edits do not. Scope, requirement, goal, acceptance, or priority changes during execution require `brainstorming-start` and fresh approval. Bare continuation, pure status inquiry, and learning-only future preferences do not reopen scope. A successful hooked `context-recovery-eval` writes a session-scoped receipt bound to the task, handoff hash, and runtime; another session or stale receipt cannot authorize the mutation. Read-only diagnosis should remain available. These hooks are guardrails over supported tool paths, not a complete security sandbox.

`PostToolUse` leaves ordinary reads/searches debt-free and records actual project changes with invocation-scoped intent plus Git evidence, including tool-contained commits. Unclosed changes accumulate across mutations; tests, no-op commands, and commit-only operations do not erase completed refresh evidence. It reminds after mutation but leaves hard freshness closure to Stop/PreCompact/delivery. `SubagentStop` grades summary evidence without blocking native multi-agent completion.

`Stop` rechecks current delivery evidence and uses session-scoped bounded continuations for unresolved issues, so another session cannot consume or exhaust the current session's budget. Learning observations and ordinary asset hygiene are advisory; invalid workflow/Git state, severe asset issues, or missing evidence required by the current work can block. If the continuation bound is exhausted, the final response must disclose the unresolved gaps and must not claim verified completion. `health-check` reports static configuration, root/bootstrap parity, and per-event freshness for recent critical-hook liveness separately; a new runtime cannot inherit old event coverage, and missing liveness does not prove whether host trust is enabled.

## Compaction

Write a fresh handoff at phase boundaries and before long pauses. During discussion, discovery, planning, debugging, or substantial exploration, refresh `working-notes.md` at meaningful checkpoints and before stopping or compacting; ordinary reads and searches do not create hook debt. The `UserPromptSubmit` hook may mark `.codex-context/discussion-state.json` dirty. `Stop`/`PreCompact` require only the state files named by current issues. The `PreCompact` hook blocks stale manual compaction. For automatic compaction, it prepends an emergency notice to `handoff-summary.md`, preserves the existing handoff below that notice, writes a raw snapshot, and allows compaction to continue, because automatic compaction may happen under context pressure where a hard block can leave the session stalled. After recovery, run `context-recovery-eval` through the installed hook path before supported mutations. Treat the emergency notice as temporary: run `asset-governance --apply` or refresh a normal handoff so the notice is archived out of the active handoff.

After compaction, recover in this order:

1. `.codex-context/handoff-summary.md`
2. `.codex-context/worktree-state.md`
3. `.codex-context/workflow-state.yaml`
4. `.codex-context/current-state.md`
5. `.codex-context/project-map.md`
6. `.codex-context/spec.md`
7. `.codex-context/decisions.md`
8. `.codex-context/open-questions.md`
9. `.codex-context/working-notes.md`
10. `.codex-context/plan-progress.md`
11. `.codex-context/artifact-index.md`
12. `.codex-context/solution-index.md`
13. `.codex-context/learned-instincts.md`
14. `.codex-context/dong-skills-outbox.md` only when discussing Dong Skills improvements
15. `STRATEGY.md`, `CONCEPTS.md`, or relevant `docs/solutions/` entries only when the task needs them
16. latest user instruction

## Completion

Before claiming work is complete, run fresh verification or record the explicit verification gap in `verification.md`. For observable UI/CLI/API/artifact/workflow changes, capture product evidence or explicitly record why it is blocked/not applicable. Then use `codex-git-checkpoint` to commit/push a checkpoint or record why it is deferred in `handoff-summary.md`, and refresh `handoff-summary.md`.

For installation or release hygiene, run `node .codex/hooks/project-ops.mjs health-check` from the target project when hooks are installed.
