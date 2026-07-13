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
- installer Preview/Apply 已运行；下游 distribution 为 `abad207552c0f259b0b2f113032a03dbf9c2aef236b08842d0d1cada395454f1`。
- installer 前后六个核心 context 文件 SHA256 全部一致；下游 static health/runtime parity、workflow migrate/status、recovery、next、asset-governance 与 context-budget 通过。
- 新 runtime 的 live host coverage 尚待 Codex 重启并重新启用/trust hooks。

## 审查

- Task 8 已完成。
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
- 源码 checkpoint 已创建：`db9e3c93cdb38b5750db6377c7c12fa9a2308680 fix(hooks): remove prompt semantic authority`，未 push。
- Task 9 live 回归发现的复合只读 literal assignment 误判已修复；workflow 已通过 `debugging-resolved` 返回 `execution`。
- 修复不按 `$files` 或具体措辞白名单：只识别简单局部变量和无插值字面量标量/数组；unsafe assignment 继续 gated。
- external root 的 Git checkpoint 缺口也已修复：仅允许显式外部 `workdir` 的 repo-local Git allowlist，拒绝 `-C`/git-dir/work-tree 重定向和未知子命令。
- 新鲜验证：host-wrapper 5/5、全部 domains 241/241、`release-check` pass、runtime/bootstrap parity pass；两轮控制面修改后均重新全量验证。
- 当前下一步：用户临时关闭当前已加载的旧 hooks，checkpoint 本轮修复并重新安装；重启后重复原始 live 命令、external Git 与连续 Stop/freshness。

## 最后更新

2026-07-13。
