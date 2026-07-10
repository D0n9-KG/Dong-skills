---
name: codex-loop-design-check
description: Design or review an autonomous, repeated, Goal-mode, scheduled, or self-improving agent loop so it cannot spin, game its verifier, weaken tests, or run an ambiguous goal to completion. Use for loops and SkillOpt-style optimization, not for one-off tasks.
---

# Codex Loop Design Check

Use this skill for the judgment layer of a loop: whether the goal is valid, decidable, bounded, and independently judged.

## Build Gate

Do not create a loop unless the task repeats, verification can be automated, the budget is acceptable, and the agent has tools that can execute and observe the real result. Otherwise use a normal task or manual checkpoint.

## Goal Contract

A loop goal must include:

- a machine-decidable done condition
- boundary conditions stating what must not change
- an external or reconciliation-based fact source where possible
- a retry cap and a human escalation path
- explicit stop conditions for ambiguity, destructive action, scope change, or missing evidence

Avoid goals such as "make it good" or only "all tests pass." Tests alone can be gamed by deleting, weakening, mocking, or swallowing failures.

## Plan / Build / Judge

Separate three responsibilities:

- **Plan:** defines the goal, boundaries, and deterministic acceptance conditions.
- **Build:** changes the implementation and must not modify the acceptance conditions.
- **Judge:** runs acceptance independently and reports the observed failure reason.

The independent judge must not be the same actor or context that produced the candidate when independent execution is available. The judge uses commands, reconciliation, or fixed checks, not "looks right."

After the retry cap, stop and escalate. Do not silently broaden the goal or rewrite the verifier.

## Review Checklist

Reject or redesign the loop if any is true:

- the exit condition is not machine-decidable
- boundary conditions are absent
- the builder can edit tests, judge rules, golden data, or acceptance criteria to pass
- unknown judge operations or unavailable backends count as success
- the loop expects the agent to ask a critical clarification mid-run
- stale memory or instructions can enter each iteration without freshness checks
- the loop owns irreversible acceptance, merge, publication, money, permissions, or deletion

Keep final judgment with a human for high-impact outcomes. The loop may prepare evidence or a candidate, but the human owns the last irreversible switch.

## Landing

Run once manually, then run with bounded automation, then schedule only after the judge and stop behavior are proven. Record cost, retry count, failures, and the exact reason for stopping.

For Dong Skills Goal mode, write the approved result into `.codex-context/plan-progress.md` under `## Loop Review`, then run:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition loop-review-approved
```

This transition is required before `execution-approved-goal`.
