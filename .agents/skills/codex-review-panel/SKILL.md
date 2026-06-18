---
name: codex-review-panel
description: Run a Compound Engineering inspired persona review panel for code, plans, docs, architecture, and delivery evidence. Use after meaningful implementation, before merge/delivery, for plan review, or when single-pass review would miss correctness, testing, maintainability, security, performance, scope, or project-standard issues.
---

# Codex Review Panel

## Purpose

Use tiered reviewer personas to catch issues a single checklist often misses. This skill adapts Compound Engineering's `ce-code-review` and `ce-doc-review` idea to Codex without requiring external reviewer agents.

Default behavior is review-only. Apply fixes only when the user requested implementation or the governing workflow already requires you to resolve findings.

## Inputs

Collect the smallest complete review bundle:

- approved spec or requirements
- implementation plan, if present
- `git diff --stat`
- relevant `git diff`
- `.codex-context/verification.md`
- `.codex-context/risks.md`
- `AGENTS.md` and project standards relevant to the changed area
- related `docs/solutions/` entries when available

## Mandatory Panel Triggers

Use this panel, not only the lightweight review checklist, when any of these apply:

- cross-file or shared-module behavior changes
- public API, schema, auth, permissions, security, privacy, migration, or data-loss risk
- user-visible workflow/UI/CLI/API behavior changes
- architecture, module-boundary, or dependency-direction changes
- completed implementation plan before merge, PR, or final delivery
- verification gaps, manual-only evidence, or failed checks that required judgment

If the panel is intentionally skipped for a meaningful diff, record the low-risk reason and the skipped lenses in `.codex-context/verification.md` or `handoff-summary.md`.

## Review Team

Always run these lenses:

- Correctness: broken behavior, edge cases, state, data loss.
- Testing: missing unit/e2e proof, weak assertions, unverified acceptance criteria.
- Maintainability: coupling, unnecessary abstraction, large-file drift, naming, locality.
- Simplicity: whether the diff should avoid building, use standard library behavior, or use native platform features instead of custom code, new dependencies, or extra abstractions.
- Project Standards: `AGENTS.md`, existing conventions, architecture decisions.

Add conditional lenses only when the diff or plan justifies them:

- Security: auth, permissions, PII, secrets, public endpoints, trust boundaries.
- Performance: database queries, loops over large data, caching, async/concurrency.
- API Contract: routes, schemas, serializers, public types, versioning.
- Data Migration: schema changes, backfills, destructive migrations.
- Reliability: retries, timeouts, background jobs, deployment/rollback behavior.
- Architecture: new module boundaries, dependency direction, shared abstractions.
- UX/Product: user flows, visible UI, scope alignment, surprising behavior.
- Adversarial: high-stakes or cross-boundary changes where failure scenarios matter.

## Process

1. Define review scope from the current branch/diff. Do not switch branches.
2. State selected personas and why each conditional persona was activated.
3. Review from each persona separately. Keep findings grounded in file/line evidence.
4. Deduplicate findings. Merge duplicates under the highest justified severity.
5. Validate cheap factual claims directly against code or docs.
6. For the Simplicity lens, use the same tags as `codex-simplicity-review` when applicable: `delete`, `stdlib`, `native`, `yagni`, `shrink`, or `dong-debt`.
7. Separate actionable findings from residual risks and test gaps.
8. If fixes are in scope, apply only scoped fixes, run targeted verification, and update `.codex-context/verification.md`.

If a finding requires scope, architecture, or UX changes beyond the approved spec/plan, stop implementation and route back to `brainstorming` or `writing-plans`. Do not silently expand scope during review cleanup.

## Severity

- `P0`: critical breakage, exploitable vulnerability, corruption, or destructive risk.
- `P1`: high-impact behavior or contract regression.
- `P2`: meaningful defect, maintainability trap, or missing proof.
- `P3`: low-impact improvement or advisory risk.

Do not report vague "consider" findings. Every finding needs a concrete action, explicit risk acceptance, or a reason it is informational only.

## Plan / Document Review

For specs and plans, use these personas:

- Coherence: contradictions, terminology drift, unclear acceptance criteria.
- Feasibility: whether the approach survives contact with the repo.
- Scope Guardian: creep, premature abstraction, hidden non-goals.
- Simplicity Gate: whether the plan records avoid-building, standard library, and native platform alternatives before implementation.
- Security Lens: auth/data/API risks in the plan.
- Design/Product Lens: user flow, interaction states, value alignment.
- Adversarial Document Reviewer: unstated assumptions and failure scenarios.

Classify the document by content shape, not file path. Requirements focus on what to build; plans focus on how to build.

## Output

Lead with findings, ordered by severity:

```markdown
| # | Severity | File | Issue | Action |
|---|---|---|---|---|
| 1 | P1 | `path/file.ts:42` | Short issue title | Concrete fix |
```

Then include:

- Applied fixes, if any
- Verification run or gaps
- Residual risks
- Related solution docs or learnings
- Verdict: Ready, Ready with fixes, or Not ready

## State Updates

After a meaningful review:

- update `.codex-context/risks.md` with accepted residual risks
- update `.codex-context/decisions.md` for accepted or rejected review decisions that affect future work
- update `.codex-context/plan-progress.md` when review creates follow-up tasks
- update `.codex-context/verification.md` when fixes or evidence are produced
- update `.codex-context/workflow-state.yaml` with `workflow-state transition review-complete` after meaningful review passes, or `review-skipped` when a low-risk skip is explicitly recorded
