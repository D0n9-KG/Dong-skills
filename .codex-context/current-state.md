# 当前状态

## Task Identity
- task_id: task-6-2026-07-12T15-42-07-054Z
- task_generation: 6

## 目标
修复 Dong Skills 的两个源头问题：`raw` 写入绕过 recovery，以及 Stop/checkpoint freshness 判定与提示依据不一致。

## 最新用户指令
用户确认仍有两个源头问题，要求继续修复安全口径和 freshness 口径。

## 当前阶段
实现、发布级验证、review、提交和推送已完成，正在同步全局安装。

## 当前假设
- `raw` 应保留为日志/运行时资产目录，但不应成为 agent shell 写入的治理修复后门。
- mutation receipt 中仍有效的文件必须进入 freshness 判定；关键是判定与详情使用同一集合，而不是隐藏该依据。

## 当前结果
- `.codex-context/raw` 已退出治理修复豁免，未 recovery 的复合重定向写入会被拒绝。
- 新增 `latestChangedInfo`，checkpoint stale 结论、责任文件和 mtime 使用同一 freshness 集合。
- 已刷新 handoff 的 hash receipt 仍可关闭 change-state，不会制造第二轮 Stop freshness。
- 根运行时和 bootstrap 镜像一致。
- workflow-hooks 97/97、release-check 均通过。

## 阻塞项
- 无。

## 下一步动作
同步本机全局 Dong Skills，并告知旧项目重新 bootstrap。

## 最后更新
2026-07-12。
