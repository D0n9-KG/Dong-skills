# Plan Progress

## Active Plan
- Goal: harden Dong Skills after multi-agent review findings.
- Spec: `.codex-context/spec.md`.

## Spec Approval
Approved by user instruction on 2026-06-15: fix all confirmed Dong Skills review findings.

## Execution Approval
Approved by user for Traditional task-by-task execution on 2026-06-15.

## Execution Mode
Traditional task-by-task execution.

## Goal Mode Objective
Not selected for this task.

## Runtime Constraints
- Keep Dong Skills Codex-only.
- Do not add Claude/cross-platform installer scope.
- Preserve project-level hooks and the existing `.codex-context` model.
- Add regression tests for each confirmed runtime/install/release fix.
- Keep bootstrap asset copies synchronized with root runtime files.

## Checkpoint Cadence
- One checkpoint after tests, health check, release check, diff check, review, state refresh, and final diff review pass.

## Acceptance Mapping
- No-root workflow hook commands work: covered by `project hook forwards workflow-state commands`.
- Missing workflow state is reported without recreation: covered by `workflow-state checks report missing state without recreating it`.
- Bootstrapped target project `release-check` works: covered by `bootstrapped project hook release-check resolves .codex helper scripts`.
- Windows install preserves Chinese: covered by `Windows installer preserves existing UTF-8 Chinese AGENTS.md`.
- PostToolUse covers shell writes: covered by `PostToolUse hook matcher covers shell-based file writes`.
- Release privacy/size gates catch tests and large docs: covered by `release check scans tests for secrets` and `release check rejects oversized text assets`.
- Learning redaction covers common PII/token shapes: covered by `learning observations redact common PII and platform tokens`.

## Test Scenarios
- Happy path: full `node --test tests\project-ops.test.mjs`, health check, release check, and diff check pass.
- Regression path: documented `workflow-state next/recover` commands work without explicit root.
- Error/edge path: missing workflow state, invalid workflow enum values, test-secret, oversized docs, and bootstrapped release-check paths are tested.
- Non-goal preservation: project-level hooks remain; no global hooks, Claude adapter, OpenSpec layout, or cross-platform installer scope added.

## Tasks
- [x] Task 1: Fix workflow CLI routing and workflow-state validation.
  - Evidence: no-root workflow command tests pass; missing state is reported without recreation.
- [x] Task 2: Fix Windows install and project-level release-check paths.
  - Evidence: installer UTF-8 test and bootstrapped project release-check test pass.
- [x] Task 3: Harden hook matcher, release privacy/size gates, and learning redaction.
  - Evidence: matcher, privacy, large-file, and learning redaction tests pass.
- [x] Task 4: Synchronize docs/state/assets and run release verification.
  - Evidence: health check, release check, `git diff --check`, and review gate pass.

## Current Step
Checkpoint and final delivery.

## Verification
- `node --test tests\project-ops.test.mjs`: pass, 40/40 tests.
- `node scripts\project-ops-health.mjs .`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.

## Review
- `codex-review-panel` lenses applied: correctness, testing, maintainability, project standards, security/privacy, reliability.
- Result: no actionable findings.

## Out Of Scope
- Claude Code adapter.
- macOS/Linux/cross-platform installer.
- Global hooks.
- OpenSpec directory model.
