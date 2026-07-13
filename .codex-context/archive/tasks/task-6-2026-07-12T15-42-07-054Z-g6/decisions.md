# 决策

## Task Identity
- task_id: task-6-2026-07-12T15-42-07-054Z
- task_generation: 6

## 已接受
- `.codex-context/raw` 不再享受 agent 命令的治理修复豁免；正常状态文档修复能力保留。
- freshness 判定和诊断详情必须使用同一文件集合和 mtime 事实源。
- mutation receipt 中仍参与当前 change-state 的文件不能从诊断中隐藏。

## 已拒绝
- 不把所有 `.codex-context/**` 写入都改成普通业务 mutation；这会破坏状态修复路径。
- 不通过忽略 receipt 文件来消除 stale；这会掩盖真实未外化变更。
