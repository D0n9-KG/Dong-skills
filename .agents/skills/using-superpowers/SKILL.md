---
name: using-superpowers
description: Use when starting work with this kit to choose the relevant project workflow skill before acting.
---

# Using Project Ops Skills

This kit keeps Codex from improvising past the user's intent. Use the smallest relevant skill for the current phase, then keep durable state in `.codex-context/`.

## Priority

1. User instructions and `AGENTS.md`.
2. Active skill instructions.
3. Default agent behavior.

If a skill conflicts with the latest user instruction, follow the user and update `.codex-context/current-state.md`.

## Skill Selection

- Unclear or behavior-changing request: `brainstorming`.
- New repo or unclear structure: `codex-codebase-onboarding`.
- Existing spec, multi-step task: `writing-plans`.
- Written plan to execute: `executing-plans`.
- Bug, failing test, unexpected behavior: `systematic-debugging`.
- Before completion claim: `verification-before-completion`.
- Meaningful implementation ready for risk review: `requesting-code-review`.
- Review feedback received: `receiving-code-review`.
- Context drift, compaction, or state size concern: `codex-context-budget`.
- Learning from repeated corrections or project-specific instincts: `codex-learning-memory`.

Do not load every skill. Read only the one needed now, plus directly referenced files if required.

## State Discipline

- Before edits: know the relevant files and update `artifact-index.md` when they matter.
- During work: keep `plan-progress.md` and `current-state.md` current.
- Before long pauses, compaction, or final response: refresh `handoff-summary.md`.
- Before success claims: run or record verification in `verification.md`.

## Tool Mapping

If a retained upstream note mentions another agent harness, translate it through `references/codex-tools.md`. Prefer Codex-native tools and the current workspace.
