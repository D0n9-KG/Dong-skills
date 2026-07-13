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

- Tasks 1-8 已完成；Task 9 首次 live 暴露 literal assignment 与 external Git workdir 两个误判，现已完成根因修复和两轮全量回归，等待关闭旧 hooks、checkpoint、重新安装与再次 live。
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
- 首次 installer/static 证据仍有效；两次 classifier 修复后均重新取得 241/241 与 release-check pass，需重新安装后取得新的 live coverage。

## Git Checkpoint

- 最新提交：`db9e3c93cdb38b5750db6377c7c12fa9a2308680 fix(hooks): remove prompt semantic authority`。
- 推送状态：not-run；用户未要求 push。
- 已包含文件：Tasks 1-8 runtime、bootstrap、skills、tests、spec/plan/review 与验证状态。
- 有意保留未提交的文件：literal assignment classifier、正反例测试和 Task 9 调试/验证状态。
- 暂缓原因：正在创建本轮修复 checkpoint；不 push。
- 下次存档：当前修复先独立 checkpoint；最终 live 回归后再记录 Task 9 closure。

## 下一步动作

1. 用户临时关闭当前项目 hooks。
2. checkpoint literal assignment 与 external Git scope 修复，不 push。
3. installer Preview/Apply 更新下游并保持 context hash。
4. 用户重启 Codex，重新启用/trust hooks。
5. 重复原始复合读取、external Git、critical coverage 与连续 Stop freshness。
6. live 通过后完成 Task 9 并返回科研 Wayfinder。

## 优先重读文件

1. `.codex-context/plan-progress.md`
2. `.codex-context/verification.md`
3. `docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`
4. `.codex/scripts/lib/{events,workflow}.mjs`
5. `tests/domains/{workflow-hooks,workflow-governance}.test.mjs`
