# Dong Skills Improvement Backlog

This file stores Dong Skills meta-learning: user feedback and agent-observed friction about Dong Skills itself.

Do not store project progress, private paths, raw chat, secrets, or project-specific implementation detail here. Store those in project `.codex-context/`, `docs/solutions/`, or `CONCEPTS.md` when appropriate.

## Capture Rules

Record a backlog item only when the signal concerns Dong Skills behavior:

- hooks, compaction, recovery, or stop behavior
- skill instructions, routing, phase gates, or process friction
- installers, bootstrap assets, project snippets, or release checks
- documentation clarity for Dong Skills itself
- repeated cross-project environment/tooling issues that should change Dong Skills guidance

Do not record ordinary project memory here. Use:

- `codex-learning-memory` for reusable project or cross-project trigger/action instincts
- `codex-solution-memory` for verified reusable project solutions
- `.codex-context/current-state.md`, `plan-progress.md`, and `handoff-summary.md` for current progress

## Review States

- `proposed`: captured signal, not yet accepted as a change
- `accepted`: should be implemented in hooks, skills, docs, tests, or installer
- `done`: implemented and verified
- `rejected`: intentionally not changing Dong Skills
- `deferred`: valid, but not worth doing now

## Items

### 2026-06-30 - Add SkillOpt-Sleep Skill Evolution Layer

Status: done
Priority: P1
Affected area: skill evolution / SkillOpt-Sleep / backlog / tests / bootstrap / docs
Source: user request to introduce Microsoft SkillOpt as a strong self-evolution module for Dong Skills
Implemented: Added `codex-skill-evolution`, `scripts/skill-evolution.mjs`, hook CLI dispatch, manifest/install/bootstrap wiring, health/release checks, runtime `.skillopt-sleep/` ignore/scanning, README/AGENTS/governance guidance, SkillOpt license attribution, and regression tests. The integration treats SkillOpt-Sleep as an offline staged-proposal evaluator for Dong Skills itself, not a replacement for project memory or a hook-time model call.

Signal:
Dong Skills had good real-time context governance and curated memory, but did not have a validation-gated way to evolve its own skills from repeated failures. SkillOpt-Sleep provides a harvest/mine/replay/consolidate/gate/stage/adopt pattern that fits Dong Skills meta-learning when kept offline and review-gated.

Decision:
Use SkillOpt-Sleep as an optional offline self-evolution layer. Keep `codex-learning-memory`, `codex-solution-memory`, and `docs/improvements/backlog.md` as the classification and candidate sources. Do not run SkillOpt-Sleep from hooks, do not use `--auto-adopt`, and do not use it for business project code.

Verification:
`node --check scripts\skill-evolution.mjs`, `node .codex\hooks\project-ops.mjs skill-evolution status`, `node --test tests\project-ops.test.mjs`, `node .codex\hooks\project-ops.mjs health-check`, `node scripts\release-check.mjs .`, `git diff --check`, and installer sync passed. Current environment does not have `skillopt_sleep` installed, so real SkillOpt optimization runs remain a setup-dependent follow-up.

### 2026-06-29 - Fix Stop Hook Output Schema

Status: done
Priority: P0
Affected area: hooks / Stop / Codex app compatibility / tests / bootstrap
Source: user screenshot from downstream `cc-kg` project showing `hook returned invalid stop hook JSON output`
Implemented: `Stop` hook blocking output now uses the current Codex-compatible `decision: "block"` / `reason` shape instead of the older `continue: false`, `stopReason`, `systemMessage`, and `hookSpecificOutput` shape. Passing Stop hooks emit `{}`. Bootstrap asset copies, installed global copies, and regression tests were synchronized.

Signal:
The hooks were loaded and `PreCompact` worked, but `Stop` produced a UI error even though the emitted text was valid JSON. Local reproduction showed the Stop block path returned `continue:false`, `stopReason`, `systemMessage`, and `hookSpecificOutput`; current Codex Stop hook handling rejected that shape as invalid stop hook JSON output.

