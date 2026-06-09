# Decisions

## Accepted
- Dong Skills installs skills globally under `.agents/skills`.
- Dong Skills does not install global hooks.
- Project hooks are installed per repository through the kit installer or the onboarding skill bootstrap.
- `codex-codebase-onboarding` is the normal new-project entrypoint because it can bootstrap missing governance files and then map the codebase.
- `codex-git-checkpoint` is part of the curated skill set and handles checkpoint commit, commit-message quality, optional push, and handoff deferral.
- Hooks require a meaningful `Git Checkpoint` handoff note when dirty or unpushed Git state exists, instead of forcing automatic commits.
- Split hook runtime code lives under `.codex/scripts/lib/`; the hook file itself stays thin.
- `.codex-context/archive/` is durable on-demand history and is excluded from active context-budget estimates.
- `codex-architecture-governance` and `codex-docs-stewardship` are main curated skills, not optional external modules.
- CE-inspired additions are adopted selectively: strategy anchor, structured solution memory, persona review panel, session-history metadata scan, and product evidence capture.
- `codex-solution-memory` owns full `docs/solutions/` documents and `CONCEPTS.md`; `codex-learning-memory` remains limited to compact instincts.
- Session history tooling must report metadata/keyword counts first and avoid raw transcript output.

## Rejected
- Global hook dispatcher as the main release mechanism.
- Requiring a manual project installer run for every new repository after the skills are already installed.
- Automatic commits without diff review and scope confirmation.
- Treating architecture/docs cleanup as only a final manual tidy-up step.
- Wholesale import of CE platform-specific skills such as Slack, Rails/Xcode, image generation, promotion/social copy, and fully autonomous workflows.
