# Spec

## Problem
Dong Skills still lacks explicit Git/GitHub archive discipline. Codex can work for a long time without checkpoint commits, or commit with vague messages that do not explain scope, intent, verification, or push state.

## Goals
- Add `codex-git-checkpoint` to the curated skill set.
- Require diff review, scope selection, verification awareness, clear commit messages, and push-state reporting.
- Remind Codex before compaction, stopping, final delivery, branch switches, risky changes, and long pauses.
- Allow a documented deferral when work is not ready to commit.
- Keep project-level hooks and bootstrap assets consistent.

## Non-Goals
- Do not force automatic commits.
- Do not force half-finished or unverified work into Git.
- Do not replace the GitHub plugin's full PR publishing workflow.

## Approved Scope
- New `codex-git-checkpoint` skill.
- Updates to `codex-project-governance`, `using-superpowers`, `executing-plans`, README, AGENTS snippets, handoff templates, and project hook checks.

## User Decisions
- 2026-06-09: Add a GitHub archive commit/push discipline skill to Dong Skills.
- 2026-06-09: Codex should be reminded to checkpoint regularly and write clear commit messages.

## Acceptance Criteria
- `codex-git-checkpoint` exists and is installed globally.
- Curated skill lists include `codex-git-checkpoint`.
- Bootstrap assets include the new skill guidance and `Git Checkpoint` handoff section.
- Hooks surface missing Git checkpoint notes for uncommitted changes, unpushed commits, or missing upstream state.
- Commit/push guidance prevents unrelated staging, vague commits, unsafe force-pushes, and private runtime data leaks.
- Verification and release scans pass.

## Open Questions
- None.
