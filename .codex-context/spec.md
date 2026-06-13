# Spec

## Problem
Dong Skills tells agents to record skill/hook/workflow improvement ideas in `docs/improvements/backlog.md`, but project sessions often only see installed skill copies under `%USERPROFILE%\.agents\skills`. Those copies are not the Git source repo and do not contain the authoritative backlog. When the source repo cannot be located, agents have no standard fallback location and may mix Dong Skills meta-learning into project instincts, handoff, verification, or ad hoc notes.

## Goals
- Let any project session determine where a Dong Skills improvement should be recorded.
- Avoid editing installed skill copies as if they were source.
- Provide a standard fallback outbox when the real source repo is unavailable.
- Make `learning-status` answer where Dong Skills meta-learning will go.
- Generate a local source marker during installation.
- Keep the outbox separate from project memory and solution memory.

## Non-Goals
- Do not automatically migrate outbox entries into the Dong Skills repo.
- Do not make `.codex-context/dong-skills-outbox.md` active project memory.
- Do not hardcode private machine-specific source paths into published files.
- Do not solve semantic observation deduplication in this pass.

## Approved Scope
Approved by user on 2026-06-13 as a P0 Dong Skills workflow fix.

## User Decisions
- Dong Skills optimization deposits must have a concrete location from other sessions.
- Installed skill copies must not be treated as the Dong Skills source repo.
- If the source repo cannot be found, a standard outbox is required.

## Design
- `install-windows.ps1` writes `%USERPROFILE%\.agents\skills\.dong-skills-source.json` with local source repo metadata.
- `.codex/scripts/lib/learning.mjs` discovers the Dong Skills source repo from env vars, global source markers, current repo, nearby known candidates, then fallback.
- Discovery validates a source repo by requiring both `docs/improvements/backlog.md` and `.agents/skills/codex-learning-memory/SKILL.md`.
- Installed skill copies under `%USERPROFILE%\.agents\skills` and `%USERPROFILE%\.codex\skills` are rejected as source repos.
- `.codex-context/dong-skills-outbox.md` is added to templates and bootstrap assets.
- `learning-status` displays target backlog, source, fallback outbox, pending outbox count, and installed-copy warning.
- Skill docs and snippets define the required status answer shape: target, actual, unfinished reason, risk, next migration step.

## Acceptance Criteria
- New projects get `.codex-context/dong-skills-outbox.md` during bootstrap.
- `learning-status` reports fallback outbox when no source repo is found.
- `learning-status` reports the real backlog when `DONG_SKILLS_REPO` points to a valid source repo.
- Global install writes a source marker.
- Health check requires the outbox state file.
- Tests cover source discovery and fallback outbox status.
- Release check, privacy scan, health check, asset governance, and diff check pass.

## Open Questions
- None for this pass.

## Approval Status
Approved by user on 2026-06-13.

## Next Step
Final verification, commit, and push.
