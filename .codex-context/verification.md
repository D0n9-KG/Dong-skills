# Verification

## Commands Run
- `node --test tests\project-ops.test.mjs`
  - Result: pass.
  - Evidence: 51/51 tests passed.
  - Coverage: brainstorming continuation/spec gates; split global/project install; same-name non-Dong global preservation; same-name non-Dong project overwrite refusal; hook launcher cwd; workflow state; learning redaction/dedupe; checkpoint gates; project marker health; release privacy/readability; discussion/working-notes Stop and PreCompact behavior; asset governance; solution validation.
  - Date: 2026-06-20 16:39 +08:00.
- `node scripts\project-ops-health.mjs .`
  - Result: pass.
  - Evidence: no context, hook, script, project-level skill marker, bootstrap parity, worktree, or workflow-state issues.
  - Date: 2026-06-20 16:39 +08:00.
- `git diff --check`
  - Result: pass.
  - Evidence: no whitespace errors in the current diff.
  - Date: 2026-06-20 16:39 +08:00.
- `node scripts\release-check.mjs .`
  - Result: pass.
  - Evidence: health check, Node syntax checks, PowerShell parse checks, full Node test suite, privacy scan, text readability scan, large file scan, and runtime artifact scan passed.
  - Date: 2026-06-20 16:41 +08:00.
- `node scripts\release-check.mjs .`
  - Result: pass.
  - Evidence: final pre-commit release check passed after state refresh and non-Dong conflict tests were added.
  - Date: 2026-06-20 16:56 +08:00.

## Product Evidence
- Installer tests confirm global Dong Skills installs only `codex-codebase-onboarding` and `using-superpowers`, while full workflow skills install into the target project `.agents/skills/`.
- Installer tests confirm local non-Dong skills are preserved, including same-name global conflicts.
- Bootstrap tests confirm same-name non-Dong project skills are not overwritten; bootstrap fails instead.
- Hook tests confirm discussion and investigation state can block Stop or produce automatic PreCompact emergency recovery.
- Release check confirms no personal secret/key/path pattern, runtime artifact, oversized active text file, or mojibake marker in the publish scope.

## Review
- Self-review fixed one additional risk: health check now verifies root/asset manifest parity.
- Self-review fixed one additional risk: tests now cover same-name non-Dong global preservation and project overwrite refusal.
- Simplicity lens: uses existing manifest, markers, PowerShell copy/move, Node stdlib, and existing Codex hook events; no new dependency or global daemon.

## Not Yet Verified
- Real Codex UI `/hooks` trust screen was not manually inspected after this batch.
- External old projects have not been refreshed in this turn.
- Commit and push are pending.
