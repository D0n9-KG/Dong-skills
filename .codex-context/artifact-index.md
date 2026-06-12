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
- `.agents/skills/brainstorming/SKILL.md`: tightened lightweight hard gate requiring explicit design/spec approval before implementation, with compact exceptions for tiny mechanical edits.
- `.agents/skills/writing-plans/SKILL.md`: requires approved spec or explicit skip, writes execution approval state, and pauses for execution choice unless plan-then-execute was requested.
- `.agents/skills/using-superpowers/SKILL.md`: routes non-trivial work through scope, plan, execution, verification, review, and checkpoint phases.
- `.agents/skills/codex-project-governance/SKILL.md`: adds explicit scope, approval, plan, and execution gates to the main lifecycle.
- `.agents/skills/executing-plans/SKILL.md`: now requires `## Execution Approval` in `plan-progress.md` before executing a written plan.
- `.agents/skills/verification-before-completion/SKILL.md`: rewritten as concise Dong Skills evidence-before-assertions gate with `.codex-context/verification.md` record requirements.
- `.agents/skills/systematic-debugging/SKILL.md`: adds state recording, stop conditions, and removes mojibake from inherited text.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: adds onboarding state update requirements.
- `.agents/skills/codex-context-budget/SKILL.md`: prevents token-budget cleanup from weakening phase, verification, privacy, or destructive-operation gates.
- `.agents/skills/codex-evidence-capture/SKILL.md`: feeds blocked product-evidence gaps into risks or plan progress.
- `.agents/skills/codex-review-panel/SKILL.md` and `.agents/skills/requesting-code-review/SKILL.md`: add review-result state updates and stop scope expansion during review cleanup.
- `.agents/skills/codex-solution-memory/SKILL.md`: adds state updates after solution memory changes.
- `.agents/skills/codex-strategy-anchor/SKILL.md`: adds strategy gate and state updates for major direction decisions.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/spec.md`: adds `Approval Status`, `Design`, and `Next Step` fields.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/plan-progress.md`: adds `Spec Approval`, `Execution Approval`, and `Verification` fields.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md` and root `AGENTS.project-ops.snippet.md`: document lightweight phase gates.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: uses explicit UTF-8 read/write helpers and trims the snippet before managed block comparison for idempotent bootstrap.
- `README.md`: documents non-trivial work phase gates in Chinese and English.
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
