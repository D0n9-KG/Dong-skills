# Handoff Summary

## Objective
Fix validated external review findings for Dong Skills while preserving the Codex-only release scope.

## Latest User Instruction
Fix the validated issues; do not implement cross-platform installation; keep this as a Codex-specific version.

## Approved Scope / Spec
- Approved by user instruction on 2026-06-14.
- In scope: Codex runtime/CLI bugs, skill wording defects, Goal mode definition, template consistency, README scope clarification, tests, backlog, and state files.
- Out of scope: Claude Code adapter, `.claude` layout, `CLAUDE.md` shim, Claude hook conversion, macOS/Linux installer, and top-level legal license selection.

## Plan Status
- Execution mode: Traditional task-by-task execution.
- Tasks completed: review triage, code fixes, skill/doc/template fixes, regression tests, release verification, state refresh.
- Remaining action: commit and push checkpoint if requested/appropriate.

## Files Modified
- `.codex/scripts/lib/core.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/core.mjs`
- `.codex/hooks/project-ops.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`
- `.agents/skills/systematic-debugging/SKILL.md`
- `.agents/skills/codex-evidence-capture/SKILL.md`
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.agents/skills/using-superpowers/SKILL.md`
- `.codex/scripts/lib/templates.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/plan-progress.md`
- `README.md`
- `tests/project-ops.test.mjs`
- `docs/improvements/backlog.md`
- `.codex-context/current-state.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/decisions.md`
- `.codex-context/risks.md`
- `.codex-context/handoff-summary.md`

## Files Read But Not Changed
- External review attachment supplied by the user.
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/git.mjs`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- relevant skill files and state files.

## Decisions Made
- Keep Dong Skills Codex-only for this release line; Claude Code support should be a separate adapter if needed.
- Do not add cross-platform installers in this pass.
- Use nearest existing ancestor mtime for deleted files instead of `Date.now()` in staleness checks.
- Make `session-history` parse explicit project roots consistently with other CLI modes.
- Treat direct shipped CLI/API/workflow use as product evidence, while not relabeling generic test framework output as a demo.
- Require actual current-session Codex goal tools before selecting Goal mode; do not simulate Goal mode with headings alone.
- Defer top-level legal license selection to the repo owner.

## Open Questions And Assumptions
- No blocking open questions.
- Global installed skills were refreshed with `scripts\install-windows.ps1`; existing target projects still need project-local refresh/bootstrap to receive the hook/template fixes.
- Top-level license selection remains a future owner decision.

## Risks
- Older target projects can still show deleted-file stale false positives or `session-history <root>` failures until refreshed.
- Goal mode remains enforced by skill/state guidance and actual goal tool availability, not a dedicated hook.
- Context budget is ~51,524 tokens across 54 files; future cleanup may split large helper modules if context pressure grows.

## Verification Evidence
- `node --test tests\project-ops.test.mjs`: pass, 30/30.
- `node scripts\release-check.mjs .`: pass before commit.
- `node scripts\project-ops-health.mjs .`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass, no advisories.
- `git diff --check`: pass.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, no pending observations/outbox items.
- `node .codex\hooks\project-ops.mjs context-budget`: pass/advisory, ~51,524 tokens across 54 files.

## Git Checkpoint
- Latest commit: this checkpoint commit, `fix(workflow): address review-validated gaps`
- Push state: prepared for push to `origin/main`.
- Files included: all files listed under Files Modified.
- Files intentionally left uncommitted: none intended.
- Deferred reason: none.
- Next checkpoint: push `origin/main` and verify remote branch.

## Learned Instincts To Preserve
- Dong Skills improvement findings belong in `docs/improvements/backlog.md`, not project instincts.
- Review feedback must be triaged against the actual target harness; Claude Code compatibility concerns are not automatically Codex bugs.
- State files must avoid private local paths because release privacy scans cover active context files.

## Next Action
Push `origin/main` and verify remote branch.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/plan-progress.md`
4. `.codex-context/artifact-index.md`
5. `.codex-context/verification.md`
6. `.codex/scripts/lib/core.mjs`
7. `.codex/hooks/project-ops.mjs`
8. `.agents/skills/executing-plans/SKILL.md`
9. `.agents/skills/codex-evidence-capture/SKILL.md`
10. `tests/project-ops.test.mjs`
