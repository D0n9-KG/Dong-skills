# 规格

## Task Identity
- task_id: task-6-2026-07-12T15-42-07-054Z
- task_generation: 6

## 问题
- 复合 shell 命令把内容重定向到 `.codex-context/raw/**` 时，虽然已识别为写入，却被 `.codex-context/**` 治理修复白名单绕过 recovery 和阶段门禁。
- Stop/checkpoint 的 stale 结论使用当前 Git 状态、mutation intent 和 change-state receipt 的合并集合，错误详情却只从当前 Git 状态选择“最新文件”，导致显示时间晚于 changed file 仍被判旧。

## 目标
- `raw` 写入不得借治理修复路径绕过正常 mutation gate。
- checkpoint stale 判定、责任文件和时间详情必须来自同一 freshness 事实源。

## 审批状态
Approved by user on 2026-07-12。用户直接给出了两个剩余源头问题及期望修复方向。

## 事实优先级
- 最新用户指令。
- 代码、测试、命令和真实 hook 输出。
- 本规格与实施计划。
- 当前状态文件和 handoff。
- 旧任务归档。

## 工作类别 / 风险等级
Lane 3。变更触及 PreToolUse 安全门和 Stop/checkpoint 收尾判定，需要失败用例、完整 hook 回归和发布检查。

## 非目标
- 不把 hooks 描述或扩展为完整 shell 安全沙箱。
- 不修改普通业务文件写入策略。
- 不自动更新尚未重新 bootstrap 的旧项目。
- 不放宽 recovery、审批、验证或 checkpoint 门禁。

## 已批准范围
- 收紧 `governanceRepairMutation` 对 `.codex-context/raw` 的处理。
- 为 freshness 提供统一的 `file + mtime` 结果，并让 checkpoint 判定和诊断共用。
- 同步根运行时与 onboarding bootstrap 镜像。
- 增加回归测试并运行发布级验证。

## 用户决策
- 2026-07-12：保留正常状态文档治理修复能力，只收紧 `raw` 例外。
- 2026-07-12：Stop/checkpoint 不得继续输出自相矛盾的 freshness 依据。

## 设计
- `.codex-context/raw` 不再属于 agent 命令可直接使用的治理修复豁免；写入按普通 mutation 经过 recovery、workflow phase 和 approval gate。
- `latestChangedInfo(root, files)` 返回同一集合中的最新逻辑文件及有效 mtime；删除文件继续使用最近存在父目录的 mtime。
- `gitCheckpointStatus` 接收 freshness 文件集合，使用该集合同时完成 stale 判定和详情输出。
- 当 handoff 已通过 change-state hash receipt 刷新时，继续使用 `latest=0`，不因状态文件维护制造第二轮 freshness。

## 验收标准
- 未完成 recovery 的 session 中，`Get-Content ...; 'probe' > .codex-context/raw/...` 被拒绝。
- 纯只读复合命令、普通状态文档修复、已刷新 change-state 和治理尾部收尾回归保持通过。
- Stop 报告 checkpoint stale 时，详情中的 latest changed file 和 latest mtime 就是判定使用的依据。
- 根运行时与 bootstrap 镜像一致。
- `workflow-hooks` 全量测试和 `release-check` 通过。

## 开放问题
- 无。

## 下一步
完成 review、checkpoint、全局安装同步和旧项目更新说明。
