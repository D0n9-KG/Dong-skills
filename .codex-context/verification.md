# 验证

## 已运行命令
- `$PSVersionTable.PSVersion.ToString()`
  - Result: pass
  - Evidence: 当前 shell 为 PowerShell 7.6.3。
  - Date: 2026-07-01 23:08 本地时间
- `pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString(); $PSHOME; [Console]::OutputEncoding.WebName'`
  - Result: pass
  - Evidence: `pwsh` 可用，版本 7.6.3，输出编码为 UTF-8。
  - Date: 2026-07-01 23:08 本地时间
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 65/65 tests passed；新增 release check 优先 `pwsh` 回归测试通过，既有 Windows hook encoded command / fallback 测试继续通过。
  - Date: 2026-07-01 23:08 本地时间
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过；PowerShell parse checks 显示 `via pwsh`。
  - Date: 2026-07-01 23:08 本地时间
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warning。
  - Date: 2026-07-01 23:08 本地时间

## 产品证据
- `.codex/hooks.json` 的 Windows hook 命令已经包含 `Get-Command pwsh`、`& $pwsh.Source -NoProfile -EncodedCommand` 和 `powershell.exe` fallback。
- release check 不再固定用 `powershell.exe` parse `.ps1`，本机验证中实际使用 `pwsh`。

## 尚未验证
- 尚未重新安装全局 Dong Skills 副本并比对全局资产；下一步执行安装同步。