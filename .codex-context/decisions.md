# Decisions

## Accepted
- Dong Skills installs skills globally under `.agents/skills`.
- Dong Skills does not install global hooks.
- Project hooks are installed per repository through the kit installer or the onboarding skill bootstrap.
- `codex-codebase-onboarding` is the normal new-project entrypoint because it can bootstrap missing governance files and then map the codebase.

## Rejected
- Global hook dispatcher as the main release mechanism.
- Requiring a manual project installer run for every new repository after the skills are already installed.
