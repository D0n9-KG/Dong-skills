# Spec

## Problem
Dong Skills already had Markdown-based phase gates, but it lacked a single script-readable workflow state like Comet's `.comet.yaml`. After compaction or a new session, Codex could still infer the current phase from scattered files instead of reading one authoritative phase/next-skill contract.

## Goals
- Add a Codex-only workflow state file under `.codex-context/`.
- Provide a small CLI for state initialization, transition, checking, next-step routing, recovery, and context hashing.
- Connect the state file to hooks, recovery, health checks, bootstrap assets, and core workflow skills.
- Preserve Dong Skills' existing `.codex-context` model without importing OpenSpec change directories or Claude/cross-platform adapters.

## Approval Status
Approved by user instruction on 2026-06-15: absorb Comet's useful workflow-state ideas into Dong Skills.

## User Decisions
- Borrow Comet's useful phase-state, guard, `next`, recovery, and decision-point ideas.
- Do not import OpenSpec wholesale.
- Keep this release Codex-only; no cross-platform/Claude adapter work in this change.
- Do not make workflow state a noisy per-file freshness gate.

## Candidate Options
- Import Comet/OpenSpec layout directly: rejected as too heavy and not aligned with Dong Skills' Codex-only `.codex-context` structure.
- Keep only prose gates: rejected because recovery and routing remain too inferential.
- Add a compact `workflow-state.yaml` plus CLI/checks inside Dong Skills: selected.

## Non-Goals
- No `.comet.yaml`, `openspec/changes`, or OpenSpec archive flow.
- No cross-platform installer changes beyond the existing Windows/Codex flow.
- No new global hooks.
- No hook that blocks before every file edit.

## Approved Scope
- Add `.codex-context/workflow-state.yaml` template and current repo state.
- Add `workflow-state` runtime library and CLI.
- Add hook forwarding, recovery injection, health-check validation, bootstrap asset sync, and tests.
- Update `using-superpowers`, governance, brainstorming, planning, execution, verification, review, checkpoint, onboarding, README, AGENTS snippets, and backlog docs.

## Design
- `workflow-state.yaml` stores `phase`, `next_skill`, `decision_required`, spec/plan/execution status, verification result, review status, checkpoint status, and a context hash.
- `workflow-state.mjs` supports `init`, `status`, `get`, `set`, `transition`, `check`, `next`, `recover`, and `hash`.
- `using-superpowers` reads `workflow-state next` before routing non-trivial project work.
- Skill phase boundaries call semantic transitions such as `spec-ready`, `spec-approved`, `plan-ready`, `execution-approved-traditional`, `execution-complete`, `verification-pass`, and `checkpoint-ready`.
- `SessionStart` includes workflow recovery output; `PreCompact`/`Stop` report malformed workflow state but do not require it to be newer than every source edit.
- Bootstrap assets include the new state file, runtime library, CLI script, and updated guidance.

## Acceptance Criteria
- `node --test tests\project-ops.test.mjs` passes and covers workflow transitions, `next`, recovery, hash, hook forwarding, bootstrap install, and health-check validation.
- `node scripts\project-ops-health.mjs .` passes.
- `node scripts\release-check.mjs .` passes.
- `git diff --check` passes.
- README/backlog/license source attribution includes Comet.

## Open Questions
- None blocking.

## Next Step
Commit and push a checkpoint after state refresh.
