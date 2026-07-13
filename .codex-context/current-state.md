# 当前状态

## Task Identity

- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## 目标

根治自然语言 prompt 被升级为审批、scope、mutation、Stop/PreCompact 权限事实的问题，完成完整 Dong Skills 架构审计，并安装验证到 `scientific_Graph`。

## 当前结论

- `UserPromptSubmit` 对所有非空 prompt 只记录 redacted advisory，不生成 approval、spec skip、scope reopen、execution directive 或 freshness debt。
- stale、legacy dirty、malformed discussion marker 均不能单独阻塞 mutation、Stop 或 PreCompact。
- workflow transition 只接受 `Workflow Decision` 中的精确 schema、decision、transition、task identity 与 target hash。
- 新增 `workflow-state decision <transition>`：原子写入 canonical evidence，不自动执行 transition；PreToolUse 只放行与当前 pending decision 匹配的受控命令。
- decision transition 会消费 `Workflow Decision` section，并事务式更新 spec/execution 的结构化审批字段；错误证据或错误 event 保持拒绝。
- prompt semantic regex 的权限调用、legacy decision/advance receipt 写入与校验已删除；只保留旧 receipt 安全清理。
- root 与 onboarding bootstrap 的 hook/runtime/CLI/snippet 已同步；指导已改为 advisory prompt + canonical decision command。

## 验证结果

- 全部 domain runner：241/241 pass，12 domains。
- 关键 11 项稳定性循环：连续三轮 11/11 pass。
- `workflow-governance`：21/21 pass。
- `workflow-hooks`：106/106 pass。
- `core`：25/25 pass。
- `health-release`：23/23 pass。
- `host-wrapper`：5/5 pass。
- `skills-contracts`：2/2 pass。
- `node scripts/release-check.mjs .`：pass。
- `node scripts/release-check.mjs .` 在最终实现上重新运行并通过。
- installer 与下游 live host 尚未在本轮最终实现上运行。

## 审查

- Task 8 正在执行。
- 已修复 high：plan progress metadata 与 approval hash 自相矛盾，改为 `approval-contract-v2`。
- 已修复 high：health 复制 workflow consistency/hash 逻辑并发生漂移，改为复用 runtime `workflowConsistencyStatus`。
- 已修复 medium：`codex-learning-memory` 不再声称 learning review 可阻塞 Stop/PreCompact。
- 已修复 medium：runtime `preCompact` 不再把 learning review 聚合成 hard issue。
- 已修复 medium：SessionStart 不再重复注入 working notes、decisions、questions、worktree、plan、solution 与 instincts excerpts；业务 handoff sections 先于临时 PreCompact notice。
- 已修复 medium：root `AGENTS.md` managed block 与 canonical/bootstrap snippet 强制 parity。
- 完整审计报告：`docs/codex/reviews/2026-07-13-dong-skills-agent-architecture-audit.md`；无 unresolved High/Critical。

## 剩余动作

- Tasks 1-6 已完成并通过相关 workflow/core/host/skills domains。
- Task 7 已完成：全部 domain tests、关键路径连续三轮和 release-check 均通过。
- Task 8 已完成：12 个 agent architecture 边界已审查，accepted findings 已修复并通过全量回归。
- 当前下一步：创建源码 checkpoint，不 push；随后执行 Task 9 installer Preview/Apply 到下游，并做真实 recovery、compound diagnostics、PreToolUse/PostToolUse、连续 Stop 与 freshness 回归。

## 最后更新

2026-07-13。
