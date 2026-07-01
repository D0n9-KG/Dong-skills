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
- Product evidence: for observable UI, CLI, API, generated artifact, or workflow changes, use `codex-evidence-capture` so the behavior is exercised directly.

## Minimum Record

Append new entries to the end of `.codex-context/verification.md` under `已运行命令` and `产品证据` when the file uses Chinese headings. Existing English headings `Commands Run` and `Product Evidence` are still valid. `state-prune` keeps the newest entries by file order, so prepending fresh evidence can cause it to be archived by mistake.

```markdown
## 已运行命令
- `[command]`
  - Result: pass | fail | blocked
  - Evidence: [简短输出摘要]
  - Date: [YYYY-MM-DD HH:mm 本地时间]

## 产品证据
- `[action]`
  - Result: pass | fail | blocked
  - Evidence: [截图路径、渲染产物路径、命令输出摘要，或明确说明不适用]
  - Date: [YYYY-MM-DD HH:mm 本地时间]

## 尚未验证
- [验证缺口及原因]
```

If verification fails, return to `systematic-debugging` before further fixes.

When workflow state is available, update it after recording verification:

- Passing verification: `node .codex/hooks/project-ops.mjs workflow-state transition verification-pass`
- Explicit unverified gap recorded: `node .codex/hooks/project-ops.mjs workflow-state transition verification-gap-recorded`
- Failed verification: `node .codex/hooks/project-ops.mjs workflow-state transition verification-fail`

## Completion Rule

Before saying work is complete, run a fresh verification command in the current turn or clearly state the remaining gap. Older runs are context, not proof.
