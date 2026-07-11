# Dong Skills Hooks 控制面重构规格

## 问题
当前 hooks 已能完成恢复提示、状态一致性、验证、handoff、checkpoint 和压缩保护，但控制力分布不合理：

1. 关键约束主要在 `PostToolUse` 和 `Stop`，错误动作已经发生后才检查。
2. `stop_hook_active` 无条件放行，第一次 Stop 后未修复的问题可直接绕过。
3. freshness 使用 1 秒 mtime 容差，快速连续写入可绕过 artifact、verification 和 handoff 门禁。
4. Git 不可用、stdin 或 discussion marker 损坏时静默 fail open。
5. workflow 只按阶段和文件类型约束，没有落实 Lane 0-3 风险等级。
6. learning、asset hygiene、workflow、verification 被压平到同一个 Stop 阻断级别。
7. PostToolUse 每次同步扫描 Git，现代 MCP 工具覆盖不完整，最终 `git status` 可能重新污染 working notes。
8. health 只能证明静态配置存在，不能证明 hooks 已被 trust 或最近真实运行。
9. 新任务首个 prompt 和子 agent 生命周期缺少可靠的任务身份、恢复和结果边界。

## 目标
- 用代码门禁保护恢复、任务身份、用户决策和高风险修改，不依赖 prompt 自律。
- 将 hooks 分为硬门禁、阶段边界门禁和 advisories，不让长期卫生阻断普通交付。
- 用内容/状态代次 receipt 取代任意 1 秒 mtime 容差。
- Git、hook 输入和运行态 JSON 损坏时输出明确 degraded/fail-closed 结果。
- 将 Lane 0-3 纳入共享 workflow schema，使约束与风险匹配。
- 让 PostToolUse 只做轻量记录；昂贵 Git/完整性检查集中到修改后必要时和 Stop/PreCompact。
- Stop 重新检查真实状态，提供最小修复动作，并对重复 continuation 使用有界、可诊断策略。
- 增加 SubagentStart/SubagentStop 上下文和结果约束。
- 增加 hook liveness receipt，health 区分静态安装与近期运行证据。
- 所有有副作用的 workflow transition 与项目修改使用同一 session-scoped recovery 语义。
- 用户审批由 UserPromptSubmit 生成绑定 task、decision、内容哈希与 session 的一次性 receipt，代理不能靠修改 Markdown 自证批准。
- workflow-state 更新使用跨进程锁和原子写；并发命令不能静默丢失状态或同时宣称成功。
- 验证缺口、跳过审查、延后 checkpoint 和最终 complete 使用统一 closure 约束，Lane 2/3 不允许多重降级伪装完成。
- new-task 归档并重置 task-scoped 状态文档，旧 Spec、Plan、Handoff 和 Wayfinder 不进入新任务恢复上下文。
- 全局入口安装携带一致的项目 skills 分发快照；bootstrap 不混用新源码 skills 与旧 runtime。
- 安装锁与事务 journal 使用解析 junction 后的物理资源身份；旧 workflow schema 在 bootstrap/install 中显式迁移。

## 审批状态
Approved by user on 2026-07-10 through the explicit response “可以” after the inline control-plane design review.

## 工作类别 / 风险等级
Lane 3：修改 Codex 生命周期协议、恢复边界、状态 schema、Stop 继续行为和项目治理控制面。

## 事实优先级
1. 最新用户指令。
2. 当前源码、测试、Git 与真实 hook/health 运行证据。
3. 本轮已批准规格和实施计划。
4. workflow state、current state 与 handoff。
5. 旧任务记录、历史聊天和过期说明。

## 硬门禁
- workflow/state JSON 损坏或无法解析。
- Git 状态不可获取。
- 新 session/压缩恢复后，修改类工具调用前没有与当前 task identity 和 handoff hash 匹配的 recovery receipt。
- decision_required 未解决时的修改类工具。
- 未获得 spec/plan/execution approval 时进入对应修改阶段。
- Lane 3 修改缺少明确执行批准。

## 阶段边界门禁
- 代码/配置修改缺少 artifact index、verification、handoff 或 checkpoint 证据。
- 活跃讨论、探索或调试的事实尚未外化到要求的状态文件。
- workflow 文档与状态机不一致。

## Advisories
- raw learning observation 待审查。
- verification 历史过长、状态文档偏大、旧 raw snapshot 待清理。
- 非阻断型资产治理和文档卫生。

Advisories 可在 milestone、manual PreCompact、release 或显式 cleanup 时升级，不阻断普通无修改 Stop。

