# Dong Skills 复杂项目能力补强规格

## 问题
当前 Dong Skills 已可辅助复杂项目，但四个关键能力仍主要依赖 skill 自律：`requirements-only` 计划可通过机器执行检查；恢复质量无可执行 probe；Goal mode 未强制 loop review；skill tests 主要验证文本合同而非真实模型行为。

## 目标
- `requirements-only` 或缺失 Artifact Readiness 的新计划无法进入 execution。
- 提供可执行 context recovery evaluator，并在 SessionStart 恢复 active Wayfinder 摘要。
- Goal mode 在 loop review 未批准时无法进入 execution。
- 建立可插拔的真实 skill forward-eval harness、场景格式和独立结果验证。

## 审批状态
Approved by user on 2026-07-10.

## 事实优先级
1. 最新用户指令。
2. 源码、真实临时项目行为和测试。
3. 本规格与实施计划。
4. 旧状态文档。

## 工作类别 / 风险等级
Lane 3：修改 workflow state machine、health、SessionStart recovery、project bootstrap runtime 和模型行为评测门禁。

## 已批准范围
- `.codex/scripts/lib/workflow.mjs`、recovery/CLI/hook runtime 与镜像。
- health、installer/bootstrap helper lists、manifest/receipt 和 tests。
- planning/execution/loop/context-budget/skill-evolution skills。
- 新增 recovery evaluator 与 skill forward-eval harness。

## 非目标
- 不依赖本机损坏的 `codex` 启动器作为唯一 forward-eval 后端。
- 不在 CI 中强制付费模型调用。
- 不引入第三方依赖、外部 issue tracker 或自动 merge/release。

## 验收标准
- plan-ready、execution approval、health 和 execution check 对 `requirements-only` fail closed。
- legacy plan 仅在显式迁移/确认后可标记 implementation-ready，不静默放行。
- recovery evaluator 能验证任务状态、文件指针、决策、风险、下一步、验证证据和 active Wayfinder。
- SessionStart 包含 active Wayfinder 的受限摘要而非只包含路径。
- Goal approval 需要 `loop_review_status=approved`，Traditional mode 标记 not-required。
- forward-eval harness 支持外部命令后端、独立输出文件、required/forbidden 断言和 held-out cases；后端不可用时明确失败。
- 定向测试、完整领域测试、release check、health 和真实安装同步通过。

## 开放问题
- 无阻塞问题。真实付费 Codex CLI 后端当前不可用，harness 必须支持其他独立执行器。

## 下一步
四个纵向切片已实现并验证，等待用户审阅当前未提交 diff。
