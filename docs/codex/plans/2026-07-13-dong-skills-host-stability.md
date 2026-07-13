# Dong Skills 宿主稳定性实施计划

**目标:** 关闭 recovery、shell classifier、跨项目作用域和 PostToolUse refresh 的真实宿主回归。
**规格:** `.codex-context/spec.md`。
**规格审批:** Approved by user on 2026-07-13。
**Artifact Readiness:** implementation-ready。
**工作类别 / 风险等级:** Lane 3。
**执行模式:** Traditional task-by-task execution。
**验证:** domain tests、release-check、installer 与下游真实回归。
**执行审批:** plan-then-execute requested。

## 执行模式

- Traditional task-by-task execution。
- Loop Review: not-required。

## Simplicity Gate

- 复用现有 runtime lock、receipt、hash 和 shell parser。
- 不新增依赖、守护进程、状态机或通用 shell parser。

## 验收映射

- R1/R2 -> recovery tests -> workflow-hooks targeted/full。
- R3/R4 -> host-wrapper pipeline 正反例。
- R5 -> host-wrapper external patch/workdir/absolute command。
- R6 -> host-wrapper empty response / explicit failure。
- R7 -> mirror hash、release-check、installer 和 downstream health。

## 测试场景

- Happy path：fresh recovery 单次认领；简单 read pipeline；空响应 hash refresh。
- Regression：既有 session isolation、raw 写入、Stop freshness。
- Error/edge：stale scoped、第二 session、恶意 scriptblock、显式失败、混入当前 root。
- Non-goal：opaque/destructive 命令仍被拒绝。

## 任务

- [x] Recovery：红灯、single claim 实现、相邻隔离测试。
- [x] Host wrapper：pipeline、external scope、empty response 测试与实现。
- [ ] 全量测试与 3 轮关键重复。
- [ ] 架构/安全审查。
- [ ] installer 与下游项目回归。
- [ ] checkpoint 与 handoff。

## 执行备注

- 优先读取：`runtime.mjs`、`events.mjs`、`workflow-hooks.test.mjs`、`host-wrapper.test.mjs`。
- 不要触碰：研究项目业务代码、实验数据、密钥。
- 回滚：源仓库 Git commit；installer 事务回滚；当前项目临时 bootstrap 最终由 installer 覆盖。
