# Handoff Summary

## Objective
Deliver and checkpoint the current Dong Skills update batch:

- compaction-resilient discussion and investigation state
- split install model: global bootstrap/router only, full project-level skills per repo
- strict preservation of non-Dong local skills

## Latest User Instruction
User asked to make some skills initialize into the project workspace, keep only general/bootstrap skills globally, and avoid touching local skills that are not Dong Skills.

## Approved Scope / Spec
- Approved spec: `.codex-context/spec.md`.
- Implemented:
  - `working-notes.md` active recovery file and ignored runtime `discussion-state.json`.
  - UserPromptSubmit/PostToolUse freshness markers, Stop blocks, PreCompact emergency recovery, SessionStart recovery excerpts.
  - `dong-skills.manifest.json` with `global_skills` and `project_skills`.
  - Global installer installs only `codex-codebase-onboarding` and `using-superpowers`.
  - Project bootstrap installs full workflow skills into `.agents/skills/` and writes `.dong-skills-project.json`.
  - Non-Dong local skills are preserved; same-name non-Dong project skills block overwrite.
  - README and skill docs explain the split model.

## Plan Status
- Execution mode: Traditional task-by-task execution.
- Implementation status: complete.
- Verification status: pass.
- Review status: complete.
- Checkpoint status: pending commit/push.

## Files Modified
- `dong-skills.manifest.json`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/recovery.mjs`
- `.codex/scripts/lib/templates.mjs`
- `.codex/hooks/project-ops.mjs`
- `.codex/hooks.json`
- Bootstrap mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`
- `.agents/skills/brainstorming/SKILL.md`
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-docs-stewardship/SKILL.md`
- `.agents/skills/codex-asset-governance/SKILL.md`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `README.md`
- `.gitignore`
- `tests/project-ops.test.mjs`
- `.codex-context/*`

## Files Read But Not Changed
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.codex-context/project-map.md`
- Existing state files before replacement.

## Decisions Made
- Global Dong install is bootstrap-only.
- Full Dong workflow skills are installed per project into `.agents/skills/`.
- `.dong-skills-source.json` records the source checkout for project bootstrap.
- `.agents/skills/.dong-skills-project.json` marks healthy project-level install.
- Installer cleanup is manifest/marker/origin-text based and limited to Dong skill names.
- Same-name non-Dong project skills are never silently overwritten.
- Existing projects must run bootstrap/update to receive the project-local model.

## Open Questions And Assumptions
- No blocking open questions.
- Assumption: old projects may still show global skills until this updated global installer is run once.
- Assumption: same-name non-Dong conflicts should be manually resolved by the user rather than overwritten.

## Risks
- Old projects must be updated; otherwise they may not have the project-level skill marker or latest hooks.
- If a user has a personal skill with the same name and clear Dong-origin text in its `SKILL.md`, it could be treated as old Dong-managed; current tests cover ordinary non-Dong same-name text.
- Real Codex UI hook trust behavior was not manually rechecked after this batch, though CLI/release checks pass.

## Verification Evidence
- `node --test tests\project-ops.test.mjs`: pass, 51/51 tests.
- `node scripts\project-ops-health.mjs .`: pass.
- `git diff --check`: pass.
- `node scripts\release-check.mjs .`: pass, including final pre-commit run after state refresh.

## Git Checkpoint
- Latest commit: `1239bc2 feat(skills): add simplicity review governance`
- Push state: current changes are not committed or pushed yet.
- Files included: pending.
- Files intentionally left uncommitted: current verified Dong Skills update batch until checkpoint command runs.
- Deferred reason: state refresh and Stop hook still need to run after latest edits.
- Next checkpoint: commit subject `feat(skills): split global and project installs`.

## Learned Instincts To Preserve
- Project activation should be explicit; global skill visibility alone is not enough.
- Preserve durable investigation findings as working notes, not hidden reasoning.
- Use manifest/marker checks for cleanup; same-name conflicts require refusal or explicit user decision.

## Next Action
Run Stop hook if needed, then commit and push this batch.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/spec.md`
4. `.codex-context/plan-progress.md`
5. `.codex-context/artifact-index.md`
6. `.codex-context/verification.md`
7. `scripts/install-windows.ps1`
8. `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
9. `tests/project-ops.test.mjs`
