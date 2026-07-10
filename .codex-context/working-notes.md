# Working Notes

## Purpose
记录紧凑、可恢复的调查事实，不保存隐藏推理、完整聊天、原始日志、密钥或私人信息。

## Current Findings
- `requirements-only` 已在 workflow transition、execution check 和 health 中 fail closed。
- legacy Traditional 状态缺少 `loop_review_status` 时归一化为 `not-required`；Goal 状态仍要求 approved。
- SessionStart 已注入受限 Active Wayfinder 摘要，独立 forward 场景促使恢复 skill 明确 handoff-first。
- forward-eval 的 backend 请求不包含 expected/required/forbidden，原始输出先落盘再独立判定。
- Codex CLI 已恢复到 `0.144.1`；启用 FlClash 后，真实 backend 可访问 ChatGPT 并完成 4/4 forward-eval。
- 真实 CLI 首轮输出正确停止编码并补全计划，但 `requirements-only-plan` 因精确词面断言产生假阴性；场景已改为行为门禁与语义 alternatives，并增加 bundled scenario 回归。
- release 隐私扫描已区分代码变量/函数引用与真实字面量 secret，junction 场景不再崩溃。
- 独立 reviewer 发现的 negated readiness、negated Loop Review 和 empty Wayfinder 三个 P1 已修复并通过反例测试。

## Current Hypothesis
四项补强已形成 runtime、skill、bootstrap、health、测试、独立 agent 和真实 Codex CLI 行为证据的闭环。

## Rejected Paths
- 仅增加 skill 文字而不增加机器门禁。
- 把付费模型调用加入默认 release check。
- 为通过真实 forward 场景而删除 handoff-first 要求。
- 为通过 forward 场景而削弱生产 `implementation-ready` 门禁；实际只修正了评测词面。
- 让共享 schema 测试继续复制 `phase: complete` 后覆盖任意 next skill；改用 planning fixture 隔离测试目标。
- 用测试豁免掩盖 privacy scan 假阳性。

## Open Investigation Questions
- 无当前阻塞问题。
- 未模拟 rollback 恢复过程中的断电和超大 `.codex-context` 临时磁盘压力。

## Next Verification Step
最终 health、workflow、diff 和进程残留检查；之后等待用户审阅。

## Promotion Notes
本轮持久结论已提升到 spec、plan、artifact index、verification、current state 和 handoff；workflow 已 complete。
