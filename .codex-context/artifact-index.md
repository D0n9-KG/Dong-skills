# Artifact Index

## Created
- None.

## Modified
- `.agents/skills/brainstorming/SKILL.md`: separates final discussion approval from written-spec approval and fixes the approval status flow.
- `.agents/skills/writing-plans/SKILL.md`: requires execution mode choice, Goal objective draft, runtime constraints, checkpoint cadence, and written-spec approval before planning.
- `.agents/skills/executing-plans/SKILL.md`: adds Traditional task-by-task execution and explicit Codex Goal mode governance, including objective requirements and stop conditions.
- `.agents/skills/using-superpowers/SKILL.md`: routes through written spec approval and execution mode approval; prevents vague "continue" from selecting Goal mode.
- `.agents/skills/codex-project-governance/SKILL.md`: updates lifecycle gates for written spec approval and execution mode approval.
- `.codex/scripts/lib/templates.mjs`: adds execution-mode sections to `plan-progress.md` template and clarifies spec approval status values.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`: synchronized bootstrap template copy.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/spec.md`: synchronized bootstrap seed spec approval wording.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/plan-progress.md`: synchronized bootstrap seed execution-mode sections.
- `scripts/project-ops-health.mjs`: requires plan-progress execution-mode sections.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: synchronized bootstrap helper copy.
- `AGENTS.md`, `AGENTS.project-ops.snippet.md`, `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`: updated project-level phase gates.
- `README.md`: updated bilingual workflow description for written spec and execution mode gates.
- `tests/project-ops.test.mjs`: regression coverage for written-spec gate, execution mode planning, Goal mode constraints, bootstrap sections, and health-check schema.
- `docs/improvements/backlog.md`: records the workflow gate and Goal mode governance hardening item.
- `.codex-context/current-state.md`, `.codex-context/spec.md`, `.codex-context/plan-progress.md`, `.codex-context/artifact-index.md`, `.codex-context/verification.md`, `.codex-context/decisions.md`, `.codex-context/risks.md`, `.codex-context/handoff-summary.md`: refreshed state for this task.

## Read / Inspected
- Upstream Superpowers `brainstorming`, `writing-plans`, and `executing-plans` behavior was checked for reusable gates.
- `.agents/skills/codex-git-checkpoint/SKILL.md`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- Existing `.codex-context/` state files.

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- Goal mode support is instruction/state based; no dedicated hook enforcement was added.
- Existing projects need a Dong Skills update/bootstrap before their local templates and AGENTS snippets contain the new execution-mode sections.
