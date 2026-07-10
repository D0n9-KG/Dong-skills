# Dong Skills 恢复与安装可靠性补强规格

## 问题
当前版本的主流程已经可以辅助复杂项目，但提交后独立审查确认六个边缘可靠性缺口：

1. 活跃 workflow 的恢复 evaluator 只验证内容存在，未强制验证 handoff 新鲜度与当前任务身份。
2. `phase: complete` 合法使用 `next_skill: none`，但 recovery evaluator 将其判为失败。
3. skill forward-eval 外部 backend 没有单用例超时，网络或 CLI 挂起会无限阻塞。
4. Windows 安装事务只在异常可被 `catch/finally` 捕获时回滚，进程终止或断电会留下部分安装和旧备份。
5. 安装事务完整复制 `.codex-context`，可能把大型 raw 产物复制到临时目录。
6. `bootstrap-runtime.test.mjs` 单文件历史运行约 125 秒，限制领域并行测试的实际收益。

## 目标
- 活跃 workflow 只有在 handoff hash 与当前 task identity 一致时才允许恢复。
- 完成态 recovery 明确返回可恢复/已完成语义，不因 `next_skill: none` 假失败。
- forward-eval 支持可配置的单用例超时，超时 fail closed 并记录独立分类。
- 安装事务在进程被终止后可由下一次安装自动恢复，且清理旧 staging/previous 产物。
- 安装事务区分 active rollback 与 closed cleanup；提交后的清理中断不得阻塞后续安装或恢复旧集合。
- 安装事务只备份实际受管理的 context/runtime 文件，不复制 `.codex-context/raw`。
- bootstrap 测试按安装、完整性、恢复/并发拆分，使 runner 能跨文件并行。

## 审批状态
Approved by user on 2026-07-10 through the explicit instruction “按这个完整修复一下”.

## 事实优先级
1. 用户批准的本规格和最新指令。
2. 真实源码、失败复现、测试和安装行为。
3. 本实施计划与当前状态文件。
4. 旧 handoff、历史验证和聊天摘要。

## 工作类别 / 风险等级
Lane 3：修改恢复信任边界、workflow schema、外部进程控制、安装事务和发布测试编排。

## 已批准范围
- `.codex/scripts/lib/{workflow,recovery-eval}.mjs` 及 bootstrap 镜像。
- `scripts/skill-forward-eval.mjs`、协议文档及 bootstrap 镜像。
- `scripts/install-windows.ps1`、project bootstrap installer 和安装测试。
- `tests/domains/` 的 recovery、forward-eval、bootstrap 测试及必要共享 helper。
- health、release、manifest/receipt 或 README 中与上述行为直接相关的同步修改。

## 非目标
- 不引入第三方依赖。
- 不把付费模型调用加入默认 release check。
- 不重构 substring judge 为模型裁判。
- 不改变 FlClash、Codex CLI 或 `chatgpt.com` 的环境依赖。
- 不自动提交或推送。

## 验收标准
- 新任务状态配旧 handoff、活跃状态缺少 hash、hash task identity 不匹配均 recovery fail closed。
- 合法 complete 状态的 recovery 通过，并明确 `next_skill: none` 是完成态。
- 慢 backend 在指定时间内终止，summary 标记 timeout，后续 case 仍可评测。
- 强制终止 installer 后，下一次安装先恢复旧集合，再完成升级；无旧 `.previous-*`、`.staging-*` 或事务 journal 残留。
- 强制终止事务关闭或在 closed cleanup 中抛出异常时，下一次安装只完成清理，不回滚已提交的新集合。
- `.codex-context/raw` 被独占锁定时安装仍能完成，证明事务不再复制 raw。
- bootstrap 测试拆分后测试总数不减少，完整领域测试和 release check 通过。
- 根 runtime、bootstrap 镜像、真实临时安装和全局安装副本保持一致。

## 回滚原则
- workflow 新字段采用 expand-contract，旧状态通过默认值兼容。
- installer journal 格式 fail closed；损坏 journal 不自动删除备份。
- 若事务恢复失败，保留 journal 与 backup 供人工诊断，不在 `finally` 中销毁证据。

## 开放问题
无启动阻塞项。

## 实施状态
- Task 1-5 已实现并通过定向测试、完整领域测试、release check、真实 bootstrap 和 installed health。
- 独立 review 发现并修复 closed cleanup 的两个额外事务窗口，以及非 Dong 同名技能误判和 timeout 参数宽松解析。
- 全局安装副本已从最终源码重同步，事务和 staging/previous 残留扫描通过。

## 下一步
等待用户审阅；不自动提交或推送。

## 用户决策
- [决策和日期。]


## 候选方案
- 暂无。


## 设计
- 尚未起草。
