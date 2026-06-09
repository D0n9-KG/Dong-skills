# Handoff Summary

## Objective
Publish Dong Skills as a Codex project-operations kit where skills are globally available and hooks are project-level.

## Latest User Instruction
Continue the release after changing the design so new projects start through `codex-codebase-onboarding`; remove global hooks and keep project hooks.

## Approved Scope / Spec
Onboarding skill bootstraps missing project governance files, then continues codebase onboarding. The public release should not include private runtime data.

## Plan Status
Implementation, release verification, zip regeneration, commit, and push are complete.

## Files Modified
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/`
- `scripts/install-windows.ps1`
- `README.md`
- `.codex-context/*.md`

## Files Read But Not Changed
- Existing skill guidance and installer behavior were inspected before release verification.

## Decisions Made
Use global skills plus project-level hooks. Do not ship or install a global hook dispatcher.

## Open Questions And Assumptions
No open questions. Assumption: after a fresh bootstrap, Codex may need a restart or new thread before `/hooks` shows the new project hooks.

## Risks
Release must be scanned for private data. PreCompact hooks are useful but not an absolute guarantee against every automatic compaction edge case.

## Verification Evidence
JavaScript syntax checks, PowerShell parse checks, release file listing, personal-path scan, exact credential scan, reviewed broad security-word scan, installed-skill/global-hook check, obsolete global-hook artifact scan, temporary-project bootstrap smoke test, README content check, diff whitespace check, runtime-artifact scan, and final zip inspection passed on 2026-06-09.

## Learned Instincts To Preserve
Project learning should be curated through `codex-learning-memory`; raw observations are not active memory and should not be published.

## Next Action
Use `codex-codebase-onboarding` as the startup skill in the next target project; restart Codex or open a new thread after bootstrap so `/hooks` can show and trust project hooks.

## Files To Re-read First
- `.codex-context/current-state.md`
- `.codex-context/spec.md`
- `.codex-context/plan-progress.md`
- `.codex-context/artifact-index.md`
- `README.md`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
