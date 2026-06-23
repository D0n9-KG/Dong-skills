# Artifact Index

## Created
- `dong-skills.manifest.json`: source manifest for global bootstrap skills and project-level workflow skills.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/dong-skills.manifest.json`: bootstrap asset copy of the manifest.
- `.codex-context/working-notes.md`: active recovery file for compact externalized investigation findings.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/working-notes.md`: project bootstrap template for working notes.

## Modified
- `.agents/skills/brainstorming/SKILL.md`: added truth hierarchy, work-lane guidance, and What-not-How spec discipline.
- `.agents/skills/writing-plans/SKILL.md`: added work-lane guidance and runtime/checkpoint constraints.
- `.agents/skills/executing-plans/SKILL.md`: added lane-aware execution depth requirements.
- `.agents/skills/using-superpowers/SKILL.md`: routes by the lowest sufficient work lane and truth hierarchy.
- `.agents/skills/codex-project-governance/SKILL.md`: records the truth hierarchy, lane model, and spec current-task scope.
- `scripts/install-windows.ps1`: split install model; global bootstrap/router only; writes `.dong-skills-source.json`; installs full project-level skills to target `.agents/skills`; removes only identifiable Dong-managed old global heavy skills; preserves same-name non-Dong skills.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: installs full project-level skills from the source checkout; writes `.agents/skills/.dong-skills-project.json`; refuses same-name non-Dong project skill overwrite; preserves project-local non-Dong skills.
- `.codex/scripts/lib/events.mjs`: status text now prefers non-governance latest files, and Stop/PreCompact freshness stays lane-aware.
- `.codex/scripts/lib/git.mjs`: untracked directories are expanded with `--untracked-files=all` so code files inside fresh folders are not hidden.
- `.codex/scripts/lib/recovery.mjs`: SessionStart recovery includes decisions, open questions, and working notes.
- `.codex/scripts/lib/templates.mjs`: creates required `working-notes.md` template.
- `scripts/project-ops-health.mjs`: validates required spec/plan sections and bootstrap parity.
- `scripts/release-check.mjs`: scans for runtime marker artifacts and readability/privacy issues.
- `README.md`: rewritten in Chinese/English around the Codex-only split install model and lifecycle.
- `AGENTS.md` and `AGENTS.project-ops.snippet.md`: recovery order and project ops guidance updated.
- `.gitignore`: ignores `.codex-context/discussion-state.json`.
- `tests/project-ops.test.mjs`: adds/updates coverage for truth hierarchy, work lanes, freshness gating, hook diagnostics, split install, recovery, health, and release.
- `.codex-context/spec.md`, `plan-progress.md`, `current-state.md`, `artifact-index.md`, `verification.md`, `handoff-summary.md`: refreshed for the current Dong Skills optimization batch.
- Bootstrap mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized hooks, hook libraries, helper scripts, AGENTS snippet, and templates.

## Read / Inspected
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `tests/project-ops.test.mjs`
- `README.md`
- `.agents/skills/brainstorming/SKILL.md`
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex-context/*`

## Raw Outputs
- No raw outputs added.
- `.codex-context/discussion-state.json` remains runtime-only and ignored.

## Residual Watchpoints
- Existing projects must run/update project bootstrap to receive `.agents/skills/.dong-skills-project.json` and the new project-local skills.
- Same-name non-Dong project skills intentionally block bootstrap; user must rename or approve manual resolution.
- `working-notes.md` should stay compact; promote durable conclusions into spec/decisions/current-state/handoff/solution docs.
