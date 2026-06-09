# Solution Frontmatter Schema

Use this compact schema for `docs/solutions/**/*.md`.

## Required Fields

```yaml
---
title: "Short specific title"
date: 2026-06-09
track: bug
category: runtime-errors
problem_type: duplicate-job
status: active
scope: payments-worker
tags: [payments, worker, idempotency]
verified_by: "npm test -- payments-worker"
---
```

## Field Rules

- `title`: human-readable title, quoted when it contains `: ` or ` #`.
- `date`: creation date in `YYYY-MM-DD`.
- `last_updated`: optional `YYYY-MM-DD` for refreshed docs.
- `track`: `bug` or `knowledge`.
- `category`: one of the categories below.
- `problem_type`: stable slug for the recurring issue or knowledge type.
- `status`: `active`, `stale`, or `superseded`.
- `scope`: module, product area, workflow, or repo-wide area.
- `tags`: YAML array with at least one tag.
- `verified_by`: command, review, or evidence that made the learning trustworthy.
- `source`: optional `user-correction`, `verified-fix`, `review`, `architecture-decision`, or `workflow-discovery`.
- `superseded_by`: optional path when `status: superseded`.
- `stale_reason`: required when `status: stale`.
- `stale_date`: required when `status: stale`.

## Categories

Bug track:

- `build-errors`
- `test-failures`
- `runtime-errors`
- `performance-issues`
- `database-issues`
- `security-issues`
- `ui-bugs`
- `integration-issues`
- `logic-errors`

Knowledge track:

- `architecture-patterns`
- `design-patterns`
- `tooling-decisions`
- `conventions`
- `workflow-issues`
- `developer-experience`
- `documentation-gaps`
- `best-practices`

## YAML Safety

Quote scalar values containing `: ` or ` #`.

Prefer inline arrays for tags:

```yaml
tags: [auth, sessions, middleware]
```

