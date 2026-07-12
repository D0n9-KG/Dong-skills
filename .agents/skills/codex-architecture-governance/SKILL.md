---
name: codex-architecture-governance
description: Audit and guide project architecture for Codex work. Use after structural changes, before major refactors, when code becomes concentrated in large files, when directories become flat, when module boundaries are unclear, or when the user asks to improve architecture, testability, maintainability, or AI navigability.
---

# Codex Architecture Governance

## Purpose

Prevent project work from drifting into hard-to-change structure: god files, flat directories, shallow pass-through modules, hidden coupling, duplicate concepts, and untestable seams.

Architecture work is not cosmetic. Only recommend a change when it improves locality, leverage, testability, or the agent's ability to navigate the codebase.

## First Pass

1. Read `.codex-context/project-map.md`, `decisions.md`, `risks.md`, active spec/plan, and relevant docs or ADRs.
2. Inspect representative code, entry points, and tests for the area under change.
3. Run the optional scan when useful:

```powershell
node "<skill-dir>\scripts\architecture-scan.mjs" "<project-root>"
```

4. Treat the scan as a signal source, not proof.

## What To Check

- module ownership: each directory/file has a clear reason to exist
- dependency direction: lower-level code does not import higher-level orchestration
- locality: a feature's behavior is not scattered across many unrelated files
- leverage: abstractions hide meaningful behavior, not just pass values through
- seams: introduce interfaces only when something truly varies or testing needs a stable surface
- concentration: large files are reviewed for multiple responsibilities before they grow further
- flatness: directories with many unrelated files get grouped by domain or workflow
- duplication: repeated domain concepts, validation, IO, parsing, or state transitions are centralized deliberately
- tests: important behavior is testable through stable public surfaces
- docs: `project-map.md`, `decisions.md`, and `risks.md` reflect accepted structure
- package/module public entry points: imports use intended public surfaces instead of private internals
- deep imports: TypeScript/JavaScript package-style work avoids reaching into `src/internal`, generated build output, or sibling private modules without an explicit plan note
- package shape: `exports`, barrel files, dependency-cruiser rules, or equivalent boundaries match actual ownership

## Deep Module Boundary Check

For package-style TypeScript/JavaScript projects, run this check before approving architecture or implementation plans that touch module boundaries:

- identify public entry points and private internals for the package or feature
- search for new or existing deep imports that bypass those entry points
- confirm whether `package.json` `exports`, path aliases, barrel files, or dependency-cruiser rules enforce the intended boundary
- prefer a small public API or explicit feature entry point over scattered imports from private files
- record any allowed deep import as temporary `dong-debt:` with the ceiling and revisit trigger

## Output

For an audit, produce ranked findings:

- finding and evidence
- affected files
- why it hurts maintainability or testability
- recommendation strength: `strong`, `worth exploring`, or `speculative`
- smallest safe next step
- verification needed

For implementation, do not restructure immediately. First update or create a spec/plan with:

- current structure
- target structure
- migration steps
- compatibility risk
- test plan
- rollback/defer criteria

## State Updates

When architecture facts or decisions change:

- update `.codex-context/project-map.md` Architecture, Important Paths, Where To Change Things, and Architecture Watchpoints
- update `.codex-context/decisions.md` for accepted/rejected structural decisions
- update `.codex-context/risks.md` Architecture Risks
- update `.codex-context/artifact-index.md` for inspected and changed files

## Guardrails

- Do not create abstractions only for neatness.
- Do not split files if the split makes readers bounce across more files for one concept.
- Do not flatten by moving code without preserving import paths, tests, and ownership.
- Do not add barrel files that hide ownership, mask circular dependencies, or turn private internals into accidental public API.
- Do not fight an existing ADR without naming the conflict and why current friction justifies revisiting it.
- If three bug-fix attempts fail because new coupling keeps appearing, stop local patching and use this skill before another fix.
