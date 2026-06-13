# Current State

## Objective
Make Dong Skills meta-learning actionable from any project session by locating the real Dong Skills source repo or falling back to a standard project outbox.

## Latest User Instruction
User pointed out that other sessions trying to deposit Dong Skills skill-optimization ideas cannot find the correct location and often only see installed skill copies.

## Current Phase
verification

## Implemented
- Added `.codex-context/dong-skills-outbox.md` as the standard fallback queue for Dong Skills improvement candidates.
- Added Dong Skills source repo discovery to learning runtime:
  - `DONG_SKILLS_REPO`
  - `DONG_SKILLS_HOME`
  - `%USERPROFILE%\.agents\skills\.dong-skills-source.json`
  - `%USERPROFILE%\.codex\skills\.dong-skills-source.json`
  - current repo if it is the Dong Skills source checkout
  - nearby known checkout candidates
  - fallback outbox
- Explicitly rejects installed skill copies as source repos.
- `learning-status` now reports the detected target backlog, fallback outbox path, pending outbox count, and installed-copy warning.
- `install-windows.ps1` writes the global source marker during global skill sync.
- Bootstrap templates, recovery order, health checks, AGENTS snippets, README, and tests are updated.
- User-provided PRD/backlog items are recorded in `docs/improvements/backlog.md`.

## Active Assumptions
- The global source marker is local runtime metadata and must not be committed.
- If the real Dong Skills repo is unavailable, `.codex-context/dong-skills-outbox.md` is the correct temporary location.
- Outbox entries are not project instincts or project rules.

## Blockers
- None.

## Verification Snapshot
- `node --test tests\project-ops.test.mjs`: pass, 21/21.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, reports current repo as Dong Skills target and zero pending outbox items.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.
- Extra privacy scan: pass; no real private path or secret findings.

## Next Action
Commit and push the verified checkpoint.

## Last Updated
2026-06-13 16:28 +08:00
