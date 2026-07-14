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
- `scientific_Graph` 与 `sci-evo-extract` 尚未 Apply 本轮 distribution。
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
