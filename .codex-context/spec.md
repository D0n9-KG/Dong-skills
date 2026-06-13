# Spec

## Problem
The previous checkpoint implemented Dong Skills improvement deposit routing, but several user-reported optimization items were only recorded in `docs/improvements/backlog.md` and not implemented.

## Goals
- Make `brainstorming` preserve discussion state before final approval through Living Spec mode.
- Make `brainstorming` ask one important question per assistant message and confirm complex designs section by section.
- Reduce repeated raw learning observations for the same Dong Skills meta-learning topic.
- Verify Chinese learning observation excerpts remain UTF-8 readable.
- Make Stop Git Checkpoint blocks explain stale handoff evidence directly.
- Make verification pruning a one-command path with active archive pointers.
- Mark implemented backlog items accurately.

## Non-Goals
- Do not add a broad pre-edit hook.
- Do not make Living Spec a runtime hook.
- Do not implement automatic migration of Dong Skills outbox entries.
- Do not rewrite the full README Chinese section in this pass.

## Approved Scope
Approved by user correction on 2026-06-13: finish the previously discussed optimization items, not only the skill-optimization deposit path.

## User Decisions
- The previous source-repo deposit fix was incomplete relative to the earlier backlog.
- Brainstorming should not become as heavy as upstream Superpowers, but it needs enough structure to avoid drifting, skipping spec approval, or dumping many questions at once.
- Learning memory should distinguish project instincts from Dong Skills optimization candidates.

## Design
- Update `brainstorming/SKILL.md` with Living Spec mode, `Living Draft / Not Approved`, confirmed decisions, candidate options, and one-question clarification cadence.
- Add observation topics in `learning.mjs` and suppress repeated status follow-ups for an existing topic.
- Extend `learning-status` with grouped pending observations.
- Add tests proving Chinese JSONL excerpts remain readable and topic dedupe works.
- Extend Git checkpoint diagnostics with latest changed file, mtime evidence, and handoff refresh guidance.
- Add `state-prune --verification --archive --keep-latest N --apply`, archive older command evidence, and write an `Archived Evidence` pointer in active `verification.md`.
- Sync all changed runtime files into the onboarding bootstrap asset copy.

## Acceptance Criteria
- Tests cover Living-adjacent behavior through skill text review and runtime behaviors through unit tests.
- `node --test tests\project-ops.test.mjs` passes with new tests.
- `state-prune --verification --archive --keep-latest 8 --dry-run` runs through the hook dispatcher.
- Release check, asset governance, diff check, and privacy scan pass before completion.

## Open Questions
- None for this pass.

## Approval Status
Approved by user correction on 2026-06-13.

## Next Step
Run full release verification, commit, and push.
