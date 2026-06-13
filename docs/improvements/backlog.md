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
