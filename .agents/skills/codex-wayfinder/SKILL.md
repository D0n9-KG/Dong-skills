---
name: codex-wayfinder
description: Map a large, multi-session effort whose destination is known but whose route is still too uncertain for an approved spec or implementation plan. Use when discovery will span sessions and decisions depend on unresolved research, prototypes, or user grilling; do not use when ordinary brainstorming can produce a spec in one session.
---

# Codex Wayfinder

Use Wayfinder to discover the route, not to execute the destination. It is a lightweight local Markdown adaptation of Matt Pocock's Wayfinder, with recent prototype-as-primary-source and local ticket guidance adapted for Dong Skills: no issue tracker, labels, assignments, or external service is required.

## Entry Gate

Use this skill only when all are true:

- the effort is likely to exceed one session
- the destination can be named
- the next useful decisions are visible, but the full route is not
- writing a normal approved spec now would hide important uncertainty

If the route is already clear enough to specify, use `brainstorming` and `writing-plans` instead.

Before creating or resuming the active map, confirm the workflow is in the formal Wayfinder phase. When it is not already `wayfinding`, run:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition wayfinder-start
```

Do not start Wayfinder by directly editing `workflow-state.yaml`.

## Typical Triggers

Use Wayfinder before brainstorming when any of these are true:

- the user can name the destination, but the route still depends on unresolved research, prototype, or user-grilling decisions
- a normal spec would need to pretend uncertain architecture, UX, data model, migration, or evaluation choices are already known
- the work has visible frontier questions and fog that will likely span sessions
- the next best step is to answer one bounded question, not approve an implementation plan
- the project needs a recoverable map of decisions, blockers, and rejected routes before committing to a spec

## Canonical Map

Create one local Markdown map at `docs/codex/wayfinder/<slug>.md`. Record the active map in `.codex-context/current-state.md` with this exact machine-readable marker and link it from `artifact-index.md`:

```markdown
当前 Wayfinder: [<name>](docs/codex/wayfinder/<slug>.md)
```

The map is the canonical index; detailed research or prototypes live in linked files. The recovery evaluator accepts the equivalent `Active Wayfinder:` label and plain paths, but new records should use the Chinese marker above.

Keep linked research and disposable prototype artifacts under `docs/codex/wayfinder/`, with prototypes under `docs/codex/wayfinder/prototypes/`. These paths remain writable as governance evidence before execution approval. Do not place prototype code in product source directories or treat a prototype artifact as approval to execute the destination.

Use this shape:

```markdown
## Destination
<What becomes possible when the route is clear.>

## Operating Mode
Planning only, unless the user explicitly authorizes a task that must be done to unblock a decision.

## Decisions So Far
- [Decision name](linked evidence) — one-line result.

## Frontier
| Ticket | Type | Mode | Question | Blocked By | Status |
|---|---|---|---|---|---|

## Fog
- In-scope areas that are visible but not yet precise enough to become tickets.

## Out Of Scope
- Explicit boundaries that never graduate into frontier work unless the destination changes.
```

Use names, not bare numeric IDs, in user-facing narration.

## Ticket Contract

Each ticket resolves one question sized for one session:

- `Research` (`AFK`): gather external or repository evidence and produce a linked summary.
- `Prototype` (`HITL`): create a cheap artifact that answers one design question and helps the user react to behavior or shape.
- `Grilling` (`HITL`): resolve a decision through one-question-at-a-time discussion.
- `Task` (`AFK` or `HITL`): perform only the concrete prerequisite needed to unblock a later decision.

`HITL` means the human must supply judgment or information. The agent must not answer the human side of the exchange. `AFK` means the ticket can be resolved from available evidence without a user decision.

The frontier contains open, unblocked tickets whose questions are precise now. Fog contains in-scope uncertainty whose question cannot yet be stated precisely.

Keep ticket-style detail local and one-question-per-row. If a frontier row needs more than a sentence, create `docs/codex/wayfinder/tickets/<slug>.md` and link it from the map. Do not collapse multiple unrelated decisions into one ticket blob.

## Prototype As Primary Source

When a prototype is needed, make the prototype the primary source for the question it answers, not an untracked side experiment:

- state the design question before creating the prototype
- choose `Logic prototype` for behavior, data flow, algorithms, integration boundaries, or API shape
- choose `UI prototype` for interaction, layout, user reaction, workflow shape, or copy decisions
- keep prototype artifacts under `docs/codex/wayfinder/prototypes/` unless an existing project convention is safer
- do not place throwaway prototype shells in production source directories or ship them as production code
- for UI prototypes, prefer existing route/page variants when a host surface exists; create a standalone prototype route only when no safe host surface exists
- for logic prototypes, keep decision-rich logic behind a small pure interface when practical so the validated idea can be lifted cleanly later
- record the answer and a primary-source pointer in the map; fold only validated decisions into `spec.md`, plans, or product code
- remove or archive losing variants and throwaway shells before implementation begins

## Session Rule

Default to resolving one frontier ticket per session so route decisions stay reviewable and recoverable. A stronger model may investigate multiple related tickets in parallel only when the tickets share one decision boundary, do not require separate human judgment, and all outputs are reconciled into one map update with explicit evidence and remaining fog. Do not silently start an unrelated second ticket.

For each session:

1. Read Destination, Decisions So Far, Frontier, Fog, and Out Of Scope.
2. Select one unblocked frontier ticket, preferring the first listed unless the user names another. If using bounded parallel exploration, name the related tickets up front and state the single decision boundary they jointly unblock.
3. Resolve only that question using the ticket's type and mode.
4. Save evidence in a linked artifact when the result is larger than one paragraph.
5. Move the resolved ticket into Decisions So Far with a one-line gist.
6. Add newly precise frontier tickets and blocking edges. For bounded parallel exploration, reconcile all parallel results into one Decisions So Far entry or a clearly linked cluster before ending the session.
7. Promote Fog items only when their question is now precise; remove promoted text from Fog.
8. Move discoveries beyond the destination into Out Of Scope instead of treating them as route decisions.
9. Refresh `.codex-context/working-notes.md` and `handoff-summary.md`.
10. Keep the map's existing `artifact-index.md` entry accurate when its path or role changes. A content-only map update does not require a no-op index edit.
11. After the map and required context files are current, refresh the recovery hash before Stop or compaction:

```powershell
node .codex/hooks/project-ops.mjs workflow-state hash --write
```

## Exit

Wayfinding ends when no unresolved frontier or actionable Fog remains before the Destination. Then:

1. summarize the stable decisions and evidence
2. replace the active marker in `current-state.md` and `handoff-summary.md` with `当前 Wayfinder: 无`
3. run `node .codex/hooks/project-ops.mjs workflow-state transition wayfinder-complete`
4. route to `brainstorming` to write and approve the spec
5. route to `writing-plans` only after the written spec is approved

Do not keep the Wayfinder map alive as a second plan after implementation starts.