Decision:
Keep Stop blocking behavior and diagnostics, but emit Stop-specific blocking output as `decision: "block"` plus a human-readable `reason`. Do not weaken the state freshness gate. Keep PreCompact on its separate `continue` / `stopReason` contract unless a separate PreCompact compatibility issue is observed.

Verification:
`node --test tests\project-ops.test.mjs`, `node .codex\hooks\project-ops.mjs health-check`, `node scripts\release-check.mjs .`, `git diff --check`, and downstream Stop simulation passed. The downstream Stop output now returns `decision:block` instead of `continue:false`.

### 2026-06-23 - Reduce Active Context Footprint In Project Ops

Status: accepted
Priority: P1
Affected area: hooks / scripts / context / docs
Source: repeated project work showing heavy active context and large always-loaded project-ops files
Implemented so far: `context-budget` now separates `Hot recovery path`, `Warm on-demand path`, and `Cold runtime/bootstrap path`; release checks fail when the hot path exceeds 45k tokens and warn above 35k; the budget skill and README now tell agents to report hot path separately from total scanned tokens.

Signal:
`context-budget` on a live Science Evo worktree estimated about 85k tokens across 63 files, with several `lib/*.mjs` and `project-ops-health.mjs` files contributing most of the active load. The system works, but the always-loaded surface is heavy enough to slow recovery and increase compaction pressure.

Decision:
Split the heaviest project-ops modules further into on-demand references or smaller units where possible, and keep the always-loaded path leaner without weakening phase gates or verification.

Verification:
`node .codex/hooks/project-ops.mjs context-budget` now shows current hot recovery path separately from warm/cold maintenance cost. `node --test tests\project-ops.test.mjs` covers the hot/warm/cold report and release-check fail threshold.

Remaining:
Actual module splitting remains optional follow-up work. Current measured hot path is under the warning threshold, so large `events.mjs`, `workflow.mjs`, `learning.mjs`, and `assets.mjs` are maintenance-cost targets, not ordinary recovery blockers.

### 2026-06-23 - Reduce Freshness Churn From Frequent State Syncs

Status: done
Priority: P1
Affected area: hooks / workflow-state / verification / handoff
Source: repeated Stop-hook blocks during discussion because `current-state.md`, `artifact-index.md`, `verification.md`, and `handoff-summary.md` needed synchronized freshness updates
Implemented: Stop now computes whether verification/checkpoint review is required from workflow phase plus changed-file type. Docs-only discussion changes still require fresh `current-state.md` and `artifact-index.md`, but do not force execution-level `verification.md` or Git checkpoint review. Code/config/script changes still require verification and checkpoint review.

Signal:
In the Science Evo worktree, Stop checks repeatedly blocked on state-file freshness even when the actual project state was correct. The protection is useful, but the mtime churn makes normal discussion feel noisier than it should.

Decision:
Keep freshness protection, but consider a less chatty sync model for discussion-phase state updates so the same change batch does not require repeated refresh loops.

Verification:
`node --test tests\project-ops.test.mjs` covers docs-only discussion changes being allowed and code changes during discussion phases still being blocked for verification/checkpoint.

### 2026-06-23 - Surface Stale Hook Notification Backlogs Better

Status: done
Priority: P1
Affected area: hooks / UI / diagnostics
Source: screenshot showing many stacked `hook exited with code 1` notifications while live project checks still passed
Implemented: Hook status output now includes the hook event, actual Git root, workflow phase/next skill, learning/assets/discussion/checkpoint status, and latest changed file. The latest-file line now prefers non-governance files so `.codex-context` maintenance writes do not hide the real project file. Scope note: Codex app notification stacking itself is outside this repo; this item is complete on the Dong Skills hook-output side.

