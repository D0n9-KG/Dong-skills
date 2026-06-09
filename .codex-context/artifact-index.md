# Artifact Index

## Created
- `.codex/scripts/lib/*.mjs`: split project hook runtime modules.
- `scripts/state-prune.mjs`: archives older verification history.
- `.agents/skills/codex-architecture-governance/SKILL.md`: architecture governance workflow.
- `.agents/skills/codex-architecture-governance/scripts/architecture-scan.mjs`: large-file/flat-directory scan.
- `.agents/skills/codex-docs-stewardship/SKILL.md`: documentation and state-file stewardship workflow.
- `.agents/skills/codex-docs-stewardship/scripts/docs-scan.mjs`: docs/state scan.
- `.agents/skills/systematic-debugging/references/debugging-workflow.md`: detailed debugging checklist.
- `.agents/skills/systematic-debugging/references/root-cause-patterns.md`: failure pattern probes.
- `.codex-context/archive/verification-2026-06-09.md`: archived older verification history.
- Onboarding asset copies for split hook lib, archive `.gitkeep`, and `state-prune.mjs`.

## Modified
- `.codex/hooks/project-ops.mjs`: reduced to hook/CLI dispatcher and added `state-prune` proxy.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: synced hook asset.
- `scripts/install-windows.ps1` and onboarding `bootstrap-project-ops.ps1`: copy split lib and `state-prune.mjs`.
- `scripts/project-ops-health.mjs`: checks split lib presence, helper scripts, and asset parity only when asset tree exists.
- `scripts/context-budget.mjs` and `.codex/scripts/lib/budget.mjs`: include `.codex/scripts` runtime code but exclude `.codex-context/raw/` and `.codex-context/archive/` from active budget.
- `tests/project-ops.test.mjs`: expanded regression coverage to 7 tests.
- `.agents/skills/systematic-debugging/SKILL.md`: slimmed main skill body.
- `.agents/skills/codex-project-governance/SKILL.md`, `using-superpowers/SKILL.md`, `codex-context-budget/SKILL.md`, and `codex-codebase-onboarding/SKILL.md`: updated routing and operational guidance.
- `AGENTS.project-ops.snippet.md` and onboarding asset snippet: added architecture/docs governance and archive guidance.
- `README.md`: updated bilingual feature list, install notes, commands, and skill table.
- `.codex-context/*.md`: refreshed state, project map, plan, verification, risks, and handoff.

## Read / Inspected
- Existing hook, install/bootstrap scripts, release/health scripts, tests, README, AGENTS snippet, skill docs, and state files.
- External source pages for Claude Skills, Superpowers, architecture-review, architecture skill patterns, and docs cleanup patterns.

## Raw Outputs
- Command outputs are summarized in `verification.md`; runtime observations remain uncommitted under `.codex-context/raw/` if ever generated.
