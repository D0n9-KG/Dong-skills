# 计划进度

## 当前计划
[详细计划 / 规格路径；没有正式计划则写“暂无正式计划”。]

## 规格审批
[Approved by user / skipped by user / mechanical exception / pending。]

## 执行审批
尚未批准。实现前记录 “Approved by user for Traditional task-by-task execution on [日期/时间]”、“Approved by user for Codex Goal mode on [日期/时间]”，或 “plan-then-execute requested; Traditional task-by-task execution”。

## Artifact Readiness
requirements-only

## 执行模式
等待用户选择。可选值：Traditional task-by-task execution；Codex Goal mode。不要从“继续”、“执行”或 plan-then-execute 推断为 Codex Goal mode。

## 工作类别 / 风险等级
待定。记录 Lane 0、Lane 1、Lane 2 或 Lane 3，并说明为什么足够。该等级决定计划深度、验证深度、状态更新节奏、审查、回滚和存档节奏。

## Goal 模式目标
未选择。如果用户明确选择 Codex Goal mode，写明当前 Codex session 可用的 goal 机制、目标、规格路径、计划路径、已批准范围、非目标、当前步骤、验证命令、存档节奏、必须更新的状态文件和停止条件。若当前 session 没有真实 goal 机制，则 Goal mode 不可用。

## Loop Review
pending。选择 Traditional task-by-task execution 后记录 `not-required`；选择 Codex Goal mode 时，先运行 `codex-loop-design-check`，通过后记录 `Approved after codex-loop-design-check`。

## 运行约束
- 除非阻塞项要求重新规划，否则按已批准计划顺序执行。
- 保持 `plan-progress.md`、`artifact-index.md`、`verification.md`、`current-state.md` 和 `handoff-summary.md` 更新。
- 遇到需求模糊、重复验证失败、范围变化、破坏性操作、缺少凭据、缺少用户决策、架构冲突或状态矛盾时停止。
- 不要静默扩大已批准规格之外的范围。

## 存档节奏
- 每个有意义且已验证的任务或里程碑后做 checkpoint；若暂缓，记录原因。

## 任务
- [ ] 任务 1：[状态和证据]

## 当前步骤
[只写一个当前活动步骤，或“无”。]

## 验证
- [命令 / 检查及预期信号。]

## 范围外
- [明确非目标。]
