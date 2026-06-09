# Project Map

## Purpose
Dong Skills is a personal Codex project-operations kit for long-running software work, context recovery, verification discipline, curated learning memory, Git checkpointing, architecture governance, and documentation stewardship.

## Stack
- Plain Node.js `.mjs` scripts with no package manager dependency.
- PowerShell installers/bootstrap scripts for Windows.
- Markdown-based Codex skills and `.codex-context/` state files.

## Architecture
- `.agents/skills/`: curated global skills installed for Codex.
- `.codex/hooks/project-ops.mjs`: thin project hook entrypoint.
- `.codex/scripts/lib/`: split hook runtime modules for templates, git, markdown, learning, recovery, events, budget, and CLI dispatch.
- `scripts/`: kit-level helper scripts and copies installed into target project `.codex/scripts/`.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/`: clean bootstrap asset tree for new projects.
- `.codex-context/`: live state for this kit; archive/raw are not active recovery context.

## Important Paths
- `.codex/hooks/project-ops.mjs`: hook CLI and event dispatcher.
- `.codex/scripts/lib/`: source for split hook behavior.
- `scripts/state-prune.mjs`: archives old verification history into `.codex-context/archive/`.
- `scripts/project-ops-health.mjs`: project install and asset parity check.
- `scripts/release-check.mjs`: syntax, PowerShell parse, tests, privacy, and runtime-artifact release check.
- `.agents/skills/codex-architecture-governance/`: architecture governance skill and scan script.
- `.agents/skills/codex-docs-stewardship/`: docs/state stewardship skill and scan script.

## Entry Points
- User install: `scripts/install-windows.ps1`.
- New project bootstrap: `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`.
- Project hooks: `.codex/hooks/project-ops.mjs` invoked by `.codex/hooks.json`.
- Tests: `tests/project-ops.test.mjs`.

## Commands
- Dev: edit Markdown/Node/PowerShell files directly.
- Build: no build step.
- Typecheck: `node --check <file>` for `.mjs` scripts.
- Lint: no dedicated linter.
- Test: `node --test tests/project-ops.test.mjs`.
- Health: `node scripts/project-ops-health.mjs .`.
- Release: `node scripts/release-check.mjs .`.
- Budget: `node .codex/hooks/project-ops.mjs context-budget`.

## Conventions
- Keep skill `SKILL.md` files short and move details to `references/` or scripts.
- Keep project runtime data under `.codex-context/raw/` ignored by Git.
- Keep old but useful verification history under `.codex-context/archive/` and exclude archive from active context budget.
- Keep onboarding asset files in parity with root hook, helper scripts, and AGENTS snippet.

## Where To Change Things
- Hook behavior: `.codex/scripts/lib/*.mjs`, then sync asset `.codex/scripts/lib/`.
- Hook event routing: `.codex/hooks/project-ops.mjs`, then sync asset hook.
- New project bootstrap/install: `scripts/install-windows.ps1` and `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`.
- Curated skill routing: `.agents/skills/using-superpowers/SKILL.md`, `.agents/skills/codex-project-governance/SKILL.md`, and `AGENTS.project-ops.snippet.md`.
- Release/privacy checks: `scripts/release-check.mjs`.

## Architecture Watchpoints
- Asset parity must stay explicit; otherwise new-project bootstrap can silently install stale hook dependencies.
- Context budget must distinguish active recovery files from on-demand archive files.
- Adding skills should not bloat always-loaded routing docs; route through concise descriptions and on-demand references.

## Unknowns
- Codex UI `/hooks` trust display cannot be verified programmatically from this repo.
