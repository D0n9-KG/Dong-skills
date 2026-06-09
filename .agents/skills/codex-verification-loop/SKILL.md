---
name: codex-verification-loop
description: Choose and run verification for Codex project work. Use after code changes, before completion claims, before PR/merge, after refactors, bug fixes, dependency/config changes, or when build, typecheck, lint, tests, security scan, or diff review need a structured verification record.
---

# Codex Verification Loop

Verification is evidence, not confidence. Use the smallest command set that proves the claim.

## Select Checks

Use project evidence, not guesses:

- Build: package manifest, Makefile, CI, README, AGENTS.md.
- Typecheck: `tsc --noEmit`, `pyright`, `mypy`, `cargo check`, `go test ./...` depending on stack.
- Lint/format: `npm run lint`, `ruff check`, `cargo fmt --check`, `gofmt`, `dotnet format`.
- Tests: targeted unit tests first, then broader tests when risk warrants.
- Security: secret scan, dependency audit, auth/permission review when relevant.
- Diff review: always inspect changed files before reporting done.

## Minimum Record

Update `.codex-context/verification.md`:

```markdown
## Commands Run
- `[command]`
  - Result: pass | fail | blocked
  - Evidence: [short output summary]
  - Date: [YYYY-MM-DD HH:mm local]

## Not Yet Verified
- [gap and why]
```

If verification fails, return to `systematic-debugging` before further fixes.

## Completion Rule

Before saying work is complete, run a fresh verification command in the current turn or clearly state the remaining gap. Older runs are context, not proof.
