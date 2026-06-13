# Dong Skills Meta-Learning Routing Plan

**Goal:** Ensure Dong Skills improvement ideas can be deposited from any project session without confusing installed skill copies for the source repo.
**Spec:** `.codex-context/spec.md`
**Spec Approval:** Approved by user on 2026-06-13.
**Current Step:** Checkpoint commit and push.
**Verification:** `node --test tests\project-ops.test.mjs`, `node .codex/hooks/project-ops.mjs learning-status`, `node .codex/hooks/project-ops.mjs health-check`, `node scripts/release-check.mjs .`, `git diff --check`.
**Execution Approval:** User explicitly asked to address the issue.

## Tasks

- [x] Task 1: Record downstream feedback in Dong Skills backlog.
  - Files: `docs/improvements/backlog.md`
  - Evidence: user PRD items added without private project paths.

- [x] Task 2: Add fallback outbox template.
  - Files: `.codex/scripts/lib/templates.mjs`, bootstrap `.codex-context/dong-skills-outbox.md`, AGENTS snippets.
  - Evidence: bootstrap test asserts the file exists in new target projects.

- [x] Task 3: Add source repo discovery and learning-status reporting.
  - Files: `.codex/scripts/lib/learning.mjs`, bootstrap runtime copy.
  - Evidence: tests cover fallback outbox and `DONG_SKILLS_REPO` source detection.

- [x] Task 4: Add install marker.
  - Files: `scripts/install-windows.ps1`
  - Evidence: install run created `%USERPROFILE%\.agents\skills\.dong-skills-source.json`.

- [x] Task 5: Update docs and health checks.
  - Files: `codex-learning-memory`, `codex-project-governance`, `README.md`, `AGENTS.project-ops.snippet.md`, `project-ops-health.mjs`.
  - Evidence: health check passes.

## Risks
- The source marker contains a local path and must remain generated outside the repo.
- Outbox entries can become stale if not migrated after the source repo becomes available.
- README Chinese text is already mojibake in the current file; this task avoids broad README rewrites.

## Next Step
Commit and push the verified checkpoint.
