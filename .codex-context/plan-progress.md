# 计划进度

## Task Identity
- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## 当前计划

- 详细计划：`docs/codex/plans/2026-07-13-dong-skills-host-stability.md`。

## Artifact Readiness

- implementation-ready。

## 规格审批

- Approved by user on 2026-07-13。

## 执行审批

- plan-then-execute requested; Traditional task-by-task execution。

## 执行模式

- Traditional task-by-task execution。

## 工作类别 / 风险等级

- Lane 3：权限门禁、session isolation、跨项目作用域与发布安装。

## Goal 模式目标

- 未选择；本轮使用 Traditional task-by-task execution。

## Loop Review

- not-required；本轮不是 Goal mode。

## 运行约束

- test-first；不为绿灯削弱安全负例。
- 不修改研究业务代码或实验资产。
- 不把安装副本当源码；最终由真实源码 installer 覆盖临时 bootstrap。
- 完整测试失败时回 systematic-debugging，不叠补丁。

## 存档节奏

- recovery 模块、events 模块、全量验证、下游安装各自形成可验证检查点。
- 最终源仓库 commit；未明确要求时不 push。

## 任务

- [x] Task 1：复现 recovery scoped/unscoped 死锁与跨 session 复用。
- [x] Task 2：实现原子 single claim/promotion 并通过定向隔离测试。
- [x] Task 3：复现并修复 PowerShell pipeline、外部作用域与 PostToolUse 空响应。
- [ ] Task 4：运行 workflow-hooks、全部 domain tests、release-check 与重复稳定性循环。
- [ ] Task 5：执行架构/对抗审查并处理 findings。
- [ ] Task 6：installer 更新 `scientific_Graph`，验证 context 保护与真实回归。
- [ ] Task 7：刷新状态、checkpoint 源仓库并恢复研究 Wayfinder。

## 当前步骤

- Task 4：完整验证和稳定性循环。

## 验证

- `node --test tests/domains/host-wrapper.test.mjs`
- `node --test tests/domains/workflow-hooks.test.mjs`
- `node scripts/run-domain-tests.mjs`
- `node scripts/release-check.mjs .`
- `git diff --check`
- installer Preview/Apply + 下游 health/recovery/Stop。

## 范围外

- 推送远端、发布 tag、修改研究方法与实验。
