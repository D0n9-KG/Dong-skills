# 计划进度

## 当前计划
补强计划就绪度、恢复评测、Goal loop review 和 skill forward-eval。

## 规格审批
Approved by user on 2026-07-10.

## 执行审批
Approved by user for Traditional task-by-task execution.

## Artifact Readiness
implementation-ready

## 工作类别 / 风险等级
Lane 3。

## 执行模式
Traditional task-by-task execution.

## Goal 模式目标
未选择 Goal mode。

## Loop Review
not-required。

## 运行约束
- 每项先增加失败测试或可重复场景。
- 根 runtime 与 bootstrap 镜像同步。
- 新状态字段采用 expand-contract；旧 Traditional 状态兼容，Goal 状态 fail closed。
- forward-eval 不把判定条件泄漏给执行后端。
- 不提交、不推送。

## 存档节奏
用户已授权创建本地 checkpoint commit；本轮不 push。

## 验收映射
- Artifact Readiness -> workflow transition、execution check、health 和 legacy Traditional 场景。
- Recovery evaluator/Wayfinder excerpt -> evaluator CLI、hook dispatch、SessionStart 和独立 forward 场景。
- Goal loop review -> transition、state consistency、health、executor 与 Traditional not-required 场景。
- Skill forward eval -> 外部命令协议、recorded outputs、独立 judge、held-out 和真实 agent 输出。

## 测试场景
- Happy: implementation-ready、approved loop、完整 recovery probes、forward outputs pass。
- Edge: legacy Traditional state、Active Wayfinder、hook 自动前置 root、recorded outputs。
- Error: requirements-only、Goal 未 review、缺失 backend、缺少 held-out、required/forbidden 失败。
- Integration: bootstrap -> installed scripts -> hook CLI -> health/release -> 全局真实安装。

## 任务
- [x] Task 1: 机器强制 Artifact Readiness。
- [x] Task 2: 实现 recovery evaluator 和 Wayfinder 恢复摘要。
- [x] Task 3: Goal mode 强制 loop review。
- [x] Task 4: 建立并运行 skill forward-eval。
- [x] Task 5: 完整验证、全局同步和交付状态。

## 当前步骤
全部任务完成，等待用户审阅。

## 验证
- 完整领域测试：106/106，通过。
- release check：通过，包含 106 domain tests 和全部发布门禁。
- 真实 forward-eval：独立 agent 4/4，修复后的真实 Codex CLI backend 直接重跑 4/4。
- 全局安装文件集、receipt、临时 bootstrap 和 health：通过。

## 范围外
- 付费模型调用进入默认 release check。
- 完整多 agent 调度系统。
