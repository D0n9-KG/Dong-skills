# Handoff 摘要

## 目标

- 根治 Dong Skills 将复杂自然语言正则升级为审批、scope、Stop/PreCompact 权限事实的问题；修复后整体审计并安装到 `scientific_Graph`。

## 最新用户指令

- 用户明确要求复杂任务不得用自然语言正则冒充语义判断。
- 用户已批准方案 B 及 written spec：非结构化 prompt advisory-only，硬门禁只信任 canonical 结构化证据与真实项目事实。
- 修复后必须整体检查 Dong Skills，而不是只验证当前一句话。
- 用户要求继续当前修复，不切换回下游研究任务。

## 已批准范围 / 规格

- Spec：`.codex-context/spec.md`，Approved by user，Lane 3。
- Plan：`docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`，implementation-ready，Traditional task-by-task execution 已批准。
- 允许 prompt authority、canonical decision evidence、discussion marker、Stop/PreCompact、tests、指导、installer 验证和完整 agent-architecture audit。
- 不修改下游研究业务代码、实验数据、文献资产或方法结论。

## 计划状态

- Tasks 1-8 已完成并通过最终全量验证；下一步是 source checkpoint 和 Task 9 下游安装/live 回归。
- 下游研究 workflow 保持 Wayfinder，不以刷新研究文档满足错误 hook debt。

## 已做决策

- recovery unscoped receipt 只允许单次 claim，promotion 失败 fail-closed。
- external scope 只信任可验证目标/命令，不凭单一外部路径无条件豁免。
- `{}` 以内容 hash 判定 refresh，显式失败/no-op 不计。
- tool/subagent-originated prompt 不得写 parent discussion、approval 或 learning。
- 非结构化 prompt 不再拥有审批、scope reopen、mutation、Stop 或 PreCompact 权限权威。
- canonical decision evidence 使用精确结构化字段、task identity 和 document hash；不解释任意自然语言。
- `workflow-state decision <transition>` 是唯一受控 evidence 写入入口；不自动 transition，错误 pending/event 被拒。
- decision transition 消费 evidence section，并事务式更新结构化审批状态。
- installer Apply 仍是高风险项目变更；本轮由用户明确关闭 hooks 完成，不增加无条件 self-update bypass。
- learning review、普通 asset advisories 和 prompt advisory 不得形成 Stop/PreCompact hard debt。
- SessionStart 只注入最小恢复热上下文，其余状态按 recovery order 读取。

## Files Modified

- `.codex/scripts/lib/{events,workflow,markdown,runtime,recovery}.mjs` 与 onboarding bootstrap 镜像。
- `.codex/hooks/project-ops.mjs`、`scripts/workflow-state.mjs` 与 bootstrap 镜像。
- workflow/project governance skills、AGENTS snippets、AGENTS.md、README.md。
- `tests/domains/{workflow-hooks,workflow-governance,core,skills-contracts,health-release}.test.mjs`。
- `docs/codex/reviews/2026-07-13-dong-skills-agent-architecture-audit.md`。
- Task 7 spec、plan、current-state、verification、artifact、decisions、working notes、handoff 与 workflow state。

## 验证证据

- workflow-governance 21/21、workflow-hooks 106/106、core 25/25、health-release 23/23、host-wrapper 5/5、skills-contracts 2/2。
- 全部 domain runner 241/241 pass；`release-check` pass。
- root/bootstrap runtime、health、CLI 与 AGENTS snippet parity pass。
- 12-boundary architecture audit 无 unresolved High/Critical。
- source health Issues none；旧 runtime liveness receipt 仅为 runtime-mismatch warning，且 health 明确不代表 host trust。
- asset-governance Blocking issues none；`git diff --check` pass。
- 本轮最终 installer/live 尚未执行。

## Git Checkpoint

- 最新提交：当前 HEAD；Tasks 1-8 verified source checkpoint 正在准备。
- 推送状态：not-run；用户未要求 push。
- 已包含文件：上一轮 host stability checkpoint。
- 有意保留未提交的文件：无意保留；本轮 verified source changes 应全部进入同一 checkpoint。
- 暂缓原因：无；提交后不 push。
- 下次存档：Task 9 下游 live 回归完成后记录安装证据。

## 下一步动作

1. 创建 Tasks 1-8 verified source checkpoint，不 push。
2. installer Preview/Apply 更新下游，并做 live recovery、compound diagnostics、PreToolUse/PostToolUse 与连续 Stop 回归。

## 优先重读文件

1. `.codex-context/plan-progress.md`
2. `.codex-context/verification.md`
3. `docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`
4. `.codex/scripts/lib/{events,workflow}.mjs`
5. `tests/domains/{workflow-hooks,workflow-governance}.test.mjs`
