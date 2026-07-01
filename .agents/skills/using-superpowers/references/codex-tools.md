# Codex Tool Mapping

Use Codex-native capabilities when retained upstream wording mentions another harness.

| Upstream wording | Codex equivalent |
|---|---|
| task list / todo tool | `update_plan` |
| skill invocation tool | read the triggered `SKILL.md` and follow it |
| read / edit / write files | Codex file tools; use `apply_patch` for manual edits |
| shell / bash | the current shell; on Windows prefer PowerShell 7 / `pwsh` when available, and use explicit UTF-8 handling for Chinese files |
| separate reviewer | optional only when user asks and the mechanism is available; otherwise inline self-review |

Keep the project state in `.codex-context/`. Do not assume separate checkout managers, branch managers, or external command layers are installed.
