# Dong Skills 宿主稳定性规格

## Task Identity
- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## 问题

真实 Codex Desktop 宿主暴露出四类 wrapper regression：

1. 旧 scoped recovery receipt 会阻断新鲜 unscoped recovery；同时 unscoped receipt 可被多个 session 复用。
2. 简单 PowerShell 只读 pipeline 与部分 Git 诊断被判为 opaque；外部仓库操作被当前项目 workflow 错误门禁。
3. `apply_patch` 的宿主成功响应可能是空对象 `{}`，PostToolUse 因缺少显式 success 字段而丢失已发生的状态 refresh。
4. `UserPromptSubmit` 使用自然语言正则猜测 status、Dong Skills-only、scope change、批准与拒绝，并把猜测结果升级为 decision receipt、mutation gate 和 Stop/PreCompact 硬债；live paraphrase 已反复证明该机制不可穷举。

## 目标

- R1：fresh unscoped recovery 通过 task、generation、handoff 与 runtime 校验后，只能被第一个 session 原子认领并转换为 scoped receipt。
- R2：stale scoped receipt 不得阻止同一 session 重新 recovery；其他 session 不得复用已认领 receipt。
- R3：简单、无可执行表达式的 PowerShell 展示型 pipeline 和只读 Git 诊断应保持可用。
- R4：带 scriptblock、`$()`、调用符、写入、删除或未知执行的 pipeline 仍受门禁。
- R5：明确位于项目根之外的 patch、workdir 或绝对脚本路径，不得套用当前项目 phase/approval，也不得污染当前项目 change-state。
- R6：PostToolUse 空/未知响应只要没有显式失败，应以内容 hash 判断 refresh；显式失败不得获得 refresh credit。
- R7：根 runtime 与 onboarding bootstrap 镜像一致，安装器可安全更新旧项目。
- R8：非结构化用户 prompt 不得单独授权 transition、重开 scope、阻塞 mutation、Stop 或 PreCompact。
- R9：审批与关键决定只由 canonical 结构化字段、task identity、phase 和文档 hash 提供确定性证据。
- R10：修复完成后对完整 Dong Skills 做 agent-architecture audit，并关闭所有高严重度 finding。

## 审批状态

Approved by user on 2026-07-13。用户在查看 Final Spec Gate 结果后明确回复“可以”。

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
- 不声称 hooks 能从任意自然语言中可靠推断批准、拒绝、范围变化或任务意图。
- 不要求用户为了正常批准和继续工作记忆专用 token 或命令。

## 已批准范围

- `.codex/scripts/lib/{runtime,events,workflow,markdown}.mjs` 中与 prompt authority、decision evidence、discussion marker、Stop/PreCompact 和状态一致性直接相关的最小改动。
- onboarding bootstrap 中对应 runtime 镜像。
- `tests/domains/{workflow-governance,workflow-hooks,host-wrapper}.test.mjs` 及必要的 agent-architecture audit fixture。
- governance skill、AGENTS snippet、installer、health、release-check 和下游项目回归所需状态文档。
- 不修改与本问题无关的业务项目代码、实验数据或 Dong Skills 功能模块。

## 用户决策

- 2026-07-13：由当前 session 直接修复源 Dong Skills，并自行完成充分测试。
- 执行模式：plan-then-execute；Traditional task-by-task execution。
- 2026-07-13：除简单、确定性的语法识别外，不使用自然语言正则冒充复杂语义判断；Dong Skills 必须辅助 Codex，而不是用模糊分类限制工作。

## 架构选择

- 已选择方案 B：非结构化 `UserPromptSubmit` 只提供 advisory/恢复线索，不产生审批、范围重开或 Stop/PreCompact 硬债；workflow transition 只依据 canonical 文档中的精确结构化字段、task identity 和内容 hash。
- 已拒绝继续扩充自然语言正则词表：live paraphrase 已证明该路径不可穷举。
- 已拒绝强制用户输入专用 decision token：它会把正常对话变成控制台操作并增加流程负担。

## 设计

- Recovery 使用已有 runtime lock，实现 unscoped receipt 的单次 claim/promotion；claim 后消费 unscoped。
- Shell classifier 只扩展到无 `{}`、`$()`、调用符和重定向的简单展示型 cmdlet。
- 外部作用域以显式 patch target、top-level/payload workdir 或命令内绝对路径为证据；混入当前 root 时不豁免。
- PostToolUse 以 `toolExecutionStatus.known` 区分 unknown 与 explicit failure，并继续以内容 hash 作为 refresh 事实源。

## 修订设计

- 删除非结构化用户文本对权限控制面的权威作用：不再由 prompt regex 自动生成 decision receipt、执行审批、spec skip、scope-change hard gate 或 discussion freshness hard debt。
- `UserPromptSubmit` 可保留 redacted advisory snapshot、learning candidate 和 complete-phase 的新任务提醒，但这些记录不得单独阻塞 Stop、PreCompact 或项目 mutation。
- 审批和决策由 assistant 在用户明确决定后写入 canonical 文档的精确结构化字段；workflow transition 验证字段值、task identity、文档 hash 与 phase，不解释任意自然语言。
- Stop/PreCompact 的硬阻塞事实仅来自：无效 workflow/task identity、真实 Git/project mutation、缺失的必要验证或 checkpoint、严重 asset issue、恢复 receipt 与确定性危险操作。
- malformed advisory discussion marker 只告警并可安全清理，不成为业务交付 blocker。
- shell/文件门禁继续使用确定性语法解析；删除、写入、重定向、scriptblock、子表达式和未知执行不得因本修订放宽。

## 验收标准

- AC1：recovery 新增测试和既有 session isolation 测试通过。
- AC2：host-wrapper 测试覆盖 pipeline 安全正反例、外部作用域、空响应与显式失败。
- AC3：`workflow-hooks.test.mjs`、所有 domain tests、`release-check` 全部通过。
- AC4：关键测试连续运行至少 3 次无漂移、无残留 transaction/staging/backup。
- AC5：installer Preview/Apply 更新 `scientific_Graph` 后 context 事实不被覆盖，receipt/hash/parity 正常。
- AC6：下游真实脚本级/宿主级 recovery、pipeline、PostToolUse refresh、连续 Stop 与 hash 后 Stop 通过。
- AC7：架构与对抗审查无未解决高严重度问题。
- AC8：任意状态复核、hook 开关、Dong Skills 维护和普通讨论 paraphrase 都不能仅凭 prompt marker 阻塞 Stop/PreCompact。
- AC9：没有 canonical 结构化审批证据时，`spec-approved`、execution approval、verification-gap acceptance 等 transition 仍被拒绝；写入匹配 task/hash 的精确证据后可通过，全程不解释用户自然语言。
- AC10：执行期普通 prompt 不自动重开 scope；当 assistant 按用户要求更新 spec/plan 后，旧审批 hash 失效并由现有一致性检查阻止继续执行。
- AC11：真实 mutation freshness、recovery、危险命令和 workflow consistency 的既有安全负例继续通过。
- AC12：根治后完成全量 Dong Skills agent-architecture audit，并处理所有高严重度 wrapper regression、memory contamination、hidden loop 与 persistence drift finding。

## 开放问题

- 无。

## 下一步

进入 `writing-plans`，重写执行计划；计划获得执行模式批准后，再实现、全量验证、安装、live Stop 回归和整体 Dong Skills 架构审计。
