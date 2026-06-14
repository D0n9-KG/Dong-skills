# Artifact Index

## Created
- None.

## Modified
- `.codex/scripts/lib/core.mjs`: replaces missing-file `Date.now()` freshness with nearest existing ancestor mtime.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/core.mjs`: synchronized bootstrap runtime copy.
- `.codex/hooks/project-ops.mjs`: makes `session-history` parse explicit project roots like other CLI modes.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: synchronized bootstrap hook copy.
- `.agents/skills/systematic-debugging/SKILL.md`: removes shell-escaped apostrophe artifact.
- `.agents/skills/codex-evidence-capture/SKILL.md`: clarifies direct CLI/API/product use can be product evidence while test framework output is not a demo.
- `.agents/skills/writing-plans/SKILL.md`: requires a real current-session Codex goal mechanism before Goal mode can be selected.
- `.agents/skills/executing-plans/SKILL.md`: defines Goal mode as creating a real Codex goal and forbids simulating it with headings only.
- `.agents/skills/using-superpowers/SKILL.md`: routes Goal mode only when an actual goal mechanism is exposed.
- `.codex/scripts/lib/templates.mjs`: adds `Spec Approval` to generated plan-progress templates and clarifies Goal mode mechanism requirements.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`: synchronized bootstrap template copy.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/plan-progress.md`: synchronized seed plan-progress copy.
- `README.md`: states Dong Skills is currently a Codex-only kit and Claude Code compatibility would need a separate adapter.
- `tests/project-ops.test.mjs`: adds regression coverage for deleted-file freshness, `session-history` root parsing, Goal mode mechanism wording, evidence wording, and bootstrap template text.
- `docs/improvements/backlog.md`: records this review-driven runtime/workflow hardening item.
- `.codex-context/current-state.md`, `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/decisions.md`, `.codex-context/risks.md`, `.codex-context/verification.md`, `.codex-context/handoff-summary.md`: refreshed state for this task.
- Final state refresh: `verification.md` and `handoff-summary.md` record the final release check after state updates; `current-state.md` now points to checkpoint as the next action.

## Read / Inspected
- External review attachment supplied by the user.
- `tests/project-ops.test.mjs`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/git.mjs`
- `.codex/scripts/lib/templates.mjs`
- `.agents/skills/*/SKILL.md` files relevant to the accepted review findings.
- README and project state files.

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- Global installed skills were refreshed; existing target projects still need project-local refresh/bootstrap to receive these fixes.
- Claude Code compatibility remains out of scope for this Codex-only release line.
- Top-level legal license choice remains deferred to the repo owner.
