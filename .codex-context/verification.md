# 验证

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 验证证据
- `node --test tests/domains/host-wrapper.test.mjs tests/domains/workflow-hooks.test.mjs tests/domains/health-release.test.mjs tests/domains/assets-worktree.test.mjs`：64/64 pass。
- `node scripts/run-domain-tests.mjs`：160/160 pass，12 domains。
- `node scripts/release-check.mjs .`：pass；含 health、context budget、syntax、PowerShell parse、domain-sharded tests、privacy、readability、large-file 与 runtime artifact scan。
- `node .codex/hooks/project-ops.mjs health-check`：Issues none；旧宿主 liveness receipt 为 runtime-mismatch warning，静态配置与 runtime parity pass。
- `node .codex/hooks/project-ops.mjs context-budget`：hot recovery path 约 3.3k，低于 8k；hooks config 低于 1.5k 合同。
- `node .codex/hooks/project-ops.mjs asset-governance`：blocking issues none，semantic advisories 0。
- 根 runtime/bootstrap 8 组关键哈希一致；`git diff --check` pass。
- 两个下游 installer Preview 均通过且未写文件；六个核心 context 文件安装前 SHA-256 已在当前会话验证记录中保留。

## 尚未验证
- 用户重启/trust 后的真实 `SessionStart`、`PreToolUse`、`PreCompact`、`Stop` 与浏览器 smoke 尚未运行。

## 审查证据
- 第一轮隔离审查发现 Windows alias、workflow-state pathspec、rename destination、external target 与 non-Git wrapper 问题；均先复现失败再修复。
- 第二轮隔离审查发现 Git global routing options 与 PowerShell `EncodedCommand` 问题；均先复现失败再修复。
- 两轮审查 agent 均在返回后立即关闭。
- 最终全新 closure review：无 Critical/High；Task 4 的源码验证与审查闭合，进入 Task 5。

## 本轮复核（2026-07-14 17:01 +08:00）
- `node .codex/hooks/project-ops.mjs workflow-state status`：pass；phase=`execution`，next skill=`executing-plans`，无 pending decision。
- `node .codex/hooks/project-ops.mjs health-check`：pass；static configuration 与 runtime parity pass，Issues none；旧宿主 liveness receipt 仅为 `runtime-mismatch` warning。
- `node .codex/hooks/project-ops.mjs asset-governance`：pass；blocking issues none，semantic advisories 0。
- `node scripts/release-check.mjs .`：pass；发布检查全部门禁通过，耗时 172.8 秒。
- `node --test tests/domains/host-wrapper.test.mjs tests/domains/workflow-hooks.test.mjs tests/domains/health-release.test.mjs tests/domains/assets-worktree.test.mjs`：pass，64/64。
- `node scripts/run-domain-tests.mjs`：pass，160/160，12 domains；并发 4，耗时约 161 秒。
- `git diff --check`：pass；仅报告既有 CRLF normalization warning，无 whitespace error。

## Installer 调试证据（2026-07-14）
- `scientific_Graph` Apply：pass；distribution=`b329b29e6a15f3c9fad9b6d99a5fba900bef2151e9da61c71bfea6dd6c5925ba`，六个核心 context SHA-256 与安装前一致。
- `sci-evo-extract` Apply：fail；`Cannot migrate approved_plan_hash: current approved plan contract differs from the recorded approval`，安装事务已回滚，marker 仍为旧 distribution `a3b3af45...`，六文件 SHA-256 未变。
- 根因证据：legacy `approved_plan_hash=5421dd60...` 与当前 `plan-progress.md` 原始 SHA-256 完全相等；迁移代码第一阶段写入 normalized hash 后，第二阶段错误优先读取 `parsed.approved_plan_hash` 的旧 raw hash。
- 红灯：`node --test --test-name-pattern="legacy plan hash migration carries" tests/domains/core.test.mjs` 在旧实现稳定 0/1，报错与 installer 现场一致。
- 绿灯：第二阶段改用已重绑的 `migrated.approved_plan_hash` 后，精确用例 1/1、`node --test tests/domains/core.test.mjs` 26/26；root/bootstrap `workflow.mjs` parity pass。
- 全量：`node scripts/run-domain-tests.mjs` 161/161，12 domains；`node scripts/release-check.mjs .` pass，全部发布门禁通过。
- 第二个红灯：`legacy context hash migration safely` 在旧实现中稳定失败，saved raw context aggregate 未被 normalized migration 重绑。
- 第二个绿灯：精确用例 1/1、`node --test tests/domains/core.test.mjs` 27/27；root/bootstrap parity pass。
- 最终全量：`node scripts/run-domain-tests.mjs` 162/162，12 domains；`node scripts/release-check.mjs .` pass，全部发布门禁通过。
- 真实重装后 recovery 仍先红：schema 已是 `approval-contract-v2`，saved handoff 仍为 legacy raw 聚合；证明第一版修复触发范围过窄。
- 第三个红灯：`current workflow schema repairs a matching legacy raw context aggregate` 在旧触发范围下稳定失败。
- 第三个绿灯：两个 context migration 精确用例 2/2、core 28/28；安全重绑移至 schema mode 无关位置，只有 saved hash 精确命中当前 raw 聚合才更新。
- 补充全量：`node scripts/run-domain-tests.mjs` 163/163，12 domains；`node scripts/release-check.mjs .` pass，全部发布门禁通过。
- 最终双下游 Apply：distribution=`467bd20cb8ca63604b0b97a8a0c40ef15a992ced3e445a868ba98a00a5ca6493`；两项目 workflow migrate/status/next、context-recovery-eval、health、context-budget、asset-governance、`git diff --check` 均通过，health Issues none。
- 安装前后六个核心 context 文件原始 SHA-256 均保持不变；之后仅对必要状态治理文件做了明确的 post-install 更新并刷新 handoff hash。