Signal:
A Codex UI screenshot showed a stack of `hook exited with code 1` notifications even though current CLI checks on the same worktree passed. That suggests the user-facing notification layer can lag behind live hook state and confuse diagnosis.

Decision:
Improve hook diagnostics so the UI shows the current hook event/root/source more clearly and distinguishes stale notification backlog from a live failing hook.

Verification:
`node --test tests\project-ops.test.mjs` covers Stop hook diagnostic output and stale Git checkpoint basis. `node scripts\release-check.mjs .` confirms hook syntax and full regression suite.

### 2026-06-15 - Add Comet-Inspired Workflow State Machine

Status: done
Priority: P0
Affected area: routing / hooks / bootstrap / recovery / tests / README
Source: user request to absorb useful ideas from `rpamis/comet` without importing OpenSpec or cross-platform adapters
Implemented: `.codex-context/workflow-state.yaml` is now a first-class state file; `workflow-state` CLI supports `init`, `status`, `get`, `set`, `transition`, `check`, `next`, `recover`, and `hash`; `using-superpowers`, governance, brainstorming, planning, execution, verification, review, checkpoint, recovery, health checks, bootstrap assets, and tests recognize the workflow state.

Signal:
Comet's useful part for Dong Skills is not its OpenSpec directory layout, but its script-readable phase state, explicit decision points, guardable phase transitions, deterministic `next` routing, and recovery output. Dong Skills previously had phase gates in prose and Markdown, but no single machine-checkable state contract.

Decision:
Adapt Comet's state-machine pattern to Codex-only Dong Skills. Keep `.codex-context/` as the source of truth, do not add OpenSpec change directories, do not add Claude/cross-platform adapters, and do not make `workflow-state.yaml` a noisy per-file freshness gate. Use it for phase, next skill, blocking decision, verification/review/checkpoint status, and recovery hash.

Verification:
`tests/project-ops.test.mjs` covers workflow-state transitions, next routing, recovery, hashing, project hook forwarding, bootstrap installation, health-check validation, and skill documentation gates.

### 2026-06-14 - Fix Review-Validated Runtime And Workflow Gaps

Status: done
Priority: P0
Affected area: hooks / CLI / borrowed workflow skills / templates / README / tests
Source: external review feedback triaged against the current Codex-only Dong Skills scope
Implemented: deleted-file freshness now uses nearest existing ancestor mtime instead of `Date.now()`; `session-history` accepts explicit project roots; `systematic-debugging` typo is fixed; evidence capture distinguishes test framework output from direct product use; Goal mode requires a real current-session Codex goal mechanism; plan-progress templates include `Spec Approval` and Goal mechanism notes; README states the release is Codex-only.

Signal:
The external review identified several valid internal issues mixed with out-of-scope Claude Code compatibility concerns. The high-risk valid items were deleted-file stale false positives and inconsistent `session-history` CLI root parsing. Several documentation issues could also cause drift: direct CLI/API behavior evidence was underspecified, Goal mode could be interpreted as a label rather than an actual Codex goal mechanism, and the README did not explicitly state that Claude Code support is outside the current release line.

Decision:
Fix the valid Codex-specific defects and clarify release scope. Do not add `.claude` layout, `CLAUDE.md` shim, Claude hook conversion, or cross-platform installers in this pass. Defer top-level legal license selection to the repo owner.

Verification:
`node --test tests\project-ops.test.mjs` covers deleted-file freshness, `session-history <root>`, evidence wording, Goal mode mechanism wording, and bootstrap template text.

### 2026-06-14 - Gate Written Specs And Goal Mode Execution

Status: done
Priority: P0
Affected area: brainstorming / planning / executing-plans / project governance / templates / health checks
Source: user feedback about Living Spec finalization, Superpowers parity, and safe Codex Goal mode execution for full plans
Implemented: `brainstorming` now separates final discussion approval from written-spec approval; `writing-plans` requires execution mode, Goal objective draft, runtime constraints, and checkpoint cadence; `executing-plans` supports Traditional task-by-task execution and explicit Codex Goal mode with objective/state/checkpoint/stop-condition constraints; router/governance/AGENTS/README/templates/health checks/tests were synchronized.

