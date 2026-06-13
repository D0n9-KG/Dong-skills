# Spec

## Problem
Dong Skills intentionally adapted Superpowers/ECC/Compound Engineering into a lighter Codex workflow. Usage showed that some useful upstream flow-control constraints were weakened too much: plans can be vague, debugging can start fixes without a reliable reproduction, execution can skip test discovery, review gates are advisory, branch finishing lacks the fixed menu, and durable solution capture is too optional.

## Goals
- Keep Dong Skills lighter than the originals while restoring necessary gates that prevent drift, premature implementation, weak verification, and forgotten handoff/checkpoint decisions.

## Approval Status
Approved by user instruction on 2026-06-13: repair requested.

## User Decisions
- Do not fully import heavy upstream components just to be faithful to originals.
- Do preserve useful original process discipline when it directly prevents Codex from drifting, skipping discussion, or losing project state.
- Distinguish Dong Skills meta-learning from project memory.

## Non-Goals
- No Superpowers visual companion restoration.
- No mandatory subagent-driven implementation flow.
- No new runtime hooks for instruction-only gates in this pass.
- No destructive worktree cleanup automation.

## Approved Scope
- Strengthen borrowed workflow skills: `brainstorming`, `writing-plans`, `systematic-debugging`, `executing-plans`, `requesting-code-review`, `codex-review-panel`, `codex-worktree-governance`, `codex-git-checkpoint`, and `codex-solution-memory`.
- Add regression tests that check these gates remain present.
- Record the Dong Skills improvement in `docs/improvements/backlog.md`.
- Sync global installed skills after verification.

## Design
- `brainstorming`: preserve continuation loop and add a default requirement to compare 2-3 approaches for directional, architecture, product, API, UX, or behavior-changing work unless clearly mechanical or skipped.
- `writing-plans`: restore Superpowers-style plan discipline: scope check, file-structure ownership, test-first or characterization-first defaults, 2-5 minute task granularity, execution notes, test scenarios, acceptance-criteria mapping, and checkpoint guidance.
- `systematic-debugging`: make reproduction a hard gate before code changes, with automated failing test preferred and manual reproduction/gap recorded when automation is impractical.
- `executing-plans`: require critical plan review, test discovery before implementation-file edits, honoring execution notes, test update or recorded reason for behavior changes, checkpoint notes, and review/shipping gate before completion.
- `requesting-code-review` / `codex-review-panel`: make review mandatory for high-risk, cross-file, API/security/migration/user-visible, or plan-completion delivery work; skipping review requires a recorded low-risk reason.
- `codex-worktree-governance` / `codex-git-checkpoint`: add a Superpowers-inspired finishing menu adapted to Codex-managed worktrees.
- `codex-solution-memory`: require evaluation after non-trivial verified fixes, repeated investigations, architecture decisions, or cross-session reusable solutions; record the reason when not saving.

## Acceptance Criteria
- `tests/project-ops.test.mjs` guards the restored gates.
- `node --test tests\project-ops.test.mjs` passes.
- `node scripts\release-check.mjs .` passes.
- `node .codex\hooks\project-ops.mjs asset-governance` passes or any advisory is resolved/recorded.
- `git diff --check` passes.
- Global installed skill copies are synced from source.

## Open Questions
- None blocking.

## Next Step
Commit and push the verified checkpoint.
