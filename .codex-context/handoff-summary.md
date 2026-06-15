# Handoff Summary

## Objective
Absorb Comet's useful workflow-state ideas into Dong Skills while preserving the Codex-only project-ops model.

## Latest User Instruction
Continue and absorb Comet's advantages into Dong Skills.

## Approved Scope / Spec
- Approved by user instruction on 2026-06-15.
- In scope: Codex-only `workflow-state.yaml`, CLI state interface, routing/recovery integration, bootstrap assets, health checks, skill guidance, README/backlog/license/test updates.
- Out of scope: OpenSpec layout import, `.comet.yaml`, Claude Code adapter, global hooks, cross-platform installer work, and per-edit workflow-state freshness blocking.

## Plan Status
- Execution mode: Traditional task-by-task execution.
- Tasks completed: state runtime, CLI, hook forwarding, recovery, health/bootstrap integration, skill docs, README/backlog/license, tests, release checks, state refresh.
- Remaining action: commit and push checkpoint.

## Files Modified
- See `.codex-context/artifact-index.md` for the full created/modified list.
- Key files: `.codex/scripts/lib/workflow.mjs`, `scripts/workflow-state.mjs`, `.codex-context/workflow-state.yaml`, `.codex/hooks/project-ops.mjs`, `.codex/scripts/lib/{templates,events,recovery,assets}.mjs`, `scripts/project-ops-health.mjs`, workflow skill docs, bootstrap assets, README, tests, backlog, and `licenses/COMET-LICENSE`.

## Files Read But Not Changed
- Local Comet clone under `%TEMP%\comet-inspect`, including `comet-state.sh`, decision-point protocol, and phase guard rules.

## Decisions Made
- Adapt Comet's state-machine idea, not its OpenSpec directory layout.
- Keep workflow state under `.codex-context/workflow-state.yaml`.
- Use machine values for phase/status fields so hooks and scripts can validate them.
- Make workflow-state malformed/missing checks part of Stop/PreCompact, but do not require the workflow file to be newer than every source edit.
- Use `workflow-state next` as the router contract and `workflow-state recover` as the compaction/new-session recovery summary.

## Open Questions And Assumptions
- No blocking open questions.
- Assumption: current transition set is enough for the main Dong Skills lifecycle; future usage can add more semantic transition events.

## Risks
- Existing target projects need project-local update/bootstrap before they receive the new workflow-state files.
- If agents ignore `using-superpowers` and project `AGENTS.md`, workflow-state guidance can still be bypassed.
- Transition names are now part of the internal contract; future renames need migration or compatibility handling.

## Verification Evidence
- `node --test tests\project-ops.test.mjs`: pass, 33/33.
- `node scripts\project-ops-health.mjs .`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass.

## Git Checkpoint
- Latest commit: pending.
- Push state: not pushed yet.
- Files included: all current Dong Skills workflow-state changes after final staging.
- Files intentionally left uncommitted: none intended.
- Deferred reason: none; checkpoint is the next action.
- Next checkpoint: commit and push `origin/main`, then verify remote branch.

## Learned Instincts To Preserve
- Comet-style state machines are useful when adapted as a compact Codex phase state, not when copied wholesale with unrelated platform structure.
- State files should distinguish phase/routing truth from per-edit artifact freshness.

## Next Action
Commit and push checkpoint, then verify remote branch.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/workflow-state.yaml`
3. `.codex-context/current-state.md`
4. `.codex-context/plan-progress.md`
5. `.codex-context/artifact-index.md`
6. `.codex-context/verification.md`
7. `.codex/scripts/lib/workflow.mjs`
8. `scripts/workflow-state.mjs`
9. `.agents/skills/using-superpowers/SKILL.md`
10. `tests/project-ops.test.mjs`
