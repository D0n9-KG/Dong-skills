---
name: codex-strategy-anchor
description: Create or maintain STRATEGY.md as a durable project strategy anchor, inspired by Compound Engineering ce-strategy. Use when starting a new product/project, updating direction, grounding brainstorming/planning, or when work risks drifting away from the product problem, users, metrics, or active tracks.
---

# Codex Strategy Anchor

## Purpose

Create and maintain `STRATEGY.md`: a short root-level anchor for what the project is, who it serves, how it succeeds, and which tracks matter now.

This is not a backlog, roadmap, spec, or plan. It is upstream grounding for `brainstorming`, `writing-plans`, and `codex-project-governance`.

## When To Use

- New product or project starts.
- User asks to define or update direction.
- Brainstorming or planning lacks product grounding.
- Scope is drifting into feature lists without a clear target problem.
- Existing `STRATEGY.md` may be stale.

## File Shape

```markdown
---
last_updated: 2026-06-09
---

# Strategy

## Target Problem

## Our Approach

## Who It Is For

## Key Metrics

## Active Tracks

## Not Working On
```

Keep it short enough to read before planning. A strong answer is specific; a weak answer is a slogan or a feature list.

## First Run

Ask one question at a time:

1. What concrete problem is this project solving?
2. What is the chosen approach, and what alternatives are implicitly rejected?
3. Who is the primary user or operator?
4. What metrics or observable signals define success?
5. What 2-5 tracks of work are active now?
6. What is explicitly not being worked on?

Push back on vague answers. Two rounds of clarification per section is enough; record weak sections as revisit candidates rather than stalling.

## Update Run

1. Read existing `STRATEGY.md`.
2. Summarize the current strategy in 3-5 lines.
3. Update only the targeted sections unless the user asks for a full refresh.
4. Preserve stable sections.
5. Update `last_updated`.

## Downstream Use

When present, read `STRATEGY.md` before:

- brainstorming large features
- writing implementation plans
- judging scope creep
- making product/UX tradeoffs
- choosing between technically plausible options

Record strategy-driven decisions in `.codex-context/decisions.md` when they affect implementation.

