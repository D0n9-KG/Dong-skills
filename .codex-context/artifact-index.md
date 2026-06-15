# Artifact Index

## Created
- `.codex/scripts/lib/workflow.mjs`: workflow-state runtime library.
- `scripts/workflow-state.mjs`: CLI wrapper for workflow state commands.
- `.codex-context/workflow-state.yaml`: current repo workflow state.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/workflow.mjs`: bootstrap runtime copy.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/workflow-state.mjs`: bootstrap CLI copy.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/workflow-state.yaml`: new project workflow-state seed.
- `licenses/COMET-LICENSE`: MIT license attribution for Comet inspiration.

## Modified
- `.codex/hooks/project-ops.mjs`: forwards `workflow-state` CLI commands.
- `.codex/scripts/lib/templates.mjs`: adds workflow state required file and template.
- `.codex/scripts/lib/events.mjs`: reports malformed workflow state in Stop/PreCompact.
- `.codex/scripts/lib/recovery.mjs`: injects workflow recovery and updated recovery order.
- `.codex/scripts/lib/assets.mjs`: includes workflow state in active state file lifecycle.
- `scripts/project-ops-health.mjs`: validates workflow-state schema and helper script presence.
- `scripts/install-windows.ps1`: copies `workflow-state.mjs` to project `.codex/scripts`.
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: copies `workflow-state.mjs`.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: adds workflow-state bootstrap/update guidance.
- `.agents/skills/using-superpowers/SKILL.md`: adds workflow state gate and decision-point protocol.
- `.agents/skills/codex-project-governance/SKILL.md`: adds workflow-state lifecycle integration.
- `.agents/skills/brainstorming/SKILL.md`: records `spec-living`, `spec-ready`, and `spec-approved` transitions.
- `.agents/skills/writing-plans/SKILL.md`: records `plan-ready` and execution approval transitions.
- `.agents/skills/executing-plans/SKILL.md`: checks execution phase and transitions to verification.
- `.agents/skills/codex-verification-loop/SKILL.md`: records verification result transitions.
- `.agents/skills/verification-before-completion/SKILL.md`: re-reads workflow state before completion claims.
- `.agents/skills/codex-review-panel/SKILL.md`: records review-complete/skipped transitions.
- `.agents/skills/codex-git-checkpoint/SKILL.md`: records checkpoint-done/deferred transitions.
- `AGENTS.md` and `AGENTS.project-ops.snippet.md`: include workflow state and recovery order.
- Bootstrap asset copies under `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: synchronized runtime/docs/scripts.
- `README.md`: documents Comet inspiration and workflow-state commands.
- `docs/improvements/backlog.md`: records the Comet-inspired workflow-state item.
- `tests/project-ops.test.mjs`: adds workflow state regression coverage.
- `.codex-context/spec.md`, `current-state.md`, `plan-progress.md`, `artifact-index.md`, `verification.md`, `decisions.md`, `risks.md`, and `handoff-summary.md`: refreshed for this task.
- Final state refresh and push verification now record the completed checkpoint in `current-state.md`, `plan-progress.md`, `verification.md`, and `handoff-summary.md`.

## Read / Inspected
- Local Comet clone under `%TEMP%\comet-inspect`: `comet/SKILL.md`, `comet-state.sh`, decision-point protocol, phase guard rules.
- Existing Dong Skills hook/runtime/templates/tests/skills relevant to routing and recovery.

## Raw Outputs
- No raw outputs added.

## Residual Watchpoints
- Existing target projects need project-local refresh/bootstrap to receive `workflow-state.yaml` and new scripts.
- Future use may reveal additional transition events, but current commands cover the main Dong Skills phases.
