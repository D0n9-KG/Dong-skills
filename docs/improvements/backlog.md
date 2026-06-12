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

### 2026-06-12 - Preserve Handoff During Automatic PreCompact

Status: accepted
Affected area: hooks / PreCompact / recovery
Source: user feedback

Signal:
Automatic PreCompact should not replace the main handoff with a pure emergency handoff because the most useful recovery content becomes less visible.

Decision:
Prepend an emergency notice to `handoff-summary.md`, preserve the existing handoff below the notice, and still write a raw snapshot as backup.

Verification:
Add tests that assert the existing handoff remains in the main file after automatic PreCompact.

### 2026-06-12 - Tighten What Counts As Memory

Status: accepted
Affected area: learning memory / solution memory / project governance
Source: user feedback

Signal:
Not every important event should become memory. Only future-useful information that reduces trial-and-error or changes later behavior should be captured.

Decision:
Document the distinction between reusable instincts, structured solution memory, current progress, and non-memory noise.

Verification:
Update `codex-learning-memory`, `codex-solution-memory`, and governance docs.

### 2026-06-12 - Separate Dong Skills Meta-Learning From Project Memory

Status: accepted
Affected area: learning memory / governance docs / README
Source: user feedback

Signal:
When Codex or the user discovers a Dong Skills improvement opportunity during project work, it should not be mixed into ordinary project memory.

Decision:
Use this backlog as the global queue for Dong Skills improvement candidates.

Verification:
Update skill and project snippet guidance so future agents route Dong Skills optimization signals here.