## 官方协议边界
- `PreToolUse` 能拦截 Bash、apply_patch 和 MCP 工具，但不能覆盖所有 shell、WebSearch 或等价工具路径，因此它是重要 guardrail，不是绝对安全边界。
- `Stop decision:block` 会生成新的 continuation prompt；`stop_hook_active` 表示当前 turn 已被 Stop 继续过。
- `SubagentStart` 只能注入上下文，不能阻止子 agent 启动。
- hooks 内容变化后仍需宿主 trust；项目内 liveness receipt 只能证明近期执行，不能替代宿主 trust UI。

## 已批准范围
- `.codex/hooks.json`、`.codex/hooks/{launch-project-ops,project-ops}.mjs`。
- `.codex/scripts/lib/{core,events,git,workflow,recovery,recovery-eval,templates}.mjs`。
- `scripts/{project-ops-health,release-check,workflow-state}.mjs`。
- bootstrap 镜像、project installer、manifest/receipt。
- `using-superpowers` 和直接受影响的 governance/recovery skills。
- workflow、hooks、health、bootstrap 和 release tests。

## 非目标
- 不把 hooks 描述为安全沙箱。
- 不拦截普通只读探索。
- 不引入第三方依赖、数据库或常驻后台服务。
- 不自动批准权限请求。
- 不读取或保存完整聊天、隐藏思维链、密钥或子 agent 完整 transcript。
- 不自动提交或 push。

## 验收标准
- 未完成 recovery 时，支持的修改类 PreToolUse 被明确 deny；只读工具继续。
- recovery receipt 与当前 task id/generation、handoff hash、runtime hash 绑定；new-task、hash 变化或 runtime 更新后自动失效。
- 快速连续状态写入与代码写入不能绕过 Stop/PostToolUse。
- Git 不可用、stdin 损坏、discussion marker 损坏均有确定性失败测试。
- Stop continuation 后重新检查；问题已修复则放行，未修复则按有界策略继续阻止并留下诊断 receipt。
- learning 和非严重 asset hygiene 不再阻断普通 Stop。
- Stop 输出只列出当前问题对应的最小修复动作。
- Lane 0-3 在 workflow schema、health 和 runtime 中一致；Lane 3 获得更强门禁，Lane 0 不承担完整项目流程负担。
- PostToolUse 对现代 MCP 工具按稳定规则分类，不依赖不断增长的工具名枚举。
- SubagentStart 注入 task/范围/恢复摘要；SubagentStop 对未提供结果摘要或违反范围的情况给出一次有界 continuation。
- health 能报告静态配置、runtime parity 和最近 hook liveness 三种独立状态。
- 根 runtime、bootstrap 镜像、完整领域测试、release check 和真实临时 bootstrap 全部通过。
- session A 的恢复 receipt 不能授权 session B 的 workflow transition。
- spec、执行模式和验证缺口审批 transition 在没有匹配用户 prompt receipt 时被拒绝；receipt 消费后不能重放。
- 并发 workflow mutation 不出现多个命令成功但状态更新丢失。
- Lane 3 不能沿 `gap-recorded -> review-skipped -> checkpoint-deferred -> complete` 无用户接受闭环。
- new-task 后 workflow status、SessionStart 恢复内容和活动 Wayfinder 均不再引用旧任务。
- 全局源码目录移动后，已安装入口仍能从一致快照 bootstrap；源码仍可访问但已变化时明确要求重新安装，不生成混合版本。
- 真实路径与 junction 别名竞争同一安装锁和事务 journal。
- 历史 workflow-state.yaml 经 bootstrap/install 后 health 通过，且原审批、phase、task identity 能保留的部分不被覆盖。

## 回滚原则
- workflow 新字段使用 expand-contract，旧项目通过默认值兼容。
- receipt 文件位于 ignored runtime 目录；删除 receipt 只会触发重新恢复或重新检查。
- PreToolUse 出现无法确定的输入时只阻止修改类工具，不阻止只读诊断。
- Stop 有界 continuation 不删除状态证据，不用伪造完成状态解除循环。
- task-scoped 文档在 new-task 前归档；任何重置失败都不提交新的 workflow task identity。
- 分发快照和 distribution_id 仅扩展现有 receipt；旧 marker 缺少新字段时要求重装，不猜测版本一致。

## 开放问题
- 官方 PreToolUse 尚不能覆盖所有等价工具路径；需要在 Stop 保留最终一致性检查。
- 宿主没有公开 trust 状态读取接口，health 只能报告“近期未见 hook 执行证据”，不能断言未 trust。

## 下一步
先建立失败测试，再按“共享 schema/receipt → PreToolUse → PostToolUse/Stop → subagent/liveness → 镜像和发布验证”实施。

## 用户决策
- [决策和日期。]


## 候选方案
- 暂无。


## 设计
- 尚未起草。
