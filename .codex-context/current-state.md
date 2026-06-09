# Current State

## Objective
Prepare Dong Skills as a public Codex project-operations kit with global skills and project-level hooks.

## Latest User Instruction
Use `codex-codebase-onboarding` as the new-project entrypoint so a project can bootstrap itself from the skill; remove global hooks and keep hooks project-scoped.

## Current Phase
delivery

## Active Assumptions
- The user wants skills installed globally, but hooks installed per project for flexibility.
- New repositories should not require a manual project installer run after Dong Skills has been installed once.
- Public release content must avoid private runtime data, local absolute paths, tokens, raw observations, logs, and backups.

## Blockers
- None.

## Next Action
Regenerate the publish zip and push the repository update.

## Last Updated
2026-06-09 16:07 +08:00
