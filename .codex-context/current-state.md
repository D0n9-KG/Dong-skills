# Current State

## Objective
Fix validated external review findings for Dong Skills while keeping the project Codex-only.

## Latest User Instruction
Fix the validated review items, but do not add cross-platform installation work; this release line is Codex-specific.

## Current Phase
checkpoint

## Implemented
- `latestChangedMtime()` now uses the nearest existing ancestor mtime for deleted files instead of `Date.now()`, preventing repeated stale-state false positives after file deletion.
- `session-history` CLI now accepts an explicit project root argument consistently with other `project-ops.mjs` CLI commands.
- `systematic-debugging` no longer contains the shell-escaped `project'"'"'s` artifact.
- `codex-evidence-capture` now distinguishes test framework output from direct CLI/API/product workflow evidence.
- Goal mode instructions now require an actual Codex goal mechanism in the current session and forbid simulating Goal mode through headings alone.
- `plan-progress.md` templates now include `Spec Approval` and record whether a real Goal mode mechanism is available.
- README now explicitly states the current release is Codex-only; Claude Code support would require a separate adapter.
- Regression tests cover the CLI root fix, deleted-file freshness behavior, evidence wording, Goal mode mechanism requirement, and bootstrap template text.

## Active Assumptions
- No Claude Code adapter, `.claude` directory, or cross-platform installer is in scope for this fix.
- Root `LICENSE` selection remains deferred because choosing a top-level legal license should be a user/repo-owner decision.
- Global installed skills were refreshed with `scripts\install-windows.ps1`; existing target projects still need their project-local Dong Skills files updated before they receive the hook/template fixes.

## Blockers
- None.

## Verification Snapshot
- `node --test tests\project-ops.test.mjs`: pass, 30/30.
- `node scripts\release-check.mjs .`: pass before commit.
- `node scripts\project-ops-health.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, no pending observations/outbox items.
- `node .codex\hooks\project-ops.mjs context-budget`: pass/advisory, ~51,524 tokens across 54 files.

## Solution Memory Evaluation
- Outcome: drop.
- Reason: this is Dong Skills workflow/runtime hardening and is recorded in `docs/improvements/backlog.md`; no project `docs/solutions/` entry is needed.

## Next Action
Push `origin/main` and verify remote branch.

## Last Updated
2026-06-14 15:17 +08:00
