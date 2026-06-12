# Dong Skills Asset Governance Implementation Plan

**Goal:** Add first-class asset lifecycle governance so Dong Skills can audit and prune state files, raw snapshots, archives, docs, scripts, hooks, tests, generated evidence, and code assets.
**Spec:** `.codex-context/spec.md`
**Spec Approval:** Approved by user on 2026-06-12.
**Current Step:** Final checkpoint.
**Verification:** `asset-governance`, `health-check`, `node --test tests\project-ops.test.mjs`, `node scripts\release-check.mjs .`, `git diff --check`.
**Execution Approval:** User said to optimize it directly.

## Tasks

- [x] Task 1: Add asset governance workflow skill.
  - Files: `.agents/skills/codex-asset-governance/SKILL.md`, routing skills, README, AGENTS snippets, onboarding asset snippet.
  - Result: skill defines Keep/Update/Consolidate/Replace/Delete/Stale/Raw-Prune classification, raw lifecycle rules, and routing from project governance, using-superpowers, docs stewardship, and context budget.
  - Evidence: release check and README/skill diff review passed.

- [x] Task 2: Add deterministic asset governance audit/prune script.
  - Files: `.codex/scripts/lib/assets.mjs`, `scripts/asset-governance.mjs`, onboarding asset copies, `.codex/hooks/project-ops.mjs`.
  - Result: dry-run reports state bloat, stale review candidates, raw snapshot retention, runtime artifacts, tracked raw/runtime artifacts, and suggested actions. `--apply` only prunes generated `precompact-auto-*.md` snapshots.
  - Evidence: `node .codex/hooks/project-ops.mjs asset-governance` passed with no blocking issues or advisories.

- [x] Task 3: Wire hooks, bootstrap, install, health, release, and tests.
  - Files: `.codex/scripts/lib/events.mjs`, install/bootstrap PowerShell scripts, `scripts/project-ops-health.mjs`, tests, onboarding assets.
  - Result: `PreCompact` and `Stop` include severe asset governance issues; bootstrap/install copy the asset governance script to target projects; source-kit self-install removes generated duplicate helper scripts; health check enforces parity.
  - Evidence: `node --test tests\project-ops.test.mjs` passed 19/19; `node scripts\release-check.mjs .` passed.

- [x] Task 4: Reconcile current Dong Skills state/docs.
  - Files: `.codex-context/spec.md`, `project-map.md`, `decisions.md`, `risks.md`, `learned-instincts.md`, `artifact-index.md`, `verification.md`, `handoff-summary.md`, archive files.
  - Result: stale prior-task state was replaced with the current asset-governance state; old verification history was archived; current verification remains compact.
  - Evidence: `asset-governance` reported no large active state files, no prunable raw snapshots, and no stale review candidates.

## Risks
- Stop hook asset bloat checks can become noisy if thresholds are too low; blocking uses high thresholds, lower-severity findings remain advisories.
- Raw pruning must never delete `observations.jsonl`; this is covered by test.
- Asset governance must orchestrate specialist skills rather than duplicate docs stewardship, architecture governance, solution memory, or context budget.

## Rollback
- If Stop becomes noisy, remove only the `Stop` call to asset status while keeping the CLI audit.
- If raw pruning misbehaves, disable `--apply` deletion and keep dry-run reporting.

## Next Step
Commit and push the verified Dong Skills asset governance update.
