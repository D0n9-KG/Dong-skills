---
name: codex-evidence-capture
description: Capture real product-use evidence for changed behavior, inspired by Compound Engineering ce-demo-reel and dogfood flows. Use for UI, CLI, API, workflow, or bug-fix changes where tests alone do not prove the user-facing or operator-facing behavior.
---

# Codex Evidence Capture

## Purpose

Tests prove code properties. Evidence capture proves the product behavior was actually exercised.

Use this when a change has observable behavior: web UI, CLI output, API response, generated artifact, background workflow, or a bug reproduction/fix.

## Rules

- Use the product, command, API, or workflow directly.
- Never label test output as a demo or product evidence.
- Never record secrets, tokens, private URLs, customer data, auth headers, `.env` contents, or credential setup.
- If real evidence requires unavailable credentials, services, or deployment, state the blocker and capture the safest fallback.
- Save local evidence paths under `.codex-context/raw/` or an ignored temp location unless the project has a public artifact convention.

## Evidence Types

- Web app: browser screenshot, Playwright/browser verification, before/after states.
- CLI: command invocation and output, terminal screenshot when useful.
- API: request/response using safe local data, with secrets omitted.
- Generated file: render or inspect the artifact, not just its existence.
- Bug fix: original failing scenario plus fixed behavior when reproducible.

## Workflow

1. Identify the observable behavior from the spec, diff, or bug report.
2. Exercise it manually or with an e2e-style command.
3. Capture the evidence in the least sensitive form.
4. Record the evidence in `.codex-context/verification.md` under product evidence:

```markdown
## Product Evidence
- `[action]`
  - Result: pass | fail | blocked
  - Evidence: [screenshot path, command output summary, rendered artifact path]
  - Date: [YYYY-MM-DD HH:mm local]
```

5. Feed evidence gaps back into `codex-verification-loop`.

If evidence is blocked or incomplete, update `.codex-context/risks.md` or `.codex-context/plan-progress.md` when the gap affects delivery confidence or follow-up work.

## Completion

Before claiming delivery for user-visible changes, report both test verification and product evidence, or explicitly state why product evidence is blocked or not applicable.
