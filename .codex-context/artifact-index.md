# Artifact Index

## Created
- `dong-skills.manifest.json`: source manifest for global bootstrap skills and project-level workflow skills.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/dong-skills.manifest.json`: bootstrap asset copy of the manifest.
- `.codex-context/working-notes.md`: active recovery file for compact externalized investigation findings.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/working-notes.md`: project bootstrap template for working notes.

## Modified
- `scripts/install-windows.ps1`: split install model; global bootstrap/router only; writes `.dong-skills-source.json`; installs full project-level skills to target `.agents/skills`; removes only identifiable Dong-managed old global heavy skills; preserves same-name non-Dong skills.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: installs full project-level skills from the source checkout; writes `.agents/skills/.dong-skills-project.json`; refuses same-name non-Dong project skill overwrite; preserves project-local non-Dong skills.
- `.agents/skills/using-superpowers/SKILL.md`: requires project-level marker before routing to full workflow skills.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: documents bootstrap gate, project-level full skills, and non-Dong preservation.
- `.agents/skills/brainstorming/SKILL.md`: preserves upstream continuation loop, Living Spec mode, final written-spec gate, and working-notes behavior.
- `.agents/skills/codex-project-governance/SKILL.md`: documents workflow-state, phase gates, working-notes, discussion marker, and project-level lifecycle.
- `.agents/skills/codex-docs-stewardship/SKILL.md` and `.agents/skills/codex-asset-governance/SKILL.md`: include working-notes/runtime marker asset lifecycle.
- `.codex/scripts/lib/events.mjs`: discussion/investigation dirty markers, Stop freshness checks, PreCompact emergency handoff/raw snapshot behavior.
- `.codex/scripts/lib/recovery.mjs`: SessionStart recovery includes decisions, open questions, and working notes.
- `.codex/scripts/lib/templates.mjs`: creates required `working-notes.md` template.
- `.codex/hooks/project-ops.mjs` and `.codex/hooks.json`: PostToolUse input forwarding and broader exploration matcher coverage.
- Bootstrap mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized hooks, hook libraries, helper scripts, AGENTS snippet, and templates.
- `scripts/project-ops-health.mjs`: validates project-level marker, required project skills, working-notes sections, runtime ignore rules, and manifest/bootstrap asset parity.
- `scripts/release-check.mjs`: scans for runtime marker artifacts and readability/privacy issues.
- `README.md`: rewritten in Chinese/English around the Codex-only split install model and lifecycle.
- `AGENTS.md` and `AGENTS.project-ops.snippet.md`: recovery order and project ops guidance updated.
- `.gitignore`: ignores `.codex-context/discussion-state.json`.
- `tests/project-ops.test.mjs`: adds/updates coverage for split install, non-Dong preservation, discussion/working-notes hooks, PreCompact, recovery, health, release, and workflow gates.
- `.codex-context/*.md` and `.codex-context/workflow-state.yaml`: refreshed for current delivery state.

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
