# Handoff Summary

## Objective
Make Dong Skills optimization deposits reliable from any project session by locating the real Dong Skills source repo or using a standard fallback outbox.

## Latest User Instruction
User emphasized that other sessions cannot find the correct place to deposit Dong Skills skill-optimization points.

## Approved Scope / Spec
- Add deterministic source repo discovery for Dong Skills meta-learning.
- Generate a global source marker during install.
- Add `.codex-context/dong-skills-outbox.md` as a fallback migration queue.
- Update learning-status, docs, templates, health checks, bootstrap assets, and tests.
- Keep outbox separate from project instincts and solution memory.

## Plan Status
Implementation is complete. Final checkpoint commit and push are pending.

## Files Modified
- `.codex/scripts/lib/learning.mjs`
- `.codex/scripts/lib/templates.mjs`
- `.codex/scripts/lib/recovery.mjs`
- `.codex/scripts/lib/assets.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/learning.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`
- `.codex-context/dong-skills-outbox.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/dong-skills-outbox.md`
- `scripts/install-windows.ps1`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `tests/project-ops.test.mjs`
- `.agents/skills/codex-learning-memory/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `AGENTS.md`
- `README.md`
- `docs/improvements/backlog.md`
- `.codex-context/*.md`

## Files Read But Not Changed
- Upstream Superpowers brainstorming source was inspected for the related brainstorming issue.

## Decisions Made
- Installed skill copies are explicitly rejected as Dong Skills source repos.
- `%USERPROFILE%\.agents\skills\.dong-skills-source.json` is local generated metadata and should not be committed.
- `dong-skills-outbox.md` is a migration queue, not project memory.
- `learning-status` is the standard command for answering where Dong Skills meta-learning will be written.

## Open Questions And Assumptions
- Assumption: existing target projects need bootstrap/onboarding refresh to receive `dong-skills-outbox.md` and updated runtime files.
- Open question: semantic deduplication of repeated learning observations remains a separate backlog item.

## Risks
- If the source marker is stale after moving the repo, sessions will fall back to outbox until reinstall or env vars update the path.
- Outbox entries must be periodically migrated or they can become stale.

## Verification Evidence
- `node --test tests\project-ops.test.mjs`: pass, 21/21.
- `node .codex\hooks\project-ops.mjs learning-status`: pass, reports source target and zero pending outbox items.
- `node .codex\hooks\project-ops.mjs health-check`: pass.
- `node .codex\hooks\project-ops.mjs asset-governance`: pass.
- `node scripts\release-check.mjs .`: pass.
- `git diff --check`: pass.
- Extra privacy scan for local paths/secrets: no real private path or secret findings; only documentation examples and test redaction fixtures matched.

## Git Checkpoint
- Latest commit: pending meta-learning routing checkpoint.
- Push state: pending push to `origin/main`.
- Files included: source discovery, outbox template, installer marker, docs, tests, bootstrap assets, and state files.
- Files intentionally left uncommitted: none intended.
- Deferred reason: none.
- Next checkpoint: commit and push after final verification.

## Learned Instincts To Preserve
- Dong Skills improvement points must go to the real Dong Skills backlog or the standard outbox, not project instincts.

## Next Action
Commit, push, and report result.

## Files To Re-read First
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/spec.md`
4. `.codex-context/plan-progress.md`
5. `.codex-context/artifact-index.md`
6. `.codex-context/verification.md`
7. `.agents/skills/codex-learning-memory/SKILL.md`
8. `.codex/scripts/lib/learning.mjs`
9. `scripts/install-windows.ps1`
10. `docs/improvements/backlog.md`
