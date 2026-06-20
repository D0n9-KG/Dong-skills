# Working Notes

## Purpose
Capture compact, externalized investigation state that should survive compaction. Do not store hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning here.

## Current Findings
- Full Dong workflow skills should be project-local, not global, because global availability lets uninitialized projects route into workflow skills without project hooks/state.
- A manifest-based split is clearer than ad hoc skill copying: `global_skills` stays small, `project_skills` is the full governed set.
- The source checkout path must be recorded during global install so project bootstrap can copy full skills without embedding a deep nested bundle.
- Same-name non-Dong skills are the main safety risk. The installer can remove old global heavy Dong copies only when they contain clear Dong-origin text or a marker; project bootstrap should refuse overwrite when a same-name project skill is not Dong-managed.
- `working-notes.md` and `discussion-state.json` address a different problem: compaction can happen during pure discussion or exploration before code files change.

## Current Hypothesis
- The split install model plus marker/manifest checks should prevent global/project skill confusion while still keeping new-project startup to one onboarding/bootstrap step.

## Rejected Paths
- Rejected global full workflow skills because they blur whether the current project is initialized.
- Rejected global hooks because the user prefers project-level flexibility.
- Rejected embedding a full nested `.agents/skills` bundle under onboarding assets after Windows path/copy fragility.
- Rejected model-in-hook summarization and transcript capture for compaction resilience.

## Open Investigation Questions
- In real old projects, same-name non-Dong project skill conflicts may require a manual rename/decision before bootstrap can proceed.

## Next Verification Step
- Run Stop hook after refreshed state files, then commit and push if Git remote is available.

## Promotion Notes
- Durable rules are already promoted into README, onboarding/router skills, installer/bootstrap scripts, tests, and this handoff.