Signal:
Living Spec is useful during discussion, but there must be a clear final written-spec gate before planning. Full-project execution can benefit from Codex Goal mode, but only if the goal objective carries approved scope, non-goals, plan path, verification commands, checkpoint cadence, state update requirements, and stop conditions.

Decision:
Preserve the useful upstream Superpowers gate: write the spec, self-review it, ask the user to approve the written spec, then plan. Add two execution modes after planning. Plan-then-execute defaults to Traditional task-by-task execution; Codex Goal mode requires explicit user selection and a complete Goal objective.

Verification:
`node --test tests\project-ops.test.mjs` covers the written-spec gate, execution mode planning, Goal mode execution constraints, bootstrap plan-progress sections, and health-check schema failures.

### 2026-06-14 - Harden State Gate Templates And Readability Checks

Status: done
Priority: P1
Affected area: context templates / health check / release check / bootstrap assets
Source: whole-system audit for drift, stale state, compaction recovery, and record timing
Implemented: new project templates now include `spec.md` `Approval Status` and `plan-progress.md` `Execution Approval`; `project-ops-health` reports old projects that lack those sections while accepting both `Goal` and `Goals`; `release-check` scans active text assets for common mojibake/readability markers; bootstrap assets are synchronized; regression tests cover these gates.

Signal:
The skills required approval and execution gates, but newly bootstrapped state templates did not expose the corresponding sections. That mismatch made it easier for agents to recover after compaction without seeing whether a spec or plan was approved. Release checks also did not catch readable-text regressions before publishing.

Decision:
Treat approval status and execution approval as required state-file schema, not only prose in the skills. Keep the readability scan conservative and exclude raw/archive runtime material.

Verification:
`node --test tests\project-ops.test.mjs` and `node scripts\release-check.mjs .` cover the new template, health-check, and readability-scan behavior.

### 2026-06-13 - Restore Required Upstream Workflow Gates

Status: done
Priority: P0
Affected area: borrowed workflow skills / Superpowers parity / CE-ECC adaptation
Source: user feedback after comparing Dong Skills behavior with original Superpowers-style skills
Implemented: `writing-plans`, `executing-plans`, `systematic-debugging`, review skills, worktree/checkpoint guidance, and `codex-solution-memory` now include explicit gates for test-first planning, reproduction-before-fix, test discovery, mandatory review triggers, branch finishing choices, and solution-memory evaluation. `tests/project-ops.test.mjs` guards these sections.

Signal:
Dong Skills should be lighter than upstream projects, but the lightening removed some necessary process constraints. Agents could still drift: start implementation from loose brainstorming, write vague plans, skip test discovery, fix without reproduction, treat review as optional, and finish branches without a fixed decision menu.

Decision:
Do not import heavy upstream-only machinery by default, such as mandatory subagents or visual companion flows. Preserve upstream gates that directly improve correctness, recoverability, and execution discipline.

Verification:
Add regression checks so future edits cannot remove these workflow gates unnoticed.

### 2026-06-13 - Preserve Upstream Brainstorming Continuation Loop

Status: done
Priority: P0
Affected area: brainstorming / user interaction / Superpowers parity
Source: user feedback from downstream project usage
Implemented: `brainstorming/SKILL.md` now has an explicit Continuation Loop requiring the agent to continue from each user answer to the next single question, approaches, design section, final approval, `writing-plans`, pause, or blocker. `tests/project-ops.test.mjs` guards the presence of this rule.

Signal:
After a user answered one brainstorming question, the agent updated living spec/state files and stopped instead of asking the next question or advancing to the next design phase. This lost useful upstream Superpowers behavior.

