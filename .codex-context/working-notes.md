# 工作笔记

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 用途
记录需要跨压缩保留的紧凑外部化调查状态。不要在这里保存隐藏思维链、完整聊天记录、原始日志、密钥或私密推理。

## 当前发现
- 根 runtime 与 bootstrap 镜像已保持字节一致。
- hook wrapper 通过 `input.cwd` 定位 Git root；非 Git cwd 仅返回 `{}`，真实 JSON/dispatcher 错误仍显式失败。
- shell mutation 采用 tokenizer 和命令语义：copy 只写 destination，move/rename 同时影响 source/destination，rename 的 `NewName` 相对 source parent。
- Git 全局参数、checkout/restore pathspec、PowerShell `EncodedCommand` 的确定性写入均有正反回归。
- 外部 workdir、外部 Git、外部 encoded write、网络和诊断保持 fail-open。
- `scientific_Graph` installer Apply 成功，六个核心 context hash 未变，distribution=`b329b29e...`。
- `sci-evo-extract` 的 legacy `approved_plan_hash` 与当前 `plan-progress.md` 原始 SHA-256 完全相等；该状态未提交且文件为 CRLF。
- `migrateWorkflowState()` 的两个 legacy-v0 兼容缺口均已修复：approval-contract 阶段使用已重绑的 `migrated.approved_plan_hash`；handoff hash 仅在精确命中 raw context 聚合时重绑为 normalized 聚合。

## 当前假设
- hooks 是项目 guardrail，不是完整 shell/security sandbox；无法确定目标的脚本内部写入仍按批准边界 fail-open。

## 已排除路径
- 保留九事件严格控制面并继续扩充 allowlist：真实复现表明误伤大于收益。
- 删除全部 hooks：会失去低成本恢复提示和确定性危险写入保护。
- 用固定句式或自然语言 regex 推断审批、scope、mutation：已拒绝。

## 开放调查问题
- 两个 migration 修复是否能在不改六个事实文件的前提下完成双下游安装和 recovery。

## 下一步验证
- legacy CRLF + uncommitted approval/context state 回归已先红后绿。
- 跑 162/162 full domains 与 release-check，创建修复 checkpoint。
- 重试两个 installer Apply、hash preservation、health/context-budget、transaction residue。
- 用户重启/trust 后 live 四 hook 与浏览器 smoke。

## 提升记录
- 设计结论已提升到 `spec.md`、`decisions.md` 与实施计划；本文件仅保留仍在进行的验证边界。
