# Current State

## Objective
Deliver the current Dong Skills update batch:

- preserve long discussion and investigation state across compaction with `discussion-state.json` and `working-notes.md`
- switch Dong Skills installation to global bootstrap/router only plus full project-level `.agents/skills/`
- protect non-Dong local skills from cleanup or overwrite

## Latest User Instruction
User asked to make some skills initialize into each project workspace, leave only general/bootstrap skills globally, and avoid touching local non-Dong skills.

## Current Phase
delivery

## Active Assumptions
- Dong Skills remains Codex-only.
- No global hooks should be installed.
- Global user skills should contain only `codex-codebase-onboarding` and `using-superpowers` from Dong Skills.
- Full workflow skills belong in each initialized project under `.agents/skills/`.
- Installers must manage only manifest-listed Dong skill names, and must not silently delete or overwrite same-name non-Dong local skills.
- Existing projects need a refresh/bootstrap before they receive the new project-level skill model and hook runtime.

## Blockers
- None for implementation or local verification.

## Next Action
Run final hook/status checks, then commit and push this verified batch if the repository remote is available.

## Last Updated
2026-06-20 16:52 +08:00
