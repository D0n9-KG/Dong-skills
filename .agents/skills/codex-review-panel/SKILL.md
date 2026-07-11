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
- a silent-pass verification mechanism such as CI/release gates, health checks, smoke contracts, coverage/lint enforcement, test harnesses, or installer diagnostics that could report green while the protected behavior is broken

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
4. Deduplicate findings only within the same review axis or persona. Merge duplicates under the highest justified severity inside that boundary.
5. Validate cheap factual claims directly against code or docs.
6. For the Simplicity lens, use the same tags as `codex-simplicity-review` when applicable: `delete`, `stdlib`, `native`, `yagni`, `shrink`, or `dong-debt`.
7. For user-content preservation, deletion, overwrite, migration, or cleanup changes, enumerate all destructive paths to the target. Prefer one guard at the shared choke point over per-caller patches, and verify sibling callers cannot bypass it.
8. Separate actionable findings from residual risks and test gaps.
9. If accepted findings require project-file edits, use `receiving-code-review` to evaluate and implement only scoped fixes. The first real project mutation automatically reopens debugging and invalidates prior verification/review evidence. Then run `execution-complete`, verification, and review again.

If a finding requires scope, architecture, or UX changes beyond the approved spec/plan, stop implementation and route back to `brainstorming` or `writing-plans`. Do not silently expand scope during review cleanup.

## Standards Verdict

Report whether the change follows repository instructions, documented conventions, architecture decisions, and the selected correctness/testing/maintainability lenses. Cite the standard or code evidence for each hard violation; label heuristic smells as judgment calls.

## Spec Verdict

Report separately whether the change implements the approved requirements: missing or partial requirements, scope creep, and behavior that appears implemented but contradicts the spec. Quote or point to the requirement for every finding.

Do not merge, deduplicate, or rerank findings across these two axes. A clean Standards verdict must not hide a failed Spec verdict, and faithful Spec implementation must not hide standards violations. Persona findings may be summarized under the relevant axis, but each axis keeps its own worst severity and final verdict.

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

- Standards Verdict: Ready, Ready with fixes, Not ready, or Not reviewed.
- Spec Verdict: Ready, Ready with fixes, Not ready, or Not reviewed because no spec exists.
- Applied fixes, if any
- Verification run or gaps
- Residual risks
- Related solution docs or learnings
- Overall delivery note without collapsing the two axis verdicts into one score

## State Updates

After a meaningful review:

- update `.codex-context/risks.md` with accepted residual risks
- update `.codex-context/decisions.md` for accepted or rejected review decisions that affect future work
- update `.codex-context/plan-progress.md` when review creates follow-up tasks
- always append a concise `## 审查证据` / `## Review Evidence` entry to `.codex-context/verification.md` with review scope, verdict, blocking findings or explicit none, residual risks, and whether fixes are required
- let the first real project-file fix reopen stale evidence automatically, then re-enter verification and review
- update `.codex-context/workflow-state.yaml` with `workflow-state transition review-complete` after meaningful review passes, or `review-skipped` when a low-risk skip is explicitly recorded

`review-complete` and `review-skipped` require the review evidence to be added after the accepted verification evidence. The workflow hashes the resulting document and rejects delivery if it changes after review closure.
