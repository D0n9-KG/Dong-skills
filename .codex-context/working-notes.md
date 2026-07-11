# Working Notes

## Purpose
记录 hooks 控制面、复杂项目工作流与 GPT 5.6 SOL 适配审查的已验证事实、排除路径和下一步验证；不保存隐藏思维链、原始聊天、密钥或完整日志。

## Current Findings
- Task 1-10 已完成并验证；完整领域测试 195/195 通过，health/release/diff/install 均通过。
- GPT 5.6 SOL 适配已完成：subagent summary 从固定标题改为语义合同；Goal mode 从具体工具名改为真实 goal/workflow 机制；Wayfinder 支持 bounded parallel exploration。
- 本轮适配没有削弱事实源、审批、恢复、验证、review 或 destructive/action hard gates。

## Current Hypothesis
- 当前 Dong Skills 已足够支撑较复杂项目主路径；继续增加机制的收益低于复杂度成本，除非后续真实项目暴露新反例。

## Current Conclusion
- 可投入使用；Dong Skills 当前应作为辅助层，而不是替代 GPT 5.6 的多智能体或工作流能力。
- 旧项目需要重新 bootstrap 才能获得项目级最新 hooks/runtime。

## Rejected Paths
- 不引入第二套多智能体调度器。
- 不把 Goal mode 绑定到固定工具名。
- 不要求子 agent 结果必须使用固定标题模板。
- 不把所有 shell 都永久禁用；保留只读、治理写入和 Git/status 后置收口。
- 不自动 commit/push。

## Open Investigation Questions
- 是否现在提交并推送本轮变更。

## Next Verification Step
提交前再跑 `git status --short` 和必要的轻量 health；如用户要求发布，再执行 commit/push。

## Promotion Notes
- 2026-07-11: GPT 5.6 SOL 适配完成并验证；完整领域测试 195/195，release check、health、diff check、installer preview、真实安装均通过。

## 用途
记录需要跨压缩保留的紧凑外部化调查状态。不要在这里保存隐藏思维链、完整聊天记录、原始日志、密钥或私密推理。


## 当前发现
- 暂无。


## 当前假设
- 暂无。


## 已排除路径
- 暂无。


## 开放调查问题
- 暂无。


## 下一步验证
- 暂无。


## 提升记录
- 在阶段边界，把持久结论提升到 spec.md、decisions.md、current-state.md、handoff-summary.md 或 docs/solutions/。

