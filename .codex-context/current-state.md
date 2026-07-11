# 当前状态

## 目标
从 GPT 5.6 SOL 适配角度优化 Dong Skills，使它作为事实源、恢复层、风险门禁和证据账本辅助新一代模型，而不是限制模型自带的多智能体、工作流和探索能力。

## 最新用户指令
从 GPT 5.6 SOL 适配角度继续审查和优化 Dong Skills；GPT 5.6 自带多智能体、工作流等能力，Dong Skills 应该辅助而不能限制这些能力。

## 当前阶段
verified / not committed

## 当前假设
- 用户已批准本轮 Dong Skills 优化方向，可直接修复有证据和收益的问题。
- 当前工作继续沿用 Lane 3、Traditional task-by-task execution。
- Dong Skills 的硬门禁应保护事实源、审批、恢复、验证、review 和 destructive/action boundaries；不应要求 GPT 5.6 按旧模板表达自然能力。
- hooks 是支持路径 guardrail，不是完整安全沙箱。

## 当前结果
- 已完成 GPT 5.6 SOL 适配优化：
  - SubagentStop 不再要求固定 `Evidence` / `Risks` / `Next action` 标题；改为识别可吸收的 evidence/findings、risks/open gaps 和 parent next action 语义。固定标题仍推荐，但不是硬格式。
  - Goal mode 文档不再绑定 `create_goal` / `update_goal` 这组具体工具名；改为要求任何真实、session-native、可记录目标、可展示进度、可显式 complete/blocked 的 goal/workflow 机制。
  - Wayfinder 从“一 session 只能一个 frontier”的绝对表述，调整为默认一个 frontier；允许 GPT 5.6 做 bounded parallel exploration，但必须共享一个 decision boundary，并在停止前归并回 Wayfinder map。
  - README、AGENTS snippet、project governance、using-superpowers、writing-plans、executing-plans、Wayfinder skill、root runtime 与 onboarding bootstrap 镜像已同步。
- 保留的硬边界：用户审批、scope 变更重开、execution approval、verification/review evidence hash、context recovery receipt、workflow-state validated transitions、review/verification 阶段项目文件写入阻断、Git/status/Stop 后置收口、安装 source/bootstrap/runtime parity。
- 完整验证已通过：195/195 tests across 11 domains，health pass，release check pass，git diff --check pass，installer preview pass，真实安装同步 pass。
- 本机全局 Dong Skills entry skills 和当前源码项目安装副本已同步到本轮版本。

## 下一步动作
1. 用户确认后提交并推送本轮未提交变更。
2. 对旧项目运行 onboarding/bootstrap 更新项目级 Dong Skills。
3. 新项目使用前运行 health；hook liveness warning 只说明当前会话未触发/信任对应 hook，不代表静态安装失败。

## 最后更新
2026-07-11。

## 阻塞项
- 无实现阻塞。
- 仍等待用户是否提交/推送的明确指令。
