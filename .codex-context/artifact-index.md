# Artifact Index

## Created
- `.agents/skills/codex-worktree-governance/SKILL.md`: lightweight detect-and-defer worktree governance skill.
- `.codex-context/worktree-state.md`: active project worktree state record.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/worktree-state.md`: bootstrap template for target projects.
- `.codex/hooks/launch-project-ops.mjs`: hook launcher that dispatches using hook input `cwd`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/launch-project-ops.mjs`: bootstrap copy of the launcher.
- `.codex/scripts/lib/worktree.mjs`: reusable hook runtime worktree detection helpers.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/worktree.mjs`: bootstrap copy of worktree helpers.

## Modified
- `.codex/hooks.json` and onboarding asset hooks config: point hook events at `launch-project-ops.mjs`.
- `.codex/scripts/lib/templates.mjs` and onboarding asset copy: require and template `worktree-state.md`.
- `.codex/scripts/lib/recovery.mjs` and onboarding asset copy: add `worktree-state.md` to recovery order and inject worktree summaries.
- `scripts/project-ops-health.mjs` and onboarding asset copy: report worktree diagnostics, require launcher, and validate `worktree-state.md` sections.
- `scripts/install-windows.ps1` and onboarding bootstrap script: copy `launch-project-ops.mjs`.
- `tests/project-ops.test.mjs`: added launcher dispatch, linked worktree diagnostics, recovery-order, bootstrap, and hook command assertions.
- `.agents/skills/using-superpowers/SKILL.md`, `codex-project-governance/SKILL.md`, `executing-plans/SKILL.md`, `codex-git-checkpoint/SKILL.md`, and `codex-codebase-onboarding/SKILL.md`: route and enforce worktree governance.
- `AGENTS.project-ops.snippet.md` and onboarding asset snippet: add `codex-worktree-governance`, `worktree-state.md`, and recovery order.
- `README.md`: documents `worktree-state.md` and Codex App detect-and-defer behavior.
- `.codex-context/spec.md`, `plan-progress.md`, `current-state.md`, `verification.md`, `handoff-summary.md`, and `worktree-state.md`: refreshed for this worktree governance task.

## Read / Inspected
- Upstream Superpowers `using-git-worktrees`, `finishing-a-development-branch`, and worktree rototill design.
- Current Dong Skills hook entrypoint, hooks config, recovery, templates, health/release checks, bootstrap scripts, README, AGENTS snippet, and process skills.

## Raw Outputs
- Verification outputs are summarized in `verification.md`.
