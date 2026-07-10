# Handoff 摘要

## 目标
完成 Dong Skills 四项复杂项目能力补强，并保持此前安装事务、共享 schema、外部 skill 吸收和领域并行测试成果。

## 最新用户指令
优化 Artifact Readiness 机器门禁、恢复 evaluator、Goal loop review 和真实 skill forward-eval。

## 已批准范围 / 规格
- `requirements-only` 或否定 readiness 不得进入 execution。
- 恢复 evaluator 必须覆盖任务、文件指针、决策、风险、下一步、验证和 Active Wayfinder。
- Goal mode 必须经过 loop-design review；Traditional mode 记录 not-required。
- forward-eval 必须支持外部执行器、独立输出文件、required/forbidden、held-out 和 backend fail-closed。
- 不引入第三方依赖、付费模型默认调用、自动提交或推送。

## 计划状态
Task 1-5、独立 review 修复、Codex CLI backend 验证和最终 release check 全部完成；执行模式为 Traditional task-by-task execution，checkpoint 按用户要求 deferred。

## 已修改文件
见 `.codex-context/artifact-index.md`。本轮核心新增为 recovery evaluator、skill-forward-eval、4-case 场景和场景协议文档。

## 已读取但未修改文件
- 全局安装 receipt 与三个入口 skill 安装副本。
- 独立 agent forward 输出，仅用于 ignored raw 评测。

## 已做决策
- readiness 和 loop review 解析先判否定表达，再判正向表达。
- legacy Traditional 缺少 `loop_review_status` 时归一化为 `not-required`；Goal 仍 fail closed。
- Active Wayfinder 存在但为空属于恢复失败。
- forward backend 请求不包含 judge 条件；每个 raw output 先独立落盘。
- forward 场景断言可观察行为与语义 alternatives，不要求回答必须复述单一状态枚举；停止执行、计划要素和禁止直接实现仍是硬条件。
- 共享 schema 测试使用 `planning` fixture 隔离枚举来源，保留 `complete -> next_skill: none` 一致性门禁。
- 全局同步使用临时项目目标，避免安装器触碰源码仓状态文件。

## 开放问题与假设
- 未模拟 rollback 恢复过程中的断电和超大项目临时磁盘压力。

## 风险
- substring judge 仍依赖场景作者提供语义等价 alternatives；本轮已增加 bundled scenario 回归，但新场景仍需人工审阅词面覆盖。
- 真实 Codex CLI backend 依赖可访问 `chatgpt.com` 的网络链路；本机需启用 FlClash，CLI 进程测试使用 `127.0.0.1:7890` 代理。
- bootstrap-runtime shard 约 64 秒，仍是完整套件瓶颈。
- workflow/recovery runtime 文件移动时，health 和 installed resolver 必须同步。

## 验证证据
- 完整领域测试：106/106，8 domains，67.1 秒。
- 真实 forward-eval：独立 agent 4/4；修复后的真实 Codex CLI backend 直接重跑 4/4，2 train + 2 held-out。
- source health、root/bootstrap parity：pass。
- 全局 source receipt、manifest SHA256、三个入口文件集/哈希、真实 bootstrap 和 installed health：pass。
- 最终 release check：pass，包含 106 domain tests 和全部发布门禁。
- workflow completion：pass，`NEXT: done`。

## Git 存档
- 最新提交: 本轮 checkpoint 待创建；父提交为 `056033924edbae7a5c2470f5858bae613f874335`。
- 推送状态: 未推送；用户仅授权本地提交。
- 已包含文件: 计划包含本轮全部源码、skills、测试、文档和状态修改。
- 有意保留未提交的文件: checkpoint 后仅允许 Git 存档与 workflow checkpoint 状态的 finalize tail。
- 暂缓原因: push 未获授权。
- 下次存档: 新增经过验证的源码、测试或正式文档变化后。

## 下一步动作
创建本地 checkpoint commit；提交后刷新 Git 存档尾注，不推送远端。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/verification.md`
3. `.codex-context/plan-progress.md`
4. `.codex/scripts/lib/workflow.mjs`
5. `.codex/scripts/lib/recovery-eval.mjs`
6. `scripts/skill-forward-eval.mjs`
7. `evals/skill-forward/README.md`
8. `tests/domains/core.test.mjs`
9. `tests/domains/workflow-hooks.test.mjs`
10. `tests/domains/memory-evolution.test.mjs`
