# 工作记录

## 2026-07-13 Live Wrapper Debugging

- 真实复现：`$files=@(...); Get-FileHash ... | Select-Object ...` 在新 runtime 下仍被拒绝为项目 mutation。
- 自动化复现：`host-wrapper.test.mjs` 新增同形命令后按预期失败，理由为 recovery/mutation gate，而不是 fixture 或宿主 payload 缺失。
- 根因：`shellSyntax` 已正确拆分 assignment 与读取 pipeline，但 `readOnlyShellSegment` 只识别命令 verb；安全字面量 assignment 被归入 `opaque`。
- 修复：新增窄、结构化的 PowerShell literal-assignment 解析器，只接受简单局部变量与无插值字面量标量/数组；不按变量名或整句措辞白名单。
- 安全边界：`$()`、scriptblock、命令调用赋值、重定向和写命令继续拒绝；不尝试解释任意 PowerShell。
- 验证：targeted PowerShell 正反例、host-wrapper 5/5、相关 workflow-hooks、全部 241/241 domains 与 release-check 通过。
- 第二个 live failure：显式外部 `workdir` 下的 `git add` 仍落回科研项目 gate；自动化同形复现确认 external scope 没有识别 Git 隐含工作树目标。
- 第二个根因修复：只对外部 `workdir` 的 repo-local Git allowlist 生效；`-C`、`--git-dir`、`--work-tree` 重定向及不明子命令继续拒绝。
- 第二轮验证：external Git 正反例、host-wrapper 5/5、全部 241/241 domains 与 release-check 再次通过。
- 下一验证：临时关闭当前旧 hooks，checkpoint、重新安装并重启 host，重复原始 live 命令、external Git 与连续 Stop。

## 用途

- 保留当前稳定性调查的复现、根因、假设与下一验证，不保存隐藏推理或完整日志。

## 当前发现

- prompt advisory-only 与 canonical decision evidence 的核心契约已通过 workflow domains。
- 手工计算/粘贴 `Workflow Decision.target_hash` 不适合作为真实使用入口；`workflow-state decision <transition>` 已补齐该操作路径。
- 受控 decision 命令在 pending decision 时可写入正确 evidence file，但不自动 transition；错误 pending/event 被 PreToolUse 和 CLI 双重拒绝。
- decision transition 消费 evidence section，避免 stale machine fields 长期污染 active state。
- root/bootstrap runtime、hook、CLI 与 AGENTS snippet 当前逐对无差异。
- 全部 domain runner 240/240、关键 11 项连续三轮和 release-check 已通过，Task 7 已闭环。
- 架构审计发现技能文本虽已把 learning review 降为 milestone advisory，但 runtime `preCompact` 仍执行 `issues.push(...learning.issues)`；这会让 pending raw observations 阻塞手动压缩，并在自动压缩中制造不必要 emergency debt。
- learning/PreCompact 运行态矛盾已 test-first 修复；pending observations 只显示 advisory。
- SessionStart 重复注入多个 on-demand state excerpt 的 wrapper regression 已 test-first 修复；business handoff sections 在 recovery 输出中先于临时 PreCompact notice。
- root `AGENTS.md` managed block 漂移已同步，并新增与 canonical snippet 的 parity 测试。
- health 现在始终声明 liveness 不证明 host trust。

## 当前假设

- 剩余架构风险最可能位于 compaction/recovery burden、installer/receipt stale state 和输出边界，而不是 prompt decision 主路径。

## 已排除路径

- 不增加 NLP/model classifier 或继续扩充 prompt 正则词表。
- 不让用户记忆专用 decision token，也不要求手工计算 hash。
- 不把 `workflow-state decision` 合并成自动 transition；记录证据与状态推进保持两个可审计步骤。
- 不用下游研究 Wayfinder 文档偿还旧 runtime 制造的跨项目伪债。

## 开放调查问题

- agent-architecture audit 是否发现新的 high severity wrapper/persistence/hidden-loop 问题？
- installer 更新后下游真实 host 是否与自动化契约一致？

## 下一步验证

- 增加真实 pending learning observation 的手动 PreCompact 回归，先证明当前失败，再移除 hard issue 聚合。
- 完成 12 个 agent architecture 边界审计并形成审计报告。
- 修复 accepted findings 后重跑 targeted、全部 domain runner、release-check、parity、transaction residue 和 diff check。
- 完成 Task 8 checkpoint，再进入 installer + downstream live host。

## 提升记录

- 当前属于 Dong Skills 源码修复，最终写入源码 backlog/solution，而不是研究项目 instinct。
