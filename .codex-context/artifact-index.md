# Artifact Index

## Created
- `.codex-context/dong-skills-outbox.md`: fallback queue for Dong Skills improvement candidates when the real source repo is unavailable.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/dong-skills-outbox.md`: bootstrap template for target projects.
- `.codex-context/archive/verification-2026-06-13-remaining-optimization.md`: archived older verification entries after `state-prune --verification --archive --keep-latest 8 --apply`.
- `.codex-context/archive/verification-2026-06-13-final-remaining-optimization.md`: archived one older verification entry after final verification evidence was added.
- `.codex-context/archive/verification-2026-06-13-audit-cleanup.md`: archived one older verification entry after the follow-up audit evidence was added.
- `.codex-context/archive/verification-2026-06-13-brainstorming-continuation.md`: archived one older verification entry after the brainstorming continuation-loop fix evidence was added.

## Modified
- `.agents/skills/brainstorming/SKILL.md`: adds an explicit Continuation Loop preserving upstream Superpowers flow discipline; after each user answer, brainstorming must continue to the next single question, approaches, design section, final approval, `writing-plans`, pause, or blocker instead of stopping after state-file updates.
- `tests/project-ops.test.mjs`: adds a regression test that guards the brainstorming continuation-loop requirement.
- `docs/improvements/backlog.md`: records the user-reported brainstorming continuation defect as a completed Dong Skills improvement.
- `.codex/scripts/lib/learning.mjs`: adds Dong Skills source discovery, installed-copy rejection, outbox status, and learning-status reporting.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/learning.mjs`: bootstrap runtime copy.
- `.codex/scripts/lib/learning.mjs`: now also assigns observation topics, deduplicates status follow-ups, and reports grouped pending observations.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/learning.mjs`: bootstrap copy synced.
- `.codex/scripts/lib/git.mjs`: improves Git Checkpoint diagnostics with stale handoff evidence and latest changed file details.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/git.mjs`: bootstrap copy synced.
- `scripts/state-prune.mjs`: adds `--verification --archive --keep-latest` command shape and active archive pointers.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/state-prune.mjs`: bootstrap copy synced.
- `.agents/skills/brainstorming/SKILL.md`: previously added Living Spec mode, one-question cadence, and section-by-section approval guidance.
- `.agents/skills/codex-asset-governance/SKILL.md`: points verification bloat remediation to the new state-prune command.
- `.codex/scripts/lib/templates.mjs`: adds `dong-skills-outbox.md` required file and template.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/templates.mjs`: bootstrap runtime copy.
- `.codex/scripts/lib/recovery.mjs`: recovery order mentions outbox only for Dong Skills improvement work.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/recovery.mjs`: bootstrap runtime copy.
- `.codex/scripts/lib/assets.mjs`: includes outbox in active state file size governance.
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`: bootstrap runtime copy.
- `scripts/install-windows.ps1`: writes global local source marker.
- `scripts/install-windows.ps1`: now skips rewriting `.codex/hooks.json` when the merged hook configuration is semantically unchanged, avoiding self-install formatting churn.
- `scripts/project-ops-health.mjs` and bootstrap copy: require `dong-skills-outbox.md`.
- `tests/project-ops.test.mjs`: adds fallback outbox, source repo discovery, Chinese UTF-8, topic dedupe, stale checkpoint diagnostics, and state-prune archive pointer tests.
- `.agents/skills/codex-learning-memory/SKILL.md`: documents source discovery, fallback outbox, and status answer template.
- `.agents/skills/codex-project-governance/SKILL.md`: routes Dong Skills meta-learning to backlog or outbox.
- `AGENTS.project-ops.snippet.md`, onboarding copy, `AGENTS.md`, and `README.md`: document outbox/source marker behavior.
- `docs/improvements/backlog.md`: records user-reported Dong Skills PRD items; 2026-06-13 audit unified all implemented/resolved item statuses to the canonical `done` state.
- `.codex-context/*.md`: refreshed for this task.
- `.codex-context/verification.md`: active command evidence pruned back to 8 entries with archive pointers.

## Read / Inspected
- Current `brainstorming`, `codex-learning-memory`, `codex-project-governance`, and `codex-asset-governance` skills.
- Learning, recovery, template, health-check, install, and test runtime files.
- Upstream Superpowers brainstorming behavior for context.

## Raw Outputs
- No raw outputs added. Verification evidence is summarized in `.codex-context/verification.md`.
