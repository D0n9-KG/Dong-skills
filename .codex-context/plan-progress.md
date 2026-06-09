# Plan Progress

## Active Plan
User-approved optimization pass for items 1, 3, 6, 7 plus architecture/docs governance.

## Tasks
- [x] Split `.codex/hooks/project-ops.mjs` into a thin entrypoint and `.codex/scripts/lib/*.mjs`.
- [x] Update install/bootstrap scripts to copy split hook libraries and `state-prune.mjs`.
- [x] Add state archival with `scripts/state-prune.mjs` and hook CLI proxy.
- [x] Add regression tests for bootstrap split dependencies, stale artifact gate, PreCompact gate, and state pruning.
- [x] Slim `systematic-debugging/SKILL.md` and move details into `references/`.
- [x] Add `codex-architecture-governance` with architecture scan script.
- [x] Add `codex-docs-stewardship` with docs scan script.
- [x] Update README, AGENTS snippet, project governance routing, onboarding, and context-budget guidance.
- [x] Prune this kit's old verification history into `.codex-context/archive/`.
- [ ] Run final verification.
- [ ] Sync updated global skills.
- [ ] Commit and push.

## Current Step
Final verification and checkpoint.

## Out Of Scope
- Global hooks.
- Automatic commits without diff review.
- Fully automated refactors driven by scan scripts.
