# 当前状态

## 目标
修复 Dong Skills Stop hook 与当前 Codex App 的返回协议不兼容问题，避免 UI 显示 `hook returned invalid stop hook JSON output`，并保证新项目 bootstrap 资产同步修复。

## 最新用户指令
用户发来 Codex UI 钩子摘要截图，询问 `hook returned invalid stop hook JSON output` 是否需要理会、是什么问题。

## 当前阶段
delivery

## 当前假设
- 目标旧项目的 Stop hook 能输出合法 JSON，但旧字段为 `{continue:false, stopReason, systemMessage, hookSpecificOutput}`。
- 当前 Codex App 对 Stop 阻断更适配 `{decision:"block", reason:"..."}`；旧字段会被 UI 判为 invalid stop hook JSON output。
- PreCompact / PostCompact 的返回协议暂不改动，因为本次截图和复现只指向 Stop hook。

## 阻塞项
- 无。

## 下一步动作
向用户说明根因、已修复的源头文件、验证结果，并提醒旧项目需要重新运行 Dong Skills 更新/bootstrap 且在 `/hooks` 里重新 trust。

## 最后更新
2026-07-01 16:25 本地时间。
