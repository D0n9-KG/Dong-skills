# Artifact Index

## Created
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`: skill-local bootstrap script for new projects.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: templates copied into target projects by onboarding bootstrap.
- `.agents/skills/codex-git-checkpoint/SKILL.md`: Git/GitHub checkpoint commit and push discipline.

## Modified
- `.agents/skills/using-superpowers/SKILL.md`: routes checkpoint/push/archive moments to `codex-git-checkpoint`.
- `.agents/skills/executing-plans/SKILL.md`: adds checkpoint after verified meaningful tasks.
- `.agents/skills/codex-codebase-onboarding/SKILL.md`: adds Bootstrap Gate before onboarding.
- `.agents/skills/codex-project-governance/SKILL.md`: documents that onboarding can bootstrap Dong Skills config.
- `.codex/hooks/project-ops.mjs`: adds Git checkpoint status checks for recovery, compaction, and stop gates.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks/project-ops.mjs`: mirrors hook changes for new-project bootstrap.
- `AGENTS.project-ops.snippet.md`: adds `codex-git-checkpoint` to the curated set and completion discipline.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`: mirrors AGENTS snippet changes for bootstrap.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/handoff-summary.md`: adds `Git Checkpoint` section.
- `scripts/install-windows.ps1`: removes global hook installation behavior while keeping global skills install and project install support.
- `README.md`: documents project-level hooks and new-project startup through `codex-codebase-onboarding`.
- `.codex-context/*.md`: records current project state, plan, decisions, risks, verification, Git checkpoint, and handoff.

## Read / Inspected
- `README.md`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex-context/*.md`

## Raw Outputs
- Release verification command output is recorded in `verification.md`.
