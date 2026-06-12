# Dong Skills Memory And PreCompact Optimization Plan

**Goal:** Preserve useful handoff content during automatic `PreCompact` and clearly separate reusable project memory from Dong Skills meta-learning.
**Spec:** User-approved inline requirement from 2026-06-12 discussion.
**Spec Approval:** Approved by user.
**Current Step:** Final archive.
**Verification:** `node --test tests\project-ops.test.mjs`, `node .codex/hooks/project-ops.mjs health-check`, `git diff --check`, `node scripts/release-check.mjs .`, global install parity, Git push verification.
**Execution Approval:** User asked to optimize directly.

## Tasks

- [x] Task 1: Preserve existing handoff during automatic PreCompact.
  - Files: `.codex/scripts/lib/events.mjs`, `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`, `tests/project-ops.test.mjs`
  - Result: automatic `PreCompact` writes a top emergency notice, preserves meaningful previous handoff sections below it, and keeps a raw snapshot backup.
  - Verification: regression test added and full project-ops test suite passed.

- [x] Task 2: Separate reusable memory from Dong Skills meta-learning.
  - Files: `.agents/skills/codex-learning-memory/SKILL.md`, `.agents/skills/codex-solution-memory/SKILL.md`, `.agents/skills/codex-project-governance/SKILL.md`, `AGENTS.project-ops.snippet.md`, `README.md`, `docs/improvements/backlog.md`
  - Result: ordinary learning memory is limited to future-useful reusable patterns; Dong Skills improvement signals route to `docs/improvements/backlog.md`.
  - Verification: docs reviewed and release privacy scan planned in final release check.

- [x] Task 3: Sync bootstrap assets and recovery behavior.
  - Files: `.agents/skills/codex-codebase-onboarding/assets/project-ops/**`
  - Result: target-project bootstrap copies contain the new `PreCompact`, recovery, AGENTS snippet, and release-check behavior.
  - Verification: health check passed and release check planned after state refresh.

- [x] Task 4: Final archive.
  - Files: all changed files in this checkpoint.
  - Result: release check, learning status, privacy spot check, global sync/parity, and Git push verification passed.
  - Verification: checkpoint commit created and pushed.

## Risks
- Hook feedback can still appear orange when it is intentionally blocking stale state; that is not the same as a script error.
- Automatic `PreCompact` still cannot force the model to summarize intelligently at context-window exhaustion; it can only preserve the most useful existing handoff and record unresolved issues.
- Skill optimization backlog must remain clean and should not become a dump of ordinary project progress.

## Rollback
- Revert `events.mjs` and its bootstrap copy first if `PreCompact` JSON output or recovery behavior fails.
- Documentation and backlog routing can be adjusted independently from hook runtime behavior.
