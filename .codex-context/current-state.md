# Current State

## Objective
Prepare Dong Skills as a public Codex project-operations kit with global skills and project-level hooks.

## Latest User Instruction
Use `codex-codebase-onboarding` as the new-project entrypoint so a project can bootstrap itself from the skill; remove global hooks and keep hooks project-scoped.

## Current Phase
handoff

## Active Assumptions
- The user wants skills installed globally, but hooks installed per project for flexibility.
- New repositories should not require a manual project installer run after Dong Skills has been installed once.
- Public release content must avoid private runtime data, local absolute paths, tokens, raw observations, logs, and backups.

## Blockers
- None.

## Next Action
Use `codex-codebase-onboarding` to bootstrap and onboard the next target project.

## Last Updated
2026-06-09 16:16 +08:00
