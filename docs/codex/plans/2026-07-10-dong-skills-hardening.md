# Dong Skills 全面加固实施计划

## 目标
修复审查确认的安全、状态机、恢复、安装和发布问题，并吸收八个外部上游中可验证、低耦合的关键机制。

## 总体策略
1. 先锁定 silent-pass 和 destructive path。
2. 再修状态机与跨 session 边界。
3. 最后版本化安装协议并做旧项目升级验证。
4. 每条主线都先建立失败 fixture，再做共享根因修复。

## Task 1：安全与发布门禁 characterization
- 为用户 skill 文本误判、中文 Git quoted path、零测试 release、no-op hook、注释审批标题、schema 漂移、junction 增加失败测试。
- 预期：当前实现测试失败，且失败原因对应真实症状。

## Task 2：安全和 silent-pass 修复
- Installer/bootstrap 只信任严格 managed marker。
- Git status 改为 NUL-delimited parser。
- Source release 强制测试存在；context-budget unknown 失败。
- Health 执行 runtime smoke，并严格解析 Markdown 标题。

## Task 3：状态与恢复闭环
- 新增 `new-task` 和 task generation。
- 修复 `delivery-complete`、`blocked/resume`。
- 启用 handoff hash 比较和刷新纪律。
- PreCompact notice 写入/清理幂等。
- Worktree ownership 改为显式 provenance。

## Task 4：安装协议
- 全量预检后再写。
- Source/global/project receipt 记录 fingerprint/hash。
- Health 校验 skill/runtime receipt。
- 清理旧 marker 声明的退役 skill 和旧 Dong hook group。
- 保留旧 marker 兼容诊断，但不把无 marker 文本启发式当 ownership。

## Task 5：上游机制吸收
- Matt Pocock: facts vs decisions、vertical slices、expand-contract、tautological-test 防护。
- Compound Engineering: blindspot pass、destructive choke-point completeness、silent-pass review。
- Comet: runtime distribution receipt/doctor 思路。
- ECC: delivery gate、reverse coverage、observer 错误显式化原则。
- Context Engineering: deterministic gate before model evaluation。
- Ponytail: codebase reuse rung、root choke-point 修复。
- SkillOpt: 持久化前诊断脱敏和后端失败显式化。
- Superpowers: 保留清晰 spec/plan/execution gates，不引入完整 SDD/subagent runtime。

## Task 6：验证
- Targeted tests。
- 完整 `node scripts/run-domain-tests.mjs`。
- `node scripts/release-check.mjs .`。
- `node .codex/hooks/project-ops.mjs health-check`。
- `git diff --check`。
- 新装、旧项目升级、部分篡改、连续压缩、中文路径、junction 真实 fixture。

## 回滚
- Task 2、3、4 分别保持独立文件组。
- 任一主线无法通过其 targeted tests 时，回退该主线并保留失败证据，不用 fallback 零值或绕过门禁。
