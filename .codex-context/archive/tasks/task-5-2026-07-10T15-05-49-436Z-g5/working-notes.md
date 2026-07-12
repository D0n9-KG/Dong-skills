# Working Notes

## Purpose
记录 hooks 控制面、复杂项目工作流与 GPT 5.6 SOL 适配审查的已验证事实、排除路径和下一步验证；不保存隐藏思维链、原始聊天、密钥或完整日志。

## Current Findings
- 已确认并修复 receipt/fingerprint、连续 mutation 合并、未知执行结果、只读 shell 误判、PowerShell alias 漏判、opaque shell 前置绕过、未知工具后置漏记和探索债务文档漂移。
- 独立审查提出的 scope 缩减重开、verification build 生成物、缺 `tool_use_id` fail-closed 经主线核实后保留为有意边界。
- 普通探索、多智能体结果表达和 scoped review/verification fix 不再被旧模板或额外 transition 强制打断。

## Current Hypothesis
- 当前 hard gates 已集中在真实风险边界；剩余无法静态判定的任意 shell/MCP 行为由 Git 前后证据和 Stop 闭环补足。

## Current Conclusion
- 本轮确认问题已修复并通过 204 项完整领域测试、release check 和最终 104 项 hooks/workflow 复验。
- 未发现仍会系统性阻碍复杂项目推进的 P0/P1；hooks 仍不是完整安全沙箱。

## Rejected Paths
- 不引入第二套多智能体调度器。
- 不把 Goal mode 绑定到固定工具名。
- 不要求子 agent 结果必须使用固定标题模板。
- 不把所有 shell 都永久禁用；保留只读、治理写入和 Git/status 后置收口。
- 不自动 commit/push。

## Open Investigation Questions
- 用户是否确认提交、推送并同步全局/旧项目安装。

## Next Verification Step
刷新 workflow context hash 后运行最终 health、parity、diff check 和 Git 状态检查。

## Promotion Notes
- 2026-07-11: hooks wrapper regression 修复完成；204/204 domain tests、104/104 hooks/workflow、release check、health、installer preview、parity 和 diff check 通过。

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
