---
name: codex-wayfinder
description: Map a large, multi-session effort whose destination is known but whose route is still too uncertain for an approved spec or implementation plan. Use when discovery will span sessions and decisions depend on unresolved research, prototypes, or user grilling; do not use when ordinary brainstorming can produce a spec in one session.
---

# Codex Wayfinder

Use Wayfinder to discover the route, not to execute the destination. It is a lightweight local Markdown adaptation of Matt Pocock's Wayfinder: no issue tracker, labels, assignments, or external service is required.

## Entry Gate

Use this skill only when all are true:

- the effort is likely to exceed one session
- the destination can be named
- the next useful decisions are visible, but the full route is not
- writing a normal approved spec now would hide important uncertainty

If the route is already clear enough to specify, use `brainstorming` and `writing-plans` instead.

## Canonical Map

Create one local Markdown map at `docs/codex/wayfinder/<slug>.md`. Link it from `.codex-context/current-state.md` and `artifact-index.md`. The map is the canonical index; detailed research or prototypes live in linked files.

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
- `Prototype` (`HITL`): create a cheap artifact that helps the user react to behavior or shape.
- `Grilling` (`HITL`): resolve a decision through one-question-at-a-time discussion.
- `Task` (`AFK` or `HITL`): perform only the concrete prerequisite needed to unblock a later decision.

`HITL` means the human must supply judgment or information. The agent must not answer the human side of the exchange. `AFK` means the ticket can be resolved from available evidence without a user decision.

The frontier contains open, unblocked tickets whose questions are precise now. Fog contains in-scope uncertainty whose question cannot yet be stated precisely.

## Session Rule

Never resolve more than one frontier ticket per session. A session may update the map after resolving that ticket, but it must not silently start a second ticket.

For each session:

1. Read Destination, Decisions So Far, Frontier, Fog, and Out Of Scope.
2. Select one unblocked frontier ticket, preferring the first listed unless the user names another.
3. Resolve only that question using the ticket's type and mode.
4. Save evidence in a linked artifact when the result is larger than one paragraph.
5. Move the resolved ticket into Decisions So Far with a one-line gist.
6. Add newly precise frontier tickets and blocking edges.
7. Promote Fog items only when their question is now precise; remove promoted text from Fog.
8. Move discoveries beyond the destination into Out Of Scope instead of treating them as route decisions.
9. Refresh `.codex-context/working-notes.md` and `handoff-summary.md`.

## Exit

Wayfinding ends when no unresolved frontier or actionable Fog remains before the Destination. Then:

1. summarize the stable decisions and evidence
2. route to `brainstorming` to write and approve the spec
3. route to `writing-plans` only after the written spec is approved

Do not keep the Wayfinder map alive as a second plan after implementation starts.
