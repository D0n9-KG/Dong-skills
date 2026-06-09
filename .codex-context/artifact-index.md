# Artifact Index

## Created
- `.agents/skills/codex-solution-memory/`: structured solution memory workflow and references.
- `.agents/skills/codex-review-panel/SKILL.md`: CE-inspired persona review workflow.
- `.agents/skills/codex-session-history/SKILL.md`: safe prior-session metadata workflow.
- `.agents/skills/codex-strategy-anchor/SKILL.md`: `STRATEGY.md` strategy anchor workflow.
- `.agents/skills/codex-evidence-capture/SKILL.md`: real product-use evidence workflow.
- `scripts/solutions.mjs`: validates/summarizes `docs/solutions/` and updates `solution-index.md`.
- `scripts/session-history.mjs`: scans local agent-history metadata and keyword counts without raw transcript output.
- `.codex-context/solution-index.md`: compact active index for `docs/solutions/` and `CONCEPTS.md`.
- `licenses/COMPOUND-ENGINEERING-LICENSE`: CE MIT attribution.

## Modified
- `.codex/scripts/lib/recovery.mjs`: now emits the full AGENTS recovery order, includes `solution-index.md`, keeps `STRATEGY.md` / `CONCEPTS.md` / `docs/solutions/` on-demand, and injects a compact solution-index excerpt.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`: synced bootstrap copy of the recovery changes.
- `scripts/project-ops-health.mjs`: bootstrap asset parity drift is now a health-check failure, not a warning.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: synced bootstrap copy of the health-check change.
- `.agents/skills/codex-verification-loop/SKILL.md`: tells Codex to append new verification evidence so `state-prune` keeps the newest entries.
- `.agents/skills/codex-docs-stewardship/SKILL.md`: adds the same verification-order hygiene rule.
- `tests/project-ops.test.mjs`: added regression checks for installed bootstrap hook recovery output, solution-index recovery context, and asset parity failure.
- `.codex/hooks/project-ops.mjs`: added `solution-*` and `session-history` CLI dispatch.
- `scripts/install-windows.ps1` and onboarding `bootstrap-project-ops.ps1`: copy `solutions.mjs` and `session-history.mjs`.
- `scripts/project-ops-health.mjs`: requires `solution-index.md` and checks new helper script parity.
- `.codex/scripts/lib/templates.mjs`: adds `solution-index.md` and Product Evidence verification section.
- `tests/project-ops.test.mjs`: covers bootstrap of new scripts/templates and solution validation.
- `.agents/skills/codex-project-governance/SKILL.md`, `using-superpowers/SKILL.md`, `codex-codebase-onboarding/SKILL.md`, `codex-learning-memory/SKILL.md`, `codex-docs-stewardship/SKILL.md`, `codex-verification-loop/SKILL.md`, `requesting-code-review/SKILL.md`, and `codex-context-budget/SKILL.md`: updated routing and boundaries.
- `AGENTS.project-ops.snippet.md` and onboarding asset snippet: added strategy, solution memory, session history, review panel, and evidence guidance.
- `README.md`: rewritten bilingual documentation with CE-inspired features.
- Onboarding asset tree: synced hook, templates, scripts, verification template, solution-index template, and AGENTS snippet.
- `.codex-context/*.md`: refreshed active state, project map, plan, risks, decisions, artifact index, verification, and solution index.

## Read / Inspected
- Existing hook, install/bootstrap scripts, release/health scripts, tests, README, AGENTS snippet, skill docs, and state files.
- CE source at temporary clone commit `b625049`: `ce-compound`, `ce-compound-refresh`, `ce-code-review`, `ce-doc-review`, `ce-sessions`, `ce-strategy`, `ce-demo-reel`, plugin README, and related references.
- Recovery constraints across AGENTS snippet, project governance skill, hook recovery module, onboarding asset tree, health/release scripts, docs scan, architecture scan, solution status, and learning status.

## Raw Outputs
- Command outputs are summarized in `verification.md`; runtime observations remain uncommitted under `.codex-context/raw/` if ever generated.
