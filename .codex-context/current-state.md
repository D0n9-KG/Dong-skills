# 当前状态

## 目标
优化 Dong Skills 在 Windows 下的 PowerShell 7 / `pwsh` 使用策略，降低中文编码乱码风险，并让 release check 的 PowerShell 解析检查优先使用 `pwsh`。

## 最新用户指令
用户要求更新 Dong Skills，使 hooks / 脚本更合理地使用 PowerShell 7，避免旧版 Windows PowerShell 5.1 导致中文编码和显示问题。

## 当前阶段
delivery

## 当前假设
- 本机已安装 PowerShell 7，`pwsh` 当前可用，版本为 7.6.3。
- Codex 当前 shell 已是 PowerShell 7，但项目发布资产仍应保留 `powershell.exe` fallback，兼容未安装 PowerShell 7 的机器。
- `.codex/hooks.json` 当前已经是外层兼容 `powershell.exe`、内部优先委派 `pwsh` 的结构；本轮主要遗漏是 release check 仍固定用 `powershell.exe` 做 `.ps1` parse check。

## 阻塞项
- 无。

## 下一步动作
提交并推送本轮 release check 优先 `pwsh` 的修复；随后同步本机全局 Dong Skills 安装副本。

## 最后更新
2026-07-01 23:08 本地时间。