# 计划进度

## 当前计划
执行 `docs/codex/plans/2026-07-10-dong-skills-reliability-hardening.md`，修复 recovery、forward-eval、安装崩溃恢复、备份边界和测试并行问题。

## 规格审批
Approved by user on 2026-07-10.

## 执行审批
plan-then-execute requested.

## Artifact Readiness
implementation-ready

## 工作类别 / 风险等级
Lane 3。

## 执行模式
Traditional task-by-task execution.

## Goal 模式目标
未选择 Codex Goal mode；当前 session 不创建 goal。

## Loop Review
not-required。

## 运行约束
- 每项先增加真实失败测试或精确 CLI/e2e 复现。
- 根 runtime 与 bootstrap 镜像同步，禁止只修安装副本。
- 使用 Node/PowerShell 标准库，不增加依赖。
- installer 恢复失败时保留 journal/backup，不销毁诊断证据。
- 不修改 substring judge、外部网络要求或未批准的流程设计。

## 存档节奏
- 每个纵向切片验证后更新状态文件。
- 本轮不自动提交、不推送；最终在 handoff 记录 checkpoint deferred，等待用户确认。

## 验收映射
- Recovery identity/freshness -> Task 1 -> workflow-hooks/core 定向测试。
- Forward timeout -> Task 2 -> memory-evolution 定向测试。
- Crash-safe install / precise backup -> Task 3 -> bootstrap recovery e2e。
- Domain split -> Task 4 -> domain runner 时间与唯一归属检查。
- Release integrity -> Task 5 -> 全领域、health、release、真实 bootstrap/global sync。

## 测试场景
- Happy: 活跃 hash/identity 一致、complete recovery、backend 正常、安装正常提交。
- Regression: 现有 readiness、loop review、Wayfinder、rollback、lock 和 receipt 保持。
- Error/edge: null hash、stale hash、task mismatch、backend timeout、强制终止、损坏 journal、锁定 raw 文件。
- Non-goal preservation: recorded-output judging、非 Dong skill 保护、网络 backend 可选性不变。

## 当前步骤
Task 1-5 已完成，等待用户审阅。

## 任务
- [x] Task 1: Recovery freshness、task identity 与 complete 语义。
- [x] Task 2: Forward backend 单用例 timeout 与结果分类。
- [x] Task 3: 安装持久事务恢复、旧产物清理和精确备份。
- [x] Task 4: 拆分 bootstrap 测试域并验证并行收益。
- [x] Task 5: 全量验证、真实安装同步、review 与 handoff。

## 验证
- `node scripts/run-domain-tests.mjs`: 114/114，10 domains，concurrency 4，91.7 秒。
- `node scripts/project-ops-health.mjs .`: pass。
- 定向 recovery 7/7、memory-evolution 16/16、bootstrap-install 5/5。
- 最终 `node scripts/release-check.mjs .`: pass，包含 health、114 domain tests、Node/PowerShell syntax、privacy、readability、large-file 和 runtime-artifact。
- 最终源码已重同步到 `%USERPROFILE%\.agents\skills`；安装副本 bootstrap/health 与残留扫描通过。

## Review
- P1：closed cleanup 在 backup 删除后被强杀会留下不可恢复 journal；已用 journal `status` 修复。
- P1：closed cleanup 普通异常会被外层 catch 错误 rollback；已按事务状态阻止回滚。
- P2：无中断残留时同名非 Dong 技能被误判；已让 repair 仅在存在 previous/staging 证据时介入。
- P3：`--timeout-ms` 使用 `parseInt` 接受小数/后缀；已改为严格数值校验。
- Simplicity：拆分测试文件的未使用 support 解构已删除，无新增依赖或通用事务框架。

## 范围外
- substring judge 重构。
- 默认付费 forward-eval。
- 自动 commit/push。
