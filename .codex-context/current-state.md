# 当前状态

## 目标
优化 Dong Skills 在 Windows 上的 hook 和中文文件处理规则：hook 在可用时优先使用 PowerShell 7 / `pwsh`，降低中文 UTF-8 显示和读写风险，同时保留 Windows PowerShell 5.1 回退，避免旧机器或旧项目 hooks 直接失效。

## 最新用户指令
用户已经安装 PowerShell 7 并重启 Codex，确认当前 Codex shell 是 PowerShell 7；随后追问为什么 hooks 不全部切到 PowerShell 7，以及旧版是否仍会导致乱码，并要求继续优化 Dong Skills。

## 当前阶段
delivery

## 当前假设
- 发布版 hooks 不应硬依赖 `pwsh`，因为旧项目或其他机器可能没有 PowerShell 7。
- `commandWindows` 继续用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand` 作为外壳，内部检测 `Get-Command pwsh`，可用则委派到 `pwsh -NoProfile -EncodedCommand`，不可用则执行旧回退逻辑。
- 用户可读中文 Markdown 统一按 UTF-8 处理；Windows PowerShell 5.1 的 `Get-Content` 显示结果不能作为文件损坏证据。

## 阻塞项
- 无。

## 下一步动作
提交并推送 Dong Skills 更新；随后给出旧项目更新提示词。

## 最后更新
2026-07-01 15:29 本地时间。