Decision:
Do not over-lighten upstream Superpowers. Keep Dong Skills lighter than the original, but preserve the flow state machine: answer -> record confirmed state -> continue to the next question or next phase.

Verification:
Add a test that asserts the brainstorming skill retains the continuation loop and the rule that state-file updates alone are not a valid brainstorming turn ending.

### 2026-06-12 - Preserve Handoff During Automatic PreCompact

Status: done
Affected area: hooks / PreCompact / recovery
Source: user feedback

Signal:
Automatic PreCompact should not replace the main handoff with a pure emergency handoff because the most useful recovery content becomes less visible.

Decision:
Prepend an emergency notice to `handoff-summary.md`, preserve the existing handoff below the notice, and still write a raw snapshot as backup.

Verification:
Add tests that assert the existing handoff remains in the main file after automatic PreCompact.

### 2026-06-12 - Tighten What Counts As Memory

Status: done
Affected area: learning memory / solution memory / project governance
Source: user feedback

Signal:
Not every important event should become memory. Only future-useful information that reduces trial-and-error or changes later behavior should be captured.

Decision:
Document the distinction between reusable instincts, structured solution memory, current progress, and non-memory noise.

Verification:
Update `codex-learning-memory`, `codex-solution-memory`, and governance docs.

### 2026-06-12 - Separate Dong Skills Meta-Learning From Project Memory

Status: done
Affected area: learning memory / governance docs / README
Source: user feedback

Signal:
When Codex or the user discovers a Dong Skills improvement opportunity during project work, it should not be mixed into ordinary project memory.

Decision:
Use this backlog as the global queue for Dong Skills improvement candidates.

Verification:
Update skill and project snippet guidance so future agents route Dong Skills optimization signals here.

### 2026-06-12 - Add Asset Lifecycle Governance

Status: done
Affected area: skills / hooks / state files / raw lifecycle / docs governance
Source: user feedback

Signal:
Dong Skills had separate controls for docs, context budget, architecture, raw observations, solution memory, verification pruning, and Git checkpointing, but no unified lifecycle governance for all accumulated assets.

Decision:
Add `codex-asset-governance` and `asset-governance.mjs` as the main lifecycle sweep for docs, `.codex-context`, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, and code assets.

Verification:
Add tests for bootstrap installation, safe raw PreCompact snapshot pruning, and Stop escalation for severe active-state bloat.

### 2026-06-13 - Add Living Spec Mode To Brainstorming

Status: done
Priority: P0
Affected area: brainstorming / spec / compaction recovery
Source: user feedback from downstream project usage
Implemented: `brainstorming/SKILL.md` now requires Living Spec mode with `Approval Status: Living Draft / Not Approved`, confirmed decisions, candidate options, open questions, and handoff refresh before final approval.

Signal:
Current `brainstorming` writes `.codex-context/spec.md` only after approval. Long discussions about research narrative, architecture direction, or data-model design can be compacted before approval, leaving confirmed decisions only in chat.

Decision:
Add a Living Spec mode. During brainstorming, confirmed decisions, boundaries, non-goals, and open questions should be incrementally written to `.codex-context/spec.md` with `Status: Living Draft / Not Approved`. Final approval should convert the draft into an approved spec.

Verification:
Add guidance and tests/manual checks showing that an unapproved discussion can be recovered from `spec.md`, `decisions.md`, `open-questions.md`, `current-state.md`, and `handoff-summary.md`.

### 2026-06-13 - Restore Iterative Brainstorming Cadence

Status: done
Priority: P0
Affected area: brainstorming / user interaction
Source: user feedback comparing Dong Skills to upstream Superpowers
Implemented: `brainstorming/SKILL.md` now requires exactly one important question per assistant message and section-by-section design confirmation for complex work.

Signal:
Dong Skills `brainstorming` says to ask one important question at a time, but it lacks upstream Superpowers' stricter checklist, "only one question per message", and design-section approval cadence. Agents still tend to output many discussion points at once.

