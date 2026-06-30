# Artifact Index

## Created
- `.agents/skills/codex-skill-evolution/SKILL.md`: Dong Skills workflow skill for offline SkillOpt-Sleep evolution.
- `scripts/skill-evolution.mjs`: wrapper around SkillOpt-Sleep status, candidate collection, dry-run/run, staging inspection, and adoption.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/skill-evolution.mjs`: bootstrap asset copy of the wrapper.
- `docs/improvements/evolution-log.md`: adoption log for future SkillOpt-Sleep proposals.
- `licenses/SKILLOPT-LICENSE`: Microsoft SkillOpt MIT license attribution.

## Modified
- `.codex/hooks/project-ops.mjs`: routes `skill-evolution` CLI commands.
- `.codex/scripts/lib/events.mjs`: Stop freshness uses non-governance project changes as the state freshness baseline so state files do not chase each other's mtimes.
- `dong-skills.manifest.json`: includes `codex-skill-evolution` in global entry skills and project-level skills; adds `global_bootstrap_skills` to distinguish bootstrap entries from maintenance entries.
- `scripts/install-windows.ps1`: installs global entry skills, records `global_bootstrap_skills`, marks global entries with scope `global-entry`, installs the new helper script, and ignores `.skillopt-sleep/`.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: bootstraps the new helper script and ignores `.skillopt-sleep/`.
- `scripts/project-ops-health.mjs`: validates `skill-evolution.mjs`, workflow allow-list, bootstrap parity, and `.skillopt-sleep/` ignore rule.
- `scripts/release-check.mjs`: treats `.skillopt-sleep/` as a runtime artifact.
- `.gitignore`: ignores `.skillopt-sleep/`.
- `AGENTS.md` and `AGENTS.project-ops.snippet.md`: document `codex-skill-evolution` boundaries.
- `README.md`: describes SkillOpt-Sleep integration, commands, privacy rules, and source attribution.
- `.agents/skills/codex-project-governance/SKILL.md`: adds skill evolution to lifecycle and completion gates.
- `.agents/skills/using-superpowers/SKILL.md`: routes offline Dong Skills evolution to `codex-skill-evolution` even when the current project has not installed project-level Dong Skills.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: documents entry-skill install behavior and `.skillopt-sleep/` ignore behavior.
- `tests/project-ops.test.mjs`: adds regression coverage for SkillOpt-Sleep integration, global install behavior, source-repo targeting from business projects, Stop freshness, and install/health behavior.
- Bootstrap mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized manifest, hook, scripts, and AGENTS snippet.
- `.codex-context/current-state.md`, `plan-progress.md`, `verification.md`, `artifact-index.md`, `handoff-summary.md`: refreshed for this task.

## Read / Inspected
- Microsoft SkillOpt README, SkillOpt-Sleep README, Codex `skillopt-sleep` skill, and local SkillOpt-Sleep source files from a temporary inspection checkout.
- Existing Dong Skills learning, solution memory, governance, installer, bootstrap, health-check, release-check, router, and test files.

## Raw Outputs
- No raw outputs added.
- `.skillopt-sleep/` is ignored and should remain runtime/private unless sanitized artifacts are intentionally promoted.

## Residual Watchpoints
- `skillopt_sleep` is callable through the local Microsoft SkillOpt checkout, but real Codex backend runs still require explicit budget approval and reviewed task drafts.
- Generated SkillOpt task files require manual privacy review before setting `"reviewed": true`.
- Adopted SkillOpt proposals must still pass `node --test tests/project-ops.test.mjs` and `node scripts/release-check.mjs .`.

## Latest Refresh
- 2026-06-30: refreshed after changing the global-entry install scope in `scripts/install-windows.ps1`; release check and health check passed after this source change.
- 2026-06-30: refreshed after adding the Stop freshness regression test and syncing the `events.mjs` bootstrap mirror.
