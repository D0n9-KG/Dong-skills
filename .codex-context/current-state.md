# Current State

## Objective
Absorb useful Comet workflow-state ideas into Dong Skills while keeping the project Codex-only.

## Latest User Instruction
Continue and absorb Comet's advantages into Dong Skills.

## Current Phase
handoff / checkpoint

## Implemented
- Added `.codex-context/workflow-state.yaml` as a first-class project state file.
- Added `.codex/scripts/lib/workflow.mjs` and `scripts/workflow-state.mjs`.
- Exposed `workflow-state` through `.codex/hooks/project-ops.mjs`.
- Added transition, check, next, recover, and hash behavior inspired by Comet's state interface.
- Updated `SessionStart` recovery to inject workflow recovery context.
- Updated `PreCompact` and `Stop` to report malformed workflow state without turning it into a per-edit freshness gate.
- Updated health checks, bootstrap assets, installer/bootstrap script lists, AGENTS snippets, README, license attribution, and backlog.
- Updated workflow skills so routing, brainstorming, planning, execution, verification, review, and checkpoint phases write/read workflow state.
- Added regression tests for workflow state commands, bootstrap install, health validation, recovery context, and skill docs.

## Active Assumptions
- No OpenSpec directory layout, `.comet.yaml`, Claude Code adapter, global hook, or cross-platform installer work is in scope.
- The workflow state should guide phase recovery and routing, not block every source-file edit by mtime.

## Blockers
- None.

## Verification Snapshot
- `node --test tests\project-ops.test.mjs`: pass, 33/33.
- `node scripts\project-ops-health.mjs .`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass.

## Solution Memory Evaluation
- Outcome: drop.
- Reason: this is Dong Skills meta-learning/runtime hardening and is recorded in `docs/improvements/backlog.md`; no project `docs/solutions/` entry is needed.

## Next Action
Commit and push the checkpoint, then verify remote state.

## Last Updated
2026-06-15 17:21 +08:00