Decision:
Tighten `brainstorming` so clarification is truly one question per message, options are separated from questions, and design is presented section by section with user confirmation after each section. Keep the flow lighter than upstream Superpowers but restore the interaction constraints that prevent overwhelming the user.

Verification:
Run prompt-level/manual tests where an ambiguous design request causes one focused question, not a multi-question bundle, and where design approval happens section-by-section.

### 2026-06-13 - Add Executable Dong Skills Meta-Learning Routing

Status: done
Priority: P0
Affected area: learning memory / source repo discovery / backlog routing
Source: user feedback from downstream project usage
Implemented: `learning-status` locates the Dong Skills source repo via env vars/source markers/current repo/known candidates, rejects installed copies, and falls back to `.codex-context/dong-skills-outbox.md`.

Signal:
`codex-learning-memory` tells agents to record Dong Skills improvements in `docs/improvements/backlog.md`, but target projects often only expose installed skill copies under `%USERPROFILE%\.agents\skills`, not the real Dong Skills Git source checkout.

Decision:
Add a deterministic discovery order for the real Dong Skills repo: environment variables such as `DONG_SKILLS_REPO` or `DONG_SKILLS_HOME`, known checkout candidates, source metadata, then fallback outbox. Explicitly forbid editing installed skill copies as if they were source.

Verification:
Agent can answer exactly where a Dong Skills improvement was recorded. If the source repo is unavailable, it writes to a standard project outbox and records migration steps in handoff.

### 2026-06-13 - Add Dong Skills Improvement Outbox

Status: done
Priority: P1
Affected area: learning memory / project state / handoff
Source: user feedback from downstream project usage
Implemented: `.codex-context/dong-skills-outbox.md` is now part of templates, bootstrap assets, health checks, recovery guidance, and `learning-status`.

Signal:
When the real Dong Skills backlog is unavailable, agents currently have no standard place for Dong Skills meta-learning and may mix it into `handoff-summary.md`, `learned-instincts.md`, `verification.md`, or project state.

Decision:
Add a standard `.codex-context/dong-skills-outbox.md` or `.codex-context/meta-learning-outbox.md`. Mark it as an external-tool improvement queue, not a project instinct. Teach `learning-status` and Stop/handoff guidance to surface pending outbox entries.

Verification:
When the Dong Skills repo cannot be found, an improvement goes to the outbox and later can be batch-migrated to `docs/improvements/backlog.md`.

### 2026-06-13 - Deduplicate Learning Observations By Topic

Status: done
Priority: P0
Affected area: learning hooks / observations / learning-status
Source: user feedback from downstream project usage
Implemented: learning observations now carry a topic when detectable, status follow-ups for an existing topic are deduplicated, and `learning-status` shows grouped pending observations.

Signal:
Repeated user questions about whether something was learned, where it was stored, or whether it should be migrated can generate multiple raw observations for the same Dong Skills meta-learning topic.

Decision:
Group semantically similar observations by topic. If a new prompt only asks about status of an already-recorded item, update review metadata instead of creating another independent candidate.

Verification:
`learning-status` can show grouped observations such as `topic: dong-skills-backlog-routing, observations: 4, pending: 0`; `learned-instincts.md` remains compact.

### 2026-06-13 - Fix Raw Observation Chinese Encoding

Status: done
Priority: P1
Affected area: learning hooks / raw observations / encoding
Source: user feedback from downstream project usage
Implemented: regression coverage verifies Chinese prompt excerpts remain readable UTF-8 in `observations.jsonl` and do not contain common mojibake markers.

Signal:
`.codex-context/raw/observations.jsonl` can contain mojibake in `prompt_excerpt`, which makes Chinese observations hard to review and classify.

Decision:
Audit hook stdin/payload decoding and JSONL writes. Use a consistent UTF-8 strategy and add regression coverage for Chinese prompt excerpts.

