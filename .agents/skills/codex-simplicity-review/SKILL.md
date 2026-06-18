---
name: codex-simplicity-review
description: Review code, plans, or architecture for overengineering in Dong Skills projects. Use before merge/delivery, during review, or when the user asks what can be deleted, simplified, replaced by standard library/native platform features, or tracked as deliberate simplification debt.
---

# Codex Simplicity Review

Review only for avoidable complexity. This skill is inspired by Ponytail's overengineering review, adapted for Dong Skills phase gates and state discipline.

## Scope

Use this when:

- a diff adds code, dependencies, abstractions, scripts, docs, state files, or workflow machinery
- a plan proposes custom logic where a standard library or native platform feature may already cover it
- a review needs a focused delete-list rather than a full correctness/security pass
- the user asks whether the solution is overbuilt, too large, or can be simplified

It complements `codex-review-panel`. It does not replace correctness, security, data-loss, accessibility, or verification review.

## Simplicity Gate

Before writing findings, check these rungs in order:

1. **Avoid building:** can the approved outcome be achieved by deleting, configuring, documenting, narrowing scope, or doing nothing?
2. **Standard library:** does the language/runtime standard library already provide the behavior?
3. **Native platform:** does the browser, OS, database, framework, shell, or built-in service already provide the behavior?

Do not make one-line/minimum-implementation checks mandatory Dong Skills rungs. If they are useful, mention them as advisory `shrink` findings only.

## Finding Tags

- `delete`: dead code, duplicate docs, speculative feature, or unused flexibility. Replacement: nothing.
- `stdlib`: hand-rolled behavior already available in the standard library. Name the API.
- `native`: dependency or code doing what the platform already does. Name the feature.
- `yagni`: abstraction, option, config, hook, state file, or extension point with no current caller/reader/owner/reason.
- `shrink`: same behavior with fewer files, lines, states, or steps.
- `dong-debt`: deliberate simplification with a known ceiling should be marked as `dong-debt: <ceiling>; revisit when <trigger>`.

## Process

1. Define scope: current diff, plan, or repo area. Do not switch branches.
2. Read the approved spec/plan if present so you do not delete explicitly approved scope.
3. Inspect dependencies, imports, abstractions, config, docs/state assets, and tests affected by the scope.
4. Prefer concrete deletion or replacement actions over vague advice.
5. If a simplification would conflict with approved scope or user preference, record it as a residual option, not a finding.
6. If a simplification has a ceiling but is accepted, require a `dong-debt:` marker with ceiling and revisit trigger.

## Output

Lead with findings. One line per finding:

```markdown
| # | Tag | Location | What To Cut | Replacement / Trigger |
|---|---|---|---|---|
```

End with:

- `net: -N lines, -M deps, -K files possible` when estimable
- `No simplicity findings. Ship.` when nothing material can be cut
- verification or review gaps if the review could not inspect enough context

## State Updates

After a meaningful review:

- update `.codex-context/risks.md` for accepted simplification risks
- update `.codex-context/decisions.md` for accepted/rejected simplification decisions that affect future work
- update `.codex-context/plan-progress.md` when the review creates follow-up tasks
- update `.codex-context/artifact-index.md` for inspected files when the review is part of project work

Do not save broad simplicity preferences as project instincts unless `codex-learning-memory` validates a repeated, evidence-backed pattern.
