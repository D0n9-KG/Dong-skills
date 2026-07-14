---
name: codex-skill-evolution
description: Offline SkillOpt-Sleep integration for evolving Dong Skills itself. Use when the user asks to introduce, run, inspect, validate, or adopt SkillOpt/SkillOpt-Sleep self-evolution for Dong Skills; when converting Dong Skills backlog/outbox items into replay/eval tasks; or when reviewing staged SkillOpt proposals for Dong Skills skill, hook, installer, README, or workflow-rule improvements.
---

# Codex Skill Evolution

Use this skill to evolve Dong Skills itself through offline, validation-gated SkillOpt-Sleep runs.

This is not project memory and not a runtime hook. It is an explicit maintenance workflow for Dong Skills skills, docs, hooks, installer assets, and governance rules.

This skill is a global maintenance entry. It may be visible even when the current business project has not installed project-level Dong Skills. In that case, locate the real Dong Skills source repo first; do not bootstrap the business project just to inspect or evolve Dong Skills.

## Boundaries

- Keep `codex-learning-memory` as the router for deciding whether a signal is project memory, solution memory, or Dong Skills meta-learning.
- Keep `docs/improvements/backlog.md` and project `.codex-context/dong-skills-outbox.md` as the source of candidate issues.
- Use SkillOpt-Sleep only as an offline optimizer/evaluator that stages proposals.
- Run SkillOpt-Sleep against the real Dong Skills source repo, not the current business project unless the current project is the Dong Skills source repo.
- Do not treat installed skill copies under `%USERPROFILE%\.agents\skills` as the source repo.
- Do not run SkillOpt-Sleep from any hook.
- Do not use SkillOpt-Sleep to modify business project code.
- Do not use `--auto-adopt`.
- Automatically redact secrets before persisting candidate tasks, adoption diagnostics, or evolution logs; manual review is a second gate, not the primary privacy control.
- Surface backend failures explicitly, including auth, model, version, and command failures. Never convert an unavailable or failed backend into a zero score or a normal rejected candidate.
- Do not commit raw transcripts, `.skillopt-sleep/`, staging reports containing private content, or reviewed task drafts unless they are manually sanitized and intentionally added as public eval fixtures.

## Workflow

0. Locate the Dong Skills source repo. Discovery order is `--dong-skills-repo`, `DONG_SKILLS_REPO`, `DONG_SKILLS_HOME`, `%USERPROFILE%\.agents\skills\.dong-skills-source.json`, then current/parent checkout candidates. If no source repo is found, stop and ask for the source path.

1. Check status from any project:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution status
```

If the current project has not installed Dong Skills hooks, run the source script directly:

```powershell
node <Dong Skills repo>\scripts\skill-evolution.mjs <current repo> status
```

2. Collect candidate tasks from Dong Skills backlog and the current project outbox:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution collect-candidates --output .codex-context/raw/skill-evolution-tasks.json
```

When invoked from a business project, this writes the task draft under the Dong Skills source repo by default and can also read the business project's `.codex-context/dong-skills-outbox.md`.

3. Review and sanitize the generated tasks file. Mark `"reviewed": true` only after confirming it contains no secrets, private project details, raw chat, personal paths, or customer data.

4. Run a no-cost smoke check:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution dry-run --tasks-file .codex-context/raw/skill-evolution-tasks.json --backend mock
```

5. Run a real SkillOpt-Sleep optimization only when the user explicitly approves budget use:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution run --tasks-file .codex-context/raw/skill-evolution-tasks.json --backend codex --target-skill .agents/skills/brainstorming/SKILL.md
```

6. Inspect the staged proposal:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution inspect-stage
```

7. Adopt only after user review:

```powershell
node .codex/hooks/project-ops.mjs skill-evolution adopt --confirm-reviewed
```

8. After adoption, run Dong Skills verification:

```powershell
node scripts/run-domain-tests.mjs
node scripts/release-check.mjs .
```

## Candidate Quality

Good evolution candidates are recurring Dong Skills failures with observable acceptance criteria:

- `brainstorming` asks many questions at once instead of one focused next question.
- The agent implements before written-spec approval.
- PreCompact loses important handoff content.
- Stop hook output is invalid for Codex.
- Worktree root/source diagnostics mislead the user.
- Dong Skills meta-learning is written into project instincts instead of backlog/outbox.

Poor candidates are vague preferences, one-off frustrations, private implementation details, secrets, or project-specific business behavior.

## Validation Integrity

Before accepting an evolved skill:

- Evaluate baseline and candidate on the same reviewed training tasks and on separate held-out evaluation tasks that were not shown to the optimizer.
- The judge must be independent from the candidate-writing context when the harness supports separation. Do not leak the intended fix, suspected failure, or candidate rationale into the judge prompt.
- The builder must not modify acceptance conditions, judge rules, golden outputs, or held-out tasks.
- Unknown judge operations fail closed. A typo, unsupported operator, unavailable backend, parse error, or empty check set is an evaluation failure, not a passing or zero-score candidate.
- Compare against the current skill and the best known skill with the same backend, model, tool surface, and budget. Environment drift invalidates the comparison.
- Include negative and adversarial tasks that try to trigger the old rationalization or bypass, not only happy-path examples.

Adoption requires: no regression on protected gates, improvement on the target behavior, no held-out regression, and a manual diff review. A higher aggregate score cannot override a failed hard boundary.

For direct skill behavior checks that do not require a SkillOpt optimization run, use `scripts/skill-forward-eval.mjs` with a reviewed scenario. The external backend receives only the prompt and selected skill text; assertions stay in the local scenario and raw outputs are judged after they are written to separate files.

## Review Rules

Before adopting a staged proposal:

- Read `.skillopt-sleep/staging/<latest>/report.md`.
- Check baseline and candidate scores, gate action, accepted edits, rejected edits, and target paths.
- Confirm proposed edits affect Dong Skills source files, not installed copies under `%USERPROFILE%\.agents\skills`.
- Confirm the proposal does not weaken phase gates, hooks, privacy rules, or verification requirements.
- Run Dong Skills tests and release check after adoption.

If the gate rejects the candidate, record the rejection in `docs/improvements/evolution-log.md` or leave the staging folder ignored. Do not manually apply rejected edits unless the user explicitly asks and a separate review justifies it.
