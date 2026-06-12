# Artifact Index

## Created
- `docs/improvements/backlog.md`: Dong Skills meta-learning backlog for hook, skill, installer, bootstrap, README, and governance improvement candidates. This is intentionally separate from project instincts and solution memory.

## Modified
- `.codex/scripts/lib/events.mjs`: automatic `PreCompact` now prepends a `PreCompact Emergency Notice`, preserves meaningful existing handoff content below it, writes a raw backup snapshot, and only falls back to emergency sections when no useful handoff exists.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`: bootstrap copy of the same `PreCompact` behavior.
- `.codex/scripts/lib/recovery.mjs`: `SessionStart` recovery excerpts now prioritize `PreCompact Emergency Notice` and `PreCompact Issues`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`: bootstrap recovery copy kept in sync.
- `tests/project-ops.test.mjs`: added regression coverage that automatic `PreCompact` preserves an existing handoff below the emergency notice.
- `.agents/skills/codex-learning-memory/SKILL.md`: tightened capture criteria to future-useful reusable patterns and added explicit Dong Skills meta-learning routing.
- `.agents/skills/codex-solution-memory/SKILL.md`: excludes Dong Skills improvement proposals from solution memory.
- `.agents/skills/codex-project-governance/SKILL.md`: routes Dong Skills self-improvement signals to `docs/improvements/backlog.md`.
- `AGENTS.project-ops.snippet.md` and onboarding asset copy: document automatic `PreCompact` preservation and the memory/backlog boundary for target projects.
- `README.md`: documents `docs/improvements/backlog.md`, the memory-store boundary, and the automatic `PreCompact` preservation behavior.
- `scripts/release-check.mjs` and onboarding asset copy: exclude `.codegraph/` from release scans because it is local indexing state.
- `.gitignore`: ignores local `.codegraph/` index data.
- `.codex-context/plan-progress.md`, `current-state.md`, `artifact-index.md`, `verification.md`, and `handoff-summary.md`: refreshed for this Dong Skills memory and `PreCompact` optimization task.

## Read / Inspected
- Hook runtime `events.mjs` and `recovery.mjs`.
- Learning, solution memory, and project governance skill instructions.
- Project AGENTS snippet, README release/privacy guidance, release check script, and regression tests.
- User screenshot of hook feedback showing orange PostToolUse/Stop messages; treated as governance feedback/blocking output rather than script crash.

## Raw Outputs
- Verification outputs are summarized in `verification.md`.
