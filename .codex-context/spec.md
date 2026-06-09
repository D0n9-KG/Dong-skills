# Spec

## Problem
Using Dong Skills in a new project should not require the user to manually run a project installer every time. Global hooks are too rigid for per-repository governance.

## Goals
- Keep Dong Skills skills globally available.
- Keep hooks project-scoped.
- Let `codex-codebase-onboarding` bootstrap missing project-level `.codex-context`, `.codex/hooks`, `.codex/hooks.json`, and `AGENTS.md` governance instructions.
- Publish a clean repository and zip without private runtime data.

## Non-Goals
- Do not install global hooks.
- Do not require every new project to run the kit-level installer manually after the skills are installed.

## Approved Scope
- Add bootstrap assets and script to the onboarding skill.
- Update installer and README to describe project-level hooks and skill-based project bootstrap.
- Remove obsolete global-hook dispatcher artifacts.

## User Decisions
- 2026-06-09: Use project-level hooks instead of global hooks.
- 2026-06-09: Make new-project bootstrap part of `codex-codebase-onboarding`.

## Acceptance Criteria
- Global `~/.codex/hooks.json` and global dispatcher are absent.
- Installed onboarding skill contains bootstrap script and assets.
- Re-running bootstrap is idempotent and does not duplicate hook groups.
- Release scan finds no private paths, secrets, raw observations, logs, backups, or smoke-test projects.
- JavaScript hook and utility scripts pass syntax checks.

## Open Questions
- None.
