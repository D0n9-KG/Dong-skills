# Spec

## Problem
Dong Skills had two related recovery/governance gaps:

- Long discussions and agent exploration could be lost when Codex compacted before state files were refreshed.
- Full Dong workflow skills installed globally could still appear in projects that were not initialized with Dong Skills, making routing ambiguous and risking project-local hook/state confusion.

The user also explicitly required that local non-Dong skills must not be touched.

## Goal
- Keep important discussion decisions and investigation findings recoverable after compaction.
- Make Dong Skills activation explicit per project: global install is only bootstrap/router, full workflow skills are project-local.
- Preserve non-Dong local skills, including same-name conflicts, unless a directory is clearly Dong-managed.
- Keep bootstrap/update simple for old projects.

## Approval Status
Approved by user through iterative instructions on 2026-06-18 to 2026-06-20.

## User Decisions
- Use project-level hooks, not global hooks.
- Global Dong Skills should be minimal and general.
- Project initialization should install the full Dong Skills set into the workspace.
- Do not touch local non-Dong skills.
- Hooks should stay deterministic and lightweight; no model-in-hook summarization.
- Preserve agent exploration as externalized findings, not hidden chain-of-thought.

## Candidate Options
- Keep all skills global: rejected because uninitialized projects can accidentally route through full workflow skills.
- Embed the full project skill bundle inside onboarding assets: rejected because nested asset paths were fragile on Windows.
- Source project skills from the real Dong Skills checkout via `.dong-skills-source.json`: selected.

## Non-Goals
- Claude Code compatibility.
- Cross-platform installer work in this batch.
- Global hooks.
- Storing raw transcripts or hidden reasoning.
- Deleting or rewriting non-Dong local skills.

## Approved Scope
- Add `dong-skills.manifest.json` and bootstrap asset copy.
- Update Windows installer for split global/project-level skill installation.
- Update onboarding bootstrap to install project-level skills from the source checkout.
- Add project-level skill marker `.agents/skills/.dong-skills-project.json`.
- Update `using-superpowers` and onboarding docs to gate full workflow routing on the project marker.
- Add `working-notes.md` and `discussion-state.json` compaction-resilience behavior.
- Update health/release checks and tests.
- Rewrite README in Chinese/English without personal private data.

## Design
- The manifest lists `global_skills` and `project_skills`.
- Global install writes only bootstrap/router skills to `%USERPROFILE%\.agents\skills` and records the real source checkout in `.dong-skills-source.json`.
- Old global heavy Dong skills are removed only when they are identifiable as Dong-managed; same-name non-Dong skills are preserved.
- Project bootstrap resolves the project-skill source from `.dong-skills-source.json` or a sibling checkout, installs manifest-listed project skills into `.agents/skills/`, and writes per-skill management markers.
- Bootstrap refuses to overwrite same-name non-Dong project skills.
- Health check requires a project marker for ordinary initialized projects, while the source repo can use `dong-skills.manifest.json` as the source-of-truth exception.
- Context recovery uses `working-notes.md` for compact externalized investigation state and `discussion-state.json` as ignored runtime freshness metadata.

## Acceptance Criteria
- Global install leaves only Dong bootstrap/router skills globally.
- Project install writes full workflow skills into target `.agents/skills/`.
- Non-Dong local skills are preserved; same-name non-Dong project skills are not overwritten.
- Health check detects missing project-level marker and bootstrap asset drift.
- Release check passes privacy, readability, syntax, test, and runtime artifact scans.
- Stop hook passes after state refresh.

## Open Questions
- None blocking.

## Next Step
Commit and push the verified batch, then provide an old-project update prompt.
