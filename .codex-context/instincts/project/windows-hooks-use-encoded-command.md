---
id: windows-hooks-use-encoded-command
title: Use encoded PowerShell for Windows hooks
scope: project
domain: tooling
status: active
confidence: 0.7
created: 2026-06-10
last_checked: 2026-06-10
source: verified-fix
---

# Use encoded PowerShell for Windows hooks

## Trigger
Before editing `.codex/hooks.json`, bootstrap hook assets, or any `commandWindows` field.

## Action
Use `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ...` for Windows hook wrappers. Verify the decoded command still invokes `.codex/hooks/project-ops.mjs`, and run an outer PowerShell invocation test in addition to direct hook tests.

## Evidence
- 2026-06-10: Codex `/hooks` showed parser errors because inline nested PowerShell expanded `$root` and `$null` before the inner hook command ran.
- 2026-06-10: `node --test tests/project-ops.test.mjs` passed regression coverage for encoded command contents and outer PowerShell execution.

## Contraindications
- Do not encode unrelated arbitrary commands; health check must decode and confirm the payload invokes `project-ops.mjs`.
