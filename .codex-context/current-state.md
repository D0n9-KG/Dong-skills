# 当前状态

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 目标
将 Dong Skills 收敛为适配强 agentic model 的最小 hook 内核，并在不覆盖下游项目事实的前提下完成安装与 live 回归。

## 最新用户指令
继续完成 Dong Skills 减负与稳定性验证；只有基础设施稳定后才恢复 AAAI 研究。

## 当前阶段
execution，Task 5 installer workflow migration 修复验证。

## 当前结论
- 仅保留 `SessionStart`、`PreToolUse`、`PreCompact`、`Stop` 四个 hooks。
- `Stop` advisory-only；`PreCompact` 不改 handoff，仅覆盖一个不超过 64 KiB 的 raw snapshot。
- `PreToolUse` 以可确定 mutation target 为边界；外部、网络、浏览器、诊断和未知操作默认 fail-open。
- 当前源码 focused 64/64、full domains 160/160、`release-check` 已通过；最终 closure review 无 Critical/High，两轮独立审查发现的可复现问题均已修复。
- `scientific_Graph` 已 Apply distribution `b329b29e...` 且六文件哈希保持不变。
- `sci-evo-extract` Apply 在 workflow migration 阶段回滚；根因是同一次 `legacy-v0 -> normalized-v1 -> approval-contract-v2` 迁移的第二阶段错误优先读取旧 raw plan hash，CRLF 且未提交的合法状态被误判为审批漂移。该根因已用最小测试先红后修复，targeted 1/1、core 26/26 通过。

## 阻塞项
- 无。

## 下一步动作
运行 full/release；通过后创建修复 checkpoint，再重试 `sci-evo-extract` Apply。

## 最后更新
2026-07-14：source checkpoint `35c7aa8` 已创建；Task 5 暴露 legacy CRLF plan hash migration bug，进入 systematic debugging。
