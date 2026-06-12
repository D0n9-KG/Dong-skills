# Handoff Summary

## Objective
Add lightweight, Codex-aware worktree governance to Dong Skills.

## Latest User Instruction
User approved the adapted Superpowers-style worktree governance approach and asked to implement it for Dong Skills.

## Approved Scope / Spec
Add a mainline `codex-worktree-governance` skill, `worktree-state.md`, worktree-aware hook launcher, health diagnostics, bootstrap propagation, routing updates, tests, global sync, and GitHub push. Do not import the full heavy Superpowers worktree workflow.

## Plan Status
Implementation, verification, global sync, commit, and push are complete.

## Files Modified
- New worktree governance skill: `.agents/skills/codex-worktree-governance/SKILL.md`
- New state and hook runtime: `.codex-context/worktree-state.md`, `.codex/hooks/launch-project-ops.mjs`, `.codex/scripts/lib/worktree.mjs`
- Bootstrap assets: onboarding `.codex-context`, `.codex/hooks`, `.codex/scripts/lib`, `AGENTS.project-ops.snippet.md`, and health script copies
- Routing skills: `using-superpowers`, `codex-project-governance`, `executing-plans`, `codex-git-checkpoint`, `codex-codebase-onboarding`
- Project scripts/docs/tests: `scripts/project-ops-health.mjs`, `scripts/install-windows.ps1`, `tests/project-ops.test.mjs`, `README.md`, `AGENTS.project-ops.snippet.md`
- State files: `.codex-context/spec.md`, `plan-progress.md`, `artifact-index.md`, `current-state.md`, `verification.md`, `handoff-summary.md`

## Files Read But Not Changed
- Upstream Superpowers `using-git-worktrees`, `finishing-a-development-branch`, and worktree design docs
- Existing Dong Skills hook, recovery, template, bootstrap, health, release, and test files

## Decisions Made
- Add `codex-worktree-governance` as a main curated Dong Skills skill.
- Use detect-and-defer: detect current Git/worktree state first, defer to Codex App/native worktrees, and only allow manual fallback creation with user approval.
- Treat Codex App `.codex/worktrees/...` cleanup as host-owned, not Dong-owned.
- Add `worktree-state.md` to recovery order immediately after `handoff-summary.md`.
- Route hooks through `launch-project-ops.mjs`, which uses hook input `cwd` to dispatch to the actual Git root's `project-ops.mjs`.

## Open Questions And Assumptions
- Assumption: existing projects should rerun `codex-codebase-onboarding` or bootstrap repair to receive `worktree-state.md` and the launcher.
- Assumption: Codex UI may still display hook registration source paths, but runtime diagnostics now expose actual Git root and role.

## Risks
- Codex UI hook trust display is still controlled by Codex, not Dong Skills.
- Existing sessions may keep using old trusted hook commands until restarted or hooks are re-trusted.
- Worktree cleanup remains intentionally conservative; agents must not delete host-managed worktrees.

## Verification Evidence
- `node --test tests\project-ops.test.mjs` passed 16/16 tests.
- `node .codex\hooks\project-ops.mjs health-check` reported `Issues: none` and printed primary-checkout diagnostics.
- `node scripts\release-check.mjs .` passed health, syntax, PowerShell parse, tests, privacy scan, and runtime-artifact scan.
- Source and global installed changed skill directories match by SHA-256/file list.
- `git ls-remote origin refs/heads/main` confirmed the functional commit was present on GitHub.

## Git Checkpoint
- Latest functional commit: `a0533c3e88f84f4fc53868ccfc8a5c9383cb0218` (`feat(skills): add worktree governance`)
- Push state: pushed to `origin/main`
- Files included: worktree governance skill, launcher, worktree detection helpers, bootstrap assets, routing docs, tests, README/AGENTS guidance, and refreshed state files
- Files intentionally left uncommitted: none intended
- Deferred reason: none
- Next checkpoint: none

## Learned Instincts To Preserve
- Worktree state is a workspace boundary, not just a Git convenience.
- Hook UI source paths can differ from actual Git roots; trust hook input `cwd` and health diagnostics for runtime root.
- Cleanup ownership must be explicit before removing any linked worktree.

## Next Action
No active implementation step. For existing target projects, rerun `codex-codebase-onboarding` or bootstrap repair so project-local hooks receive `launch-project-ops.mjs` and `worktree-state.md`.

## Files To Re-read First
- `.codex-context/handoff-summary.md`
- `.codex-context/worktree-state.md`
- `.codex-context/current-state.md`
- `.codex-context/plan-progress.md`
- `.agents/skills/codex-worktree-governance/SKILL.md`
- `.codex/hooks/launch-project-ops.mjs`
- `.codex/scripts/lib/worktree.mjs`
- `scripts/project-ops-health.mjs`
