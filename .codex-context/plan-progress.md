# Plan Progress

## Active Plan
- Goal: absorb Ponytail-inspired anti-overengineering mechanisms into Dong Skills.
- Spec: user-approved inline request on 2026-06-18.

## Spec Approval
Approved by user instruction on 2026-06-18: implement the Ponytail-inspired changes, with the P0 Simplicity Gate limited to "can avoid building / stdlib / native platform".

## Execution Approval
Approved by user for Traditional task-by-task execution on 2026-06-18.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Keep Dong Skills Codex-only.
- Do not import Ponytail wholesale or add mode switching.
- Simplicity Gate must only require: avoid building, standard library, native platform.
- Keep existing brainstorming/spec/plan approval gates intact.
- Add tests for new routing, debt scanning, hook observability, and release health impact.

## Checkpoint Cadence
- One checkpoint after implementation, test suite, health check, release check, diff check, review/state refresh, and final diff review pass.

## Acceptance Mapping
- Simplicity Gate in planning/execution/review -> update `writing-plans`, `executing-plans`, `codex-review-panel`, `using-superpowers`, and governance docs -> tested by skill content assertions.
- Anti-overengineering review skill -> add `codex-simplicity-review` and route it from project skills -> tested by skill existence and router assertions.
- Simplification debt tracking -> add `dong-debt:` convention and asset-governance scanner -> tested by asset-governance fixture.
- Hook observability -> expose root/phase/next_skill/decision/staleness status in hook output -> tested by SessionStart/Stop hook fixtures.

## Test Scenarios
- Happy path: `node --test tests\project-ops.test.mjs`, health check, release check, and `git diff --check` pass.
- Regression path: bootstrap asset parity remains intact after runtime script changes.
- Error/edge path: `dong-debt:` marker without trigger is reported by asset-governance but does not become active project memory.
- Non-goal preservation: no Claude adapter, global hook, cross-platform installer, Ponytail mode switch, or full Ponytail ladder.

## Tasks
- [x] Task 1: Add Simplicity Gate and `codex-simplicity-review` skill routing.
  - Files: `.agents/skills/**/SKILL.md`, `AGENTS*.md`, README source list.
  - Evidence: skill routing/content assertions pass in `node --test tests\project-ops.test.mjs`.
- [x] Task 2: Add `dong-debt:` asset-governance scanning and tests.
  - Files: `.codex/scripts/lib/assets.mjs`, `scripts/asset-governance.mjs` dependencies, bootstrap mirror.
  - Evidence: asset-governance fixture reports 2 markers and 1 missing trigger.
- [x] Task 3: Add hook observability output and tests.
  - Files: `.codex/scripts/lib/events.mjs`, `.codex/scripts/lib/recovery.mjs`, bootstrap mirror.
  - Evidence: SessionStart, PostToolUse, and Stop fixture assertions include hook status. PostToolUse uses a lightweight status path to avoid full asset scans on every edit.
- [x] Task 4: Refresh docs/state/assets and run verification.
  - Files: `.codex-context/*`, bootstrap mirrored runtime files, tests.
  - Evidence: full local verification commands pass.

## Current Step
Verified patch ready for optional checkpoint commit/push or final report.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 42/42 tests.
- `node scripts\project-ops-health.mjs .`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.

## Out Of Scope
- Full Ponytail import.
- `lite/full/ultra/off` modes.
- One-line/minimum-implementation checks in the mandatory P0 gate.
- Claude/cross-platform adapter work.
