# Artifact Index

## Created
- None. This patch hardens existing Dong Skills runtime, installer, release checks, and tests.

## Modified
- `.codex/hooks/project-ops.mjs`: fixes CLI root/subcommand parsing for `workflow-state next/recover/transition`, supports no-root `session-history scan`, avoids hook-time context auto-creation, and keeps `learning-status` from hiding pending observations.
- `.codex/scripts/lib/workflow.mjs`: makes non-init workflow-state reads strict, reports missing state without recreating it, expands valid `next_skill` values, and makes recovery output safe when state is missing.
- `.codex/scripts/lib/learning.mjs`: expands raw-observation redaction for local Windows user paths, email, phone-like values, Anthropic/GitLab/npm/Google/Stripe/Hugging Face tokens, and preserves URL host/path while redacting credentials/query.
- `.codex/hooks.json`: expands `PostToolUse` matcher to include shell/Bash/PowerShell-style tools so shell file writes still trigger artifact freshness checks.
- `scripts/install-windows.ps1`: uses explicit UTF-8 strict/no-BOM helpers, preserves existing Chinese `AGENTS.md`, writes hooks/config via UTF-8, and replaces global skill directories through staging/backup instead of delete-then-copy.
- `scripts/project-ops-health.mjs`: validates all workflow-state enum fields instead of only checking presence.
- `scripts/release-check.mjs`: resolves helper scripts from both `scripts/` and `.codex/scripts/`, scans `tests/` for secrets, adds broader secret/PII patterns, adds an oversized text-file gate, and keeps fixture allow markers explicit.
- `AGENTS.project-ops.snippet.md`: tells agents to run `workflow-state recover` when resume/compaction state is ambiguous.
- Bootstrap asset mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized copies of changed hooks, runtime libraries, scripts, hooks.json, and AGENTS snippet for new/updated projects.
- `tests/project-ops.test.mjs`: adds regressions for no-root workflow commands, missing workflow-state behavior, installer UTF-8 preservation, shell matcher coverage, project-level release-check resolution, release privacy scan over tests, oversized docs, stricter health validation, and expanded learning redaction.
- `.codex-context/current-state.md`, `plan-progress.md`, `artifact-index.md`, `verification.md`, `workflow-state.yaml`, and `handoff-summary.md`: refreshed for this hardening patch.

## Read / Inspected
- `.codex-context/spec.md`, `plan-progress.md`, `current-state.md`, and `workflow-state.yaml`: recovered approved scope and execution mode.
- `.codex/hooks/project-ops.mjs`, `.codex/scripts/lib/{workflow,events,learning}.mjs`, `scripts/{install-windows,project-ops-health,release-check}.mjs`, `.codex/hooks.json`, bootstrap assets, and `tests/project-ops.test.mjs`: implementation and regression surfaces.
- `codex-project-governance`, `executing-plans`, `codex-review-panel`, and `codex-git-checkpoint` skills: phase, review, and checkpoint requirements.

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- Existing target projects need a project-local Dong Skills refresh/bootstrap to receive these runtime and hook fixes.
- Release privacy phone detection is intentionally conservative in release-check to avoid date/time false positives; learning redaction remains broader.
