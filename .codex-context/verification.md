# 验证

## 已运行命令
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 64/64 tests passed；覆盖 Stop hook 新协议、PreCompact 旧协议、bootstrap 资产、health check、release 相关回归。
  - Date: 2026-07-01 本地时间。
- `旧项目 Stop payload | node .codex\hooks\project-ops.mjs`
  - Result: pass
  - Evidence: Dong Skills 修复后的源模板对真实旧项目 payload 输出 `{"decision":"block","reason":"..."}`，不再输出旧的 `continue:false/stopReason/systemMessage/hookSpecificOutput`。
  - Date: 2026-07-01 本地时间。
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: 清理状态文档中的本机绝对路径后重新运行；health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过。
  - Date: 2026-07-01 本地时间。
- `node .codex\hooks\project-ops.mjs health-check`
  - Result: pass
  - Evidence: Issues none；源文件和 bootstrap 资产同步无漂移。
  - Date: 2026-07-01 本地时间。
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warning。
  - Date: 2026-07-01 本地时间。
- `node --test tests\project-ops.test.mjs --test-name-pattern "Windows hook|published Windows hook|health check rejects Windows encoded"`
  - Result: pass
  - Evidence: Node test runner 实际执行该文件全部测试，64/64 tests passed。覆盖 Windows hook encoded command、`pwsh` 优先路径、fallback 和 health check 拒绝错误 hook。
  - Date: 2026-07-01 本地时间。
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 64/64 tests passed。
  - Date: 2026-07-01 本地时间。
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过。
  - Date: 2026-07-01 本地时间。
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warnings。
  - Date: 2026-07-01 本地时间。
- `node .codex\hooks\project-ops.mjs health-check`
  - Result: pass
  - Evidence: Issues none；hook/script/state/bootstrap parity 均无问题。
  - Date: 2026-07-01 本地时间。
- `git push origin main`
  - Result: pass
  - Evidence: `main` 从 `396dcc3` 推进到 `1a77fa9`。
  - Date: 2026-07-01 本地时间。

## 待运行命令
- 无。

## 产品证据
- 截图问题对应的旧输出已复现：目标项目旧 Stop hook 输出合法 JSON，但字段为 `{continue:false, stopReason, systemMessage, hookSpecificOutput}`，当前 Codex UI 报 `invalid stop hook JSON output`。
- 修复后 Stop 阻断输出为 `{decision:"block", reason:"..."}`，通过输出为空对象；`reason` 中保留 Hook status、Git root、workflow、discussion stale issues 等原有指导信息。
- `.codex/hooks.json` 的 `commandWindows` 外层 encoded script 包含 `Get-Command pwsh`、`& $pwsh.Source -NoProfile -EncodedCommand` 和 `} else {` fallback。
- bootstrap 镜像 `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json` 已同步同样 hook。
- `scripts/project-ops-health.mjs` 会在缺少 `pwsh` 优先路径或 fallback 时报告问题。

## 尚未验证
- 尚未在旧业务项目直接覆盖更新项目级 Dong Skills 并重新打开 UI 验证；当前验证的是 Dong Skills 源模板对同一 Stop payload 的输出格式。
