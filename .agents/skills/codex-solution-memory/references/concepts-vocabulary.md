# Concepts Vocabulary Rules

`CONCEPTS.md` is a glossary for project-specific language. It is not a spec, architecture document, task log, ownership map, or code index.

## Add A Term When

- It is a stable domain entity, named process, lifecycle state, or product concept.
- A future agent would misunderstand requirements or code without the shared definition.
- The concept appears across multiple files, docs, workflows, or user conversations.
- The definition can stay useful even as implementation files move.

## Do Not Add

- class names, file names, functions, scripts, or commands unless they are also domain language
- current thresholds, ports, flags, enum values, or config that can drift
- owners, dates, temporary statuses, TODOs, or project management notes
- generic engineering terms such as "component", "API", "test", or "cache"
- secrets, customer names, private URLs, or raw chat excerpts

## Entry Shape

```markdown
## Term

One or two sentences defining what the term means in this project.

- Related: OtherTerm, WorkflowName
- Used when: brief situation where the term matters
```

Keep entries short. If an entry needs implementation detail, link to `project-map.md`, `docs/solutions/`, or a spec instead of expanding the glossary.

## Maintenance

- Merge aliases into the canonical term.
- Refine a definition when a new solution adds precision.
- Remove implementation details during docs stewardship.
- Surface `CONCEPTS.md` in `AGENTS.md` once adopted.

