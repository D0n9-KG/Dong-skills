# Dong Skills Remaining Optimization Plan

## Active Plan
- Goal: implement the already-discussed Dong Skills optimization items beyond the source-repo deposit path.
- Spec: `.codex-context/spec.md`

## Spec Approval
Approved by user correction on 2026-06-13.

## Execution Approval
User asked to continue addressing the missed optimization items.

## Tasks
- [x] Task 1: Implement Living Spec and iterative brainstorming cadence.
  - Files: `.agents/skills/brainstorming/SKILL.md`
  - Evidence: skill now requires Living Draft status, one important question per message, and section-by-section confirmation.
- [x] Task 2: Implement learning observation topic dedupe and Chinese regression coverage.
  - Files: `.codex/scripts/lib/learning.mjs`, bootstrap copy, `tests/project-ops.test.mjs`
  - Evidence: tests confirm one grouped observation for repeated Dong Skills status follow-ups and readable Chinese excerpt.
- [x] Task 3: Improve Stop Git Checkpoint diagnostics.
  - Files: `.codex/scripts/lib/git.mjs`, bootstrap copy, `tests/project-ops.test.mjs`
  - Evidence: tests confirm stale handoff output includes latest changed file and refresh instruction.
- [x] Task 4: Add one-step verification pruning command shape.
  - Files: `scripts/state-prune.mjs`, bootstrap copy, `tests/project-ops.test.mjs`, `codex-asset-governance`
  - Evidence: tests confirm `--verification --archive --keep-latest --apply` archives old entries and writes an active pointer.
- [x] Task 5: Mark implemented backlog items accurately.
  - Files: `docs/improvements/backlog.md`
  - Evidence: implemented items no longer appear as proposed.
- [x] Task 6: Sync global installation and avoid self-install hook formatting churn.
  - Files: `scripts/install-windows.ps1`
  - Evidence: self-install no longer leaves `.codex/hooks.json` changed when hook config is semantically unchanged.

## Current Step
Final checkpoint commit and push.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 23/23.
- `node scripts\release-check.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories after pruning.
- `git diff --check`: pass.

## Out Of Scope
- No broad pre-edit hook.
- No runtime enforcement for Living Spec beyond skill instructions.
- No automatic migration from Dong Skills outbox to backlog.
