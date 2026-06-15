# Spec

## Problem
The multi-agent review found several Dong Skills reliability gaps in workflow routing, compaction recovery, Windows installation, release checks, hook coverage, and privacy gates. Existing tests passed, but multiple real usage paths could fail or silently drift.

## Goals
- Fix `project-ops.mjs workflow-state next/recover/transition` so documented no-root commands work from a target project.
- Make missing or malformed `workflow-state.yaml` visible to Stop/PreCompact/health checks instead of silently resetting state.
- Make project-level `release-check` work in bootstrapped projects where helper scripts live under `.codex/scripts/`.
- Make Windows installation preserve UTF-8 Chinese text and reduce global skill replacement risk.
- Expand PostToolUse coverage for shell/Bash writes.
- Strengthen release privacy, size, and learning redaction gates.
- Keep root files, bootstrap assets, docs, and tests synchronized.

## Approval Status
Approved by user instruction on 2026-06-15: fix all confirmed Dong Skills review findings.

## User Decisions
- Fix all confirmed review findings, not only the highest-severity items.
- Keep the kit Codex-only; no cross-platform installer expansion in this patch.
- Preserve project-level hooks rather than reintroducing global hooks.

## Candidate Options
- Patch only P1 issues: rejected because user asked to fix all confirmed findings.
- Redesign the workflow state model: rejected as too broad; current model is sound enough and needs hardening.
- Focused hardening with regression tests: selected.

## Non-Goals
- No Claude Code adapter.
- No macOS/Linux installer.
- No wholesale OpenSpec/Comet import.
- No destructive cleanup of user projects.

## Approved Scope
- `.codex/hooks/project-ops.mjs`, `.codex/hooks.json`, `.codex/scripts/lib/*.mjs`.
- `scripts/install-windows.ps1`, `scripts/project-ops-health.mjs`, `scripts/release-check.mjs`, and related helper scripts.
- Bootstrap asset mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`.
- AGENTS guidance where commands or recovery rules change.
- `tests/project-ops.test.mjs` regression coverage.

## Design
- Fix hook CLI argument parsing by treating known subcommands as commands, not roots.
- Make workflow state reads strict for status/check/recover/hook paths while preserving explicit `workflow-state init`.
- Mirror workflow enum validation in health checks.
- Resolve helper scripts from both `scripts/` and `.codex/scripts/` in release checks.
- Use explicit UTF-8 read/write helpers in `install-windows.ps1`; replace global skills through a staging directory and backup rather than delete-then-copy.
- Include shell/Bash/PowerShell-style tool names in PostToolUse matcher.
- Scan tests and archive for secrets, preserve raw runtime conventions, add file-size release gates, and extend learning redaction.

## Acceptance Criteria
- No-root workflow commands work: `node .codex/hooks/project-ops.mjs workflow-state next` and `recover`.
- Stop/PreCompact/health-check report missing/invalid workflow state instead of recreating it silently.
- A freshly bootstrapped target project can run `node .codex/hooks/project-ops.mjs release-check`.
- Windows installer preserves existing Chinese `AGENTS.md` content.
- Release check fails for secrets in tests and oversized docs.
- Learning observation redacts expanded PII/token samples.
- `node --test tests\project-ops.test.mjs`, `node scripts\project-ops-health.mjs .`, `node scripts\release-check.mjs .`, and `git diff --check` pass.

## Open Questions
- None blocking.

## Next Step
Checkpoint the verified hardening patch, then deliver the result.
