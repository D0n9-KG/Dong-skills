# Artifact Index

## Created
- `.agents/skills/codex-simplicity-review/SKILL.md`: new anti-overengineering review skill adapted from Ponytail ideas for Dong Skills.
- `licenses/PONYTAIL-LICENSE`: MIT license text for the adapted Ponytail ideas.

## Modified
- `.agents/skills/writing-plans/SKILL.md`: adds the three-rung Simplicity Gate for planning: avoid building, standard library, native platform; explicitly excludes mandatory one-line/minimum-implementation rungs.
- `.agents/skills/executing-plans/SKILL.md`: requires the Simplicity Gate before adding code/dependencies/abstractions/assets and introduces `dong-debt:` markers for accepted simplifications with ceilings.
- `.agents/skills/codex-review-panel/SKILL.md`: adds a Simplicity lens and plan-review check.
- `.agents/skills/using-superpowers/SKILL.md`: routes overbuilt diffs/plans and deletion/simplification requests to `codex-simplicity-review`.
- `.agents/skills/codex-project-governance/SKILL.md`: adds `codex-simplicity-review` to the lifecycle and documents hook status output.
- `.agents/skills/codex-asset-governance/SKILL.md`: documents `dong-debt:` marker lifecycle and review path.
- `AGENTS.md` and `AGENTS.project-ops.snippet.md`: add curated `codex-simplicity-review`, Simplicity Gate guidance, and `dong-debt:` convention for bootstrapped projects.
- `README.md`: adds Ponytail as a credited inspiration source and describes `codex-simplicity-review` in the English workflow.
- `.codex/scripts/lib/assets.mjs`: scans code files for `dong-debt:` markers, reports missing `revisit when` triggers, and surfaces marker counts in asset-governance reports.
- `.codex/scripts/lib/events.mjs`: adds compact hook status output for PostToolUse, PreCompact, and Stop; PostToolUse uses a lightweight path to avoid full asset scans on every edit.
- `.codex/scripts/lib/recovery.mjs`: injects hook status into SessionStart recovery context.
- `.codex/scripts/lib/workflow.mjs` and `scripts/project-ops-health.mjs`: allow `codex-simplicity-review` as a valid workflow `next_skill`.
- Bootstrap asset mirrors under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized runtime libraries, health script, and AGENTS snippet.
- `tests/project-ops.test.mjs`: adds regressions for Simplicity Gate skill content, `codex-simplicity-review` workflow-state acceptance, hook status output, and `dong-debt:` asset-governance scanning.
- `.codex-context/current-state.md`, `plan-progress.md`, `artifact-index.md`, `verification.md`, `risks.md`, `decisions.md`, `workflow-state.yaml`, and `handoff-summary.md`: refreshed for this patch.
- Global install target `%USERPROFILE%\.agents\skills`: updated by `scripts/install-windows.ps1`; this is runtime state outside the repo, not a committed artifact.

## Read / Inspected
- Ponytail upstream clone under `%TEMP%\ponytail-inspect`: README, skills, commands, hooks, tests, and license.
- Existing Dong Skills workflow/review/asset/hook files listed above.
- `codex-project-governance`, `writing-plans`, `executing-plans`, `codex-review-panel`, and `codex-simplicity-review` skill instructions.
- `.codex-context/plan-progress.md`, `current-state.md`, `artifact-index.md`, `verification.md`, `risks.md`, `decisions.md`, and `handoff-summary.md`.

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- Existing target projects need a local Dong Skills refresh/bootstrap to receive `codex-simplicity-review`, the new AGENTS guidance, and the updated hook runtime.
- Hook status output should stay compact. Avoid adding heavyweight scans to high-frequency hooks such as PostToolUse.
- `dong-debt:` markers are lifecycle signals, not project instincts or solution memory.
