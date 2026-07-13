# Dong Skills 宿主稳定性规格

## Task Identity
- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## 问题

真实 Codex Desktop 宿主暴露出三类 wrapper regression：

1. 旧 scoped recovery receipt 会阻断新鲜 unscoped recovery；同时 unscoped receipt 可被多个 session 复用。
2. 简单 PowerShell 只读 pipeline 与部分 Git 诊断被判为 opaque；外部仓库操作被当前项目 workflow 错误门禁。
3. `apply_patch` 的宿主成功响应可能是空对象 `{}`，PostToolUse 因缺少显式 success 字段而丢失已发生的状态 refresh。

## 目标

- R1：fresh unscoped recovery 通过 task、generation、handoff 与 runtime 校验后，只能被第一个 session 原子认领并转换为 scoped receipt。
- R2：stale scoped receipt 不得阻止同一 session 重新 recovery；其他 session 不得复用已认领 receipt。
- R3：简单、无可执行表达式的 PowerShell 展示型 pipeline 和只读 Git 诊断应保持可用。
- R4：带 scriptblock、`$()`、调用符、写入、删除或未知执行的 pipeline 仍受门禁。
- R5：明确位于项目根之外的 patch、workdir 或绝对脚本路径，不得套用当前项目 phase/approval，也不得污染当前项目 change-state。
- R6：PostToolUse 空/未知响应只要没有显式失败，应以内容 hash 判断 refresh；显式失败不得获得 refresh credit。
- R7：根 runtime 与 onboarding bootstrap 镜像一致，安装器可安全更新旧项目。

## 审批状态

Approved by user on 2026-07-13。用户明确要求直接维护本机真实 Dong Skills 源码，自主修复并测试到没有已知问题，不再往返中转。

## 事实优先级

- 最新用户指令。
- 真实 Codex host 复现与自动化测试。
- 源码、runtime receipts、Git 和 installer 证据。
- 当前规格和计划。
- 旧 handoff 或历史验证。

## 工作类别 / 风险等级

- Lane 3：涉及 recovery session isolation、PreToolUse 权限边界、PostToolUse freshness 与项目作用域。

## 非目标

- 不把 hooks 宣称为完整安全 sandbox。
- 不允许任意 PowerShell scriptblock 伪装成只读 pipeline。
- 不削弱当前项目内的 phase、approval、destructive mutation 和 recovery 门禁。
- 不修改 `scientific_Graph` 研究业务代码或实验数据。
- 不新增依赖或第二套状态机。

## 已批准范围

- `.codex/scripts/lib/{runtime,events}.mjs`。
- onboarding bootstrap 中对应 runtime 镜像。
- `tests/domains/workflow-hooks.test.mjs`。
- 新增独立宿主回归测试域。
- installer、health、release-check 和下游项目回归所需状态文档。

## 用户决策

- 2026-07-13：由当前 session 直接修复源 Dong Skills，并自行完成充分测试。
- 执行模式：plan-then-execute；Traditional task-by-task execution。

## 设计

- Recovery 使用已有 runtime lock，实现 unscoped receipt 的单次 claim/promotion；claim 后消费 unscoped。
- Shell classifier 只扩展到无 `{}`、`$()`、调用符和重定向的简单展示型 cmdlet。
- 外部作用域以显式 patch target、top-level/payload workdir 或命令内绝对路径为证据；混入当前 root 时不豁免。
- PostToolUse 以 `toolExecutionStatus.known` 区分 unknown 与 explicit failure，并继续以内容 hash 作为 refresh 事实源。

## 验收标准

- AC1：recovery 新增测试和既有 session isolation 测试通过。
- AC2：host-wrapper 测试覆盖 pipeline 安全正反例、外部作用域、空响应与显式失败。
- AC3：`workflow-hooks.test.mjs`、所有 domain tests、`release-check` 全部通过。
- AC4：关键测试连续运行至少 3 次无漂移、无残留 transaction/staging/backup。
- AC5：installer Preview/Apply 更新 `scientific_Graph` 后 context 事实不被覆盖，receipt/hash/parity 正常。
- AC6：下游真实脚本级/宿主级 recovery、pipeline、PostToolUse refresh、连续 Stop 与 hash 后 Stop 通过。
- AC7：架构与对抗审查无未解决高严重度问题。

## 开放问题

- 真实宿主 hooks 重新加载新版 runtime 需要用户重启或重新 trust；静态与脚本级验证可先完成。

## 下一步

按已批准计划继续实现、全量验证、review、安装与下游回归。
