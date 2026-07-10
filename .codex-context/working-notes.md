# Working Notes

## Purpose
记录紧凑、可恢复的调查事实，不保存隐藏推理、完整聊天、原始日志、密钥或私人信息。

## Current Findings
- 活跃 recovery 现在要求 handoff hash 与 task id/generation 一致；complete workflow 不要求活跃 next action。
- forward-eval 默认 120 秒单 case timeout，超时 fail closed，后续 case 继续；非法小数 timeout 被拒绝。
- installer journal 支持 active rollback 与 closed cleanup，进程终止和普通 cleanup 异常均有真实 e2e。
- transaction 只快照 managed context/runtime 文件和明确目标，不复制 `.codex-context/raw` 运行产物。
- 同名非 Dong 技能只经过正常预检，不再被 repair 路径误判。
- bootstrap 测试拆为 5/8/7 三个 domain；完整套件 114/114，91.7 秒。

## Current Hypothesis
- 当前实现满足已批准规格；剩余风险集中在 rollback 恢复过程中再次断电，以及 backend 自行派生子进程的超时清理。

## Rejected Paths
- 仅增加 skill 文字而不增加机器门禁。
- 把付费模型调用加入默认 release check。
- 为通过真实 forward 场景而删除 handoff-first 要求。
- 为通过 forward 场景而削弱生产 `implementation-ready` 门禁；实际只修正了评测词面。
- 让共享 schema 测试继续复制 `phase: complete` 后覆盖任意 next skill；改用 planning fixture 隔离测试目标。
- 用测试豁免掩盖 privacy scan 假阳性。
- 只交换 backup/journal 删除顺序而不记录事务状态；该方案会在另一侧留下 orphan 或误回滚窗口。
- 为 installer 引入第三方事务库；PowerShell JSON journal 与现有锁足够。

## Open Investigation Questions
- 无本轮阻塞项。

## Next Verification Step
无；等待用户审阅。

## Promotion Notes
实现、review、release、全局同步和残留扫描结论已提升到正式状态文件。

## 用途
记录需要跨压缩保留的紧凑外部化调查状态。不要在这里保存隐藏思维链、完整聊天记录、原始日志、密钥或私密推理。


## 当前发现
- 暂无。


## 当前假设
- 暂无。


## 已排除路径
- 暂无。


## 开放调查问题
- 暂无。


## 下一步验证
- 暂无。


## 提升记录
- 在阶段边界，把持久结论提升到 spec.md、decisions.md、current-state.md、handoff-summary.md 或 docs/solutions/。