Verification:
Chinese text in `observations.jsonl` remains readable after hook capture and later review.

### 2026-06-13 - Improve Stop Hook Git Checkpoint Diagnostics

Status: done
Priority: P1
Affected area: Stop hook / Git checkpoint / handoff
Source: user feedback from downstream project usage
Implemented: Stop checkpoint diagnostics now report stale handoff basis, latest changed file, handoff mtime, latest mtime, and a direct refresh instruction.

Signal:
Stop hook may report `Git checkpoint needs review` even when `handoff-summary.md` has a deferred reason, because the handoff can be older than changed files. The message does not clearly explain the stale-file basis.

Decision:
When checkpoint section exists but is stale, show `handoff-summary.md is older than changed files`, latest changed file, handoff mtime, and any missing/stale field. For `.codex-context`-only changes, give a gentler path that allows explicit deferred reason rather than forcing a commit.

Verification:
Agents can resolve Stop hook blocks from the hook output alone without reading source code.

### 2026-06-13 - Make Verification Pruning One-Step

Status: done
Priority: P1
Affected area: state-prune / verification / asset governance
Source: user feedback from downstream project usage
Implemented: `state-prune --verification --archive --keep-latest 8 --apply` archives older verification entries, keeps recent evidence active, and writes an `Archived Evidence` pointer.

Signal:
When `asset-governance` reports `verification.md` bloat, the current remediation requires several manual steps: prune, archive, update active summary, refresh artifact/current/handoff, and rerun checks.

Decision:
Add a command such as `state-prune --verification --archive --keep-latest 8 --apply` that archives old entries, leaves an active summary/link, and prompts the follow-up state files to refresh.

Verification:
One command removes repeated verification bloat reports while preserving recent evidence and an archive pointer.

### 2026-06-13 - Add Learning Memory Status Answer Template

Status: done
Priority: P2
Affected area: learning memory / user communication
Source: user feedback from downstream project usage
Implemented: `codex-learning-memory` now requires target location, actual location, unfinished reason, risk, and next migration step for Dong Skills meta-learning reports.

Signal:
When users ask where a learning or improvement was stored, agents can answer vaguely and blur expected target, actual location, missing prerequisites, and migration path.

Decision:
Add a fixed answer structure: target location, actual location, unfinished reason, risk, and next migration step.

Verification:
Memory/deposition status answers clearly distinguish intended storage from actual storage.

### 2026-07-09 - Tighten State Consistency And Cleanup Closure

Status: done
Priority: P0
Affected area: workflow-state / hooks / asset governance / checkpoint / release hygiene
Source: user feedback from downstream project usage after a long project phase
Implemented: `workflow-state status`, hooks, and `health-check` now detect contradictions between `workflow-state.yaml`, `spec.md`, and `plan-progress.md`; `PostToolUse` surfaces exploration working-note reminders before Stop; `asset-governance --apply` can archive temporary PreCompact handoff notices while preserving the normal handoff; Git checkpoint status accepts a structured governance-only checkpoint-finalize tail; release check scans for ANSI/control-character readability issues.

Signal:
Long sessions could end with old and new state coexisting, Stop hooks catching issues late, automatic PreCompact notices staying at the top of handoff, asset governance reporting more than it safely cleaned, checkpoint finalization causing tiny context-file tails, and hook summaries occasionally showing display noise.

Decision:
Promote `workflow-state.yaml` from a routing file to a consistency-checked state index. Keep automatic PreCompact as a rescue path, but give its emergency notice a cleanup lifecycle. Separate Safe-Auto cleanup from Confirm-First assets. Avoid forcing an endless checkpoint loop when only fresh governance/context notes remain after a real checkpoint.

Verification:
`tests/project-ops.test.mjs` covers workflow-state/doc mismatch detection, PostToolUse early reminders, PreCompact notice archiving, and existing checkpoint/asset behavior. `release-check` now scans text files for ANSI escape and unexpected control characters.
