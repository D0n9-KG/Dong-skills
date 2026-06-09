# Spec

## Problem
Dong Skills had several remaining governance gaps: the project hook was a large single file, verification history could bloat active state, `systematic-debugging` was heavier than necessary, and the curated workflow lacked explicit architecture and documentation stewardship to prevent projects from becoming concentrated, flat, stale, or hard to resume.

## Goals
- Split `.codex/hooks/project-ops.mjs` into a thin dispatcher and maintainable runtime modules.
- Ensure install/bootstrap copies split hook dependencies into target projects.
- Add state archival so old verification evidence can move to `.codex-context/archive/` while active files stay compact.
- Expand regression tests around hook gates, bootstrap dependencies, and state pruning.
- Slim `systematic-debugging/SKILL.md` and move detailed guidance into references.
- Add a curated architecture governance skill with a practical scan script.
- Add a curated docs/state stewardship skill with a practical scan script.
- Update README, AGENTS snippet, project governance routing, onboarding, context-budget guidance, assets, and state files.
- Preserve privacy and release hygiene.

## Non-Goals
- Do not install global hooks.
- Do not automate structural refactors based only on heuristic scans.
- Do not auto-commit or auto-push without checkpoint review.
- Do not add unrelated external skills.

## Approved Scope
- Hook runtime, install/bootstrap scripts, onboarding assets, tests, README/AGENTS guidance, curated skill docs, scan scripts, state pruning, and `.codex-context` state.

## User Decisions
- 2026-06-09: Optimize reviewed items 1, 3, 6, and 7.
- 2026-06-09: Add project architecture governance and documentation/state stewardship to prevent long-running projects from degrading.
- 2026-06-09: Keep these as main curated Dong Skills behavior, not optional modules.

## Acceptance Criteria
- Hook CLI and event behavior still works after splitting.
- Bootstrap installs `.codex/scripts/lib/` and `state-prune.mjs`.
- Regression tests cover bootstrap dependencies, stale artifact gate, PreCompact gate, learning redaction, checkpoint validation, recovery, and state pruning.
- `state-prune` archives old verification evidence and leaves recent evidence plus explicit gaps active.
- `systematic-debugging` main skill is short and loads detailed references on demand.
- New architecture/docs skills are present, routed, and documented.
- Health/release checks pass, privacy scan passes, and bootstrap asset parity is clean.
- Updated global skills are installed.
- Commit is pushed to GitHub.

## Open Questions
- None.
