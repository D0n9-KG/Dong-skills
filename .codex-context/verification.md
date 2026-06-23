# Verification

## Commands Run
- `node --test tests\project-ops.test.mjs`
  - Result: pass.
  - Evidence: 55/55 tests passed.
  - Coverage: existing governance/hook behavior plus hot/warm/cold context-budget reporting and release-check failure when hot recovery context exceeds the fail threshold.
  - Date: 2026-06-23 15:35 +08:00.
- `node .codex\hooks\project-ops.mjs context-budget`
  - Result: pass.
  - Evidence: hot recovery path reported as ~11,225 tokens across 12 files; hot budget status `ok`; warm on-demand and cold runtime/bootstrap costs reported separately.
  - Date: 2026-06-23 15:42 +08:00.
- `node .codex\hooks\project-ops.mjs health-check`
  - Result: pass.
  - Evidence: no context, hook, script, worktree, workflow-state, or bootstrap parity issues.
  - Date: 2026-06-23 15:42 +08:00.
- `git diff --check`
  - Result: pass.
  - Evidence: no whitespace errors in the current diff.
  - Date: 2026-06-23 15:42 +08:00.
- `node scripts\release-check.mjs .`
  - Result: pass.
  - Evidence: health check, context budget scan, syntax checks, PowerShell parse checks, full Node test suite, privacy scan, text readability scan, large file scan, and runtime artifact scan passed.
  - Date: 2026-06-23 15:44 +08:00.

## Product Evidence
- `context-budget` now reports total scanned tokens separately from hot recovery path, warm on-demand path, and cold runtime/bootstrap path.
- Release check now includes `PASS context budget scan`.
- A regression test constructs an oversized hot `AGENTS.md` and confirms release check fails with `Hot budget status: fail`.

## Review
- Scope intentionally avoided splitting large runtime modules in this batch because the new report shows current hot recovery path is under the warning threshold.
- Remaining large files are maintenance-cost targets, not ordinary session recovery blockers.

## Not Yet Verified
- Real downstream projects have not been refreshed in this turn.
- Optional follow-up module splitting has not been implemented.
- Commit and push are pending.
