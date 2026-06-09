# Spec

## Problem
The Dong Skills review found several hardening gaps: raw learning observations could be committed in target projects, learning redaction missed some sensitive forms, existing project upgrades did not patch missing template sections, Git Checkpoint notes were accepted when vague, recovery excerpts could omit the most important handoff sections, and hook behavior lacked repeatable regression tests.

## Goals
- Protect `.codex-context/raw/` in target project `.gitignore`.
- Redact complete private-key blocks and URL userinfo from learning observations.
- Patch missing context-template sections during install/bootstrap without overwriting project-specific content.
- Validate structured Git Checkpoint fields when work is dirty, unpushed, or lacks upstream.
- Make recovery excerpts section-aware so `Git Checkpoint`, `Next Action`, and `Files To Re-read First` survive long handoffs.
- Add health-check, release-check, and repeatable tests.
- Keep root files and onboarding bootstrap assets consistent.

## Non-Goals
- Do not install global hooks.
- Do not auto-commit or auto-push work.
- Do not replace GitHub plugin PR workflows.
- Do not rewrite unrelated Superpowers/ECC-derived skills.

## Approved Scope
- Hook logic, install/bootstrap scripts, onboarding assets, README/AGENTS guidance, health/release scripts, tests, and project state files.

## User Decisions
- 2026-06-09: Patch all reviewed issues in order.
- 2026-06-09: Keep these fixes in the main Dong Skills flow, not optional modules.

## Acceptance Criteria
- Syntax checks pass for hooks, helper scripts, and tests.
- Node regression tests pass.
- `health-check` passes for the kit root.
- `release-check` passes for the kit root or any remaining gap is explicit.
- Privacy scan finds no personal paths, credentials, raw observations, logs, backups, or runtime artifacts.
- Bootstrap assets contain the same hook/helper behavior as root.

## Open Questions
- None.
