# Artifact Index

## Created
- `.codex-context/instincts/project/precompact-auto-writes-emergency-handoff.md`: project instinct preventing future automatic PreCompact hard-block regressions.
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
- `.codex/scripts/lib/events.mjs`: `postCompact` now emits only common hook output `{ continue: true }`; `PreCompact` auto no longer includes event-specific `hookSpecificOutput`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`: synced the hook-output schema repair into bootstrap assets.
- `tests/project-ops.test.mjs`: added regression coverage for common-only `PostCompact` output and `PreCompact` auto without `hookSpecificOutput`.
- `README.md`: clarified that recovery context is injected by `SessionStart` with compact start source, while `PostCompact` only confirms completion.
- `.agents/skills/codex-project-governance/SKILL.md`: updated hook summary to avoid telling agents that `PostCompact` injects recovery context.
- `.codex/scripts/lib/events.mjs`: `preCompact` now detects manual vs automatic triggers; automatic or unknown triggers write an emergency handoff and return `continue: true`, while explicit manual triggers still hard-block stale state.
- `.codex/hooks/project-ops.mjs`: passes raw hook input into `preCompact`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`: synced the automatic PreCompact fallback into bootstrap assets.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: synced the input-passing hook entrypoint into bootstrap assets.
- `tests/project-ops.test.mjs`: added explicit manual PreCompact block coverage and automatic PreCompact emergency handoff coverage.
- `README.md`: documents that automatic PreCompact writes an emergency handoff and allows compaction instead of hard-blocking.
- `AGENTS.project-ops.snippet.md` and onboarding asset snippet: updated compaction governance language for manual vs automatic behavior.
- `.agents/skills/codex-project-governance/SKILL.md`: updated hook summary to reflect automatic PreCompact fallback behavior.
- `.codex-context/learned-instincts.md`: indexed the new automatic PreCompact fallback instinct.
- `.codex/hooks.json`: changed Windows hook commands to `-EncodedCommand` so outer PowerShell cannot expand `$root` / `$null` before the hook runs.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`: synced the fixed Windows hook commands for newly bootstrapped or repaired projects.
- `scripts/project-ops-health.mjs`: decodes Windows `-EncodedCommand`, verifies it invokes `project-ops.mjs`, and rejects unsafe inline command patterns.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: synced the stricter health check into bootstrap assets.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: requires a health check even when bootstrap gate files already exist, and reruns bootstrap once if stale config is detected.
- `tests/project-ops.test.mjs`: added regression coverage for encoded Windows hook commands, outer PowerShell invocation, and bad encoded-command detection.
- `.codex-context/instincts/project/windows-hooks-use-encoded-command.md`: records the project instinct for future hook edits.
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
- Science Evo project hook config and runtime under its project-local `.codex/` directory.
- Official Codex manual hook section confirming `PostCompact` and `PreCompact` are turn-scope hooks and use `manual|auto` matcher values.
- Official Codex manual hook sections in the local OpenAI docs cache, including default hooks, project trust, `commandWindows`, and `PreCompact` matcher values.
- Local Codex app-server hook schema files under `%TEMP%\codex-schema-ts` for hook run status/output summary fields.
- Existing hook, install/bootstrap scripts, release/health scripts, tests, README, AGENTS snippet, skill docs, and state files.
- CE source at temporary clone commit `b625049`: `ce-compound`, `ce-compound-refresh`, `ce-code-review`, `ce-doc-review`, `ce-sessions`, `ce-strategy`, `ce-demo-reel`, plugin README, and related references.
- Recovery constraints across AGENTS snippet, project governance skill, hook recovery module, onboarding asset tree, health/release scripts, docs scan, architecture scan, solution status, and learning status.

## Raw Outputs
- Command outputs are summarized in `verification.md`; runtime observations remain uncommitted under `.codex-context/raw/` if ever generated.
