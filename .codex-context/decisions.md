# Decisions

## Accepted
- Dong Skills installs skills globally under `.agents/skills`.
- Dong Skills does not install global hooks.
- Project hooks are installed per repository through the kit installer or the onboarding skill bootstrap.
- `codex-codebase-onboarding` is the normal new-project entrypoint because it can bootstrap missing governance files and then map the codebase.
- `codex-git-checkpoint` is part of the curated skill set and handles checkpoint commit, commit-message quality, optional push, and handoff deferral.
- Hooks should require a meaningful `Git Checkpoint` handoff note when dirty or unpushed Git state exists, instead of forcing automatic commits.

## Rejected
- Global hook dispatcher as the main release mechanism.
- Requiring a manual project installer run for every new repository after the skills are already installed.
- Automatic commits without diff review and scope confirmation.
