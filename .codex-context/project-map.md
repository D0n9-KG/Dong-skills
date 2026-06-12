# Project Map

## Purpose
Dong Skills is a personal Codex project-operations kit for long-running software work, context recovery, verification discipline, curated learning memory, structured solution memory, Git checkpointing, review discipline, architecture governance, and documentation stewardship.

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
- `docs/solutions/`, `CONCEPTS.md`, and `.codex-context/solution-index.md`: optional structured knowledge store introduced by `codex-solution-memory`.
- `STRATEGY.md`: optional strategy anchor introduced by `codex-strategy-anchor`.

## Important Paths
- `.codex/hooks/project-ops.mjs`: hook CLI and event dispatcher.
- `.codex/scripts/lib/`: source for split hook behavior.
- `.codex/scripts/lib/assets.mjs`: reusable asset lifecycle audit logic used by Stop/PreCompact and CLI reports.
- `scripts/state-prune.mjs`: archives old verification history into `.codex-context/archive/`.
- `scripts/asset-governance.mjs`: dry-run asset lifecycle audit and safe raw PreCompact snapshot pruning.
- `scripts/solutions.mjs`: validates and summarizes `docs/solutions/` and updates `solution-index.md`.
- `scripts/session-history.mjs`: scans prior session metadata and keyword counts without printing raw transcripts.
- `scripts/project-ops-health.mjs`: project install check and release-blocking asset parity check.
- `scripts/release-check.mjs`: syntax, PowerShell parse, tests, privacy, and runtime-artifact release check.
- `.agents/skills/codex-architecture-governance/`: architecture governance skill and scan script.
- `.agents/skills/codex-docs-stewardship/`: docs/state stewardship skill and scan script.
- `.agents/skills/codex-asset-governance/`: lifecycle governance for state, docs, raw, archive, solution, backlog, scripts, hooks, tests, generated evidence, and code assets.
- `.agents/skills/codex-solution-memory/`: structured solution memory workflow and frontmatter/vocabulary references.
- `.agents/skills/codex-review-panel/`: CE-inspired persona review workflow.
- `.agents/skills/codex-session-history/`: safe prior-session search workflow.
- `.agents/skills/codex-strategy-anchor/`: `STRATEGY.md` workflow.
- `.agents/skills/codex-evidence-capture/`: product-use evidence workflow.

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
- Asset governance: `node .codex/hooks/project-ops.mjs asset-governance`.
- Solution status: `node .codex/hooks/project-ops.mjs solution-status`.
- Solution validate: `node .codex/hooks/project-ops.mjs solution-validate`.
- Session history scan: `node .codex/hooks/project-ops.mjs session-history scan --days 7 --keywords <terms>`.

## Conventions
- Keep skill `SKILL.md` files short and move details to `references/` or scripts.
- Keep project runtime data under `.codex-context/raw/` ignored by Git.
- Keep old but useful verification history under `.codex-context/archive/` and exclude archive from active context budget.
- Keep generated `precompact-auto-*.md` raw snapshots short-lived; prune by retention with `asset-governance --apply`.
- Never prune `.codex-context/raw/observations.jsonl` through generic raw cleanup; review it with `codex-learning-memory`.
- Keep structured reusable solutions in `docs/solutions/`; keep `.codex-context/solution-index.md` compact.
- Keep Dong Skills self-improvement proposals in `docs/improvements/backlog.md`, separate from project instincts and solution memory.
- Keep full session transcripts out of active context; session history scans report metadata first.
- Keep onboarding asset files in parity with root hook, helper scripts, and AGENTS snippet.

## Where To Change Things
- Hook behavior: `.codex/scripts/lib/*.mjs`, then sync asset `.codex/scripts/lib/`.
- Hook event routing: `.codex/hooks/project-ops.mjs`, then sync asset hook.
- New project bootstrap/install: `scripts/install-windows.ps1` and `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`.
- Curated skill routing: `.agents/skills/using-superpowers/SKILL.md`, `.agents/skills/codex-project-governance/SKILL.md`, and `AGENTS.project-ops.snippet.md`.
- Release/privacy checks: `scripts/release-check.mjs`.
- Asset lifecycle audit: `.codex/scripts/lib/assets.mjs`, `scripts/asset-governance.mjs`, and `codex-asset-governance`.
- Solution memory validation: `scripts/solutions.mjs` plus `codex-solution-memory` references.
- Session metadata scan: `scripts/session-history.mjs` plus `codex-session-history`.

## Architecture Watchpoints
- Asset parity must stay explicit; otherwise new-project bootstrap can silently install stale hook dependencies.
- Recovery output must stay aligned with `AGENTS.project-ops.snippet.md`; `solution-index.md` belongs in active recovery, while `STRATEGY.md`, `CONCEPTS.md`, and full `docs/solutions/` remain on-demand.
- Context budget must distinguish active recovery files from on-demand archive files.
- Adding skills should not bloat always-loaded routing docs; route through concise descriptions and on-demand references.
- `docs/solutions/` can become noisy if every small fix is documented; only verified non-trivial learnings belong there, and duplicates should be consolidated.
- Session history is privacy-sensitive; never print raw transcripts from helper scripts.
- Asset governance should orchestrate lifecycle decisions without replacing specialist skills; deletion or restructuring still needs docs, solution, architecture, or checkpoint discipline as appropriate.

## Unknowns
- Codex UI `/hooks` trust display cannot be verified programmatically from this repo.
