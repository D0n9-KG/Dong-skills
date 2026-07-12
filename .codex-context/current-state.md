# 当前状态

## 目标
针对真实旧项目使用反馈，修复 Dong Skills 状态治理容易语义漂移的问题：handoff/current-state/open-questions/working-notes 不能被 Stop、hook、runtime、Dong Skills 维护日志长期盖住，也不能在压缩或新 session 后把过期维护历史当成当前项目事实。

## 最新用户指令
用户确认这些实际使用层面的问题很有价值，要求全部针对性修复。

## 当前阶段
实现已完成，正在做状态闭环、发布复核、Git 提交和推送。

## 当前假设
- 本轮属于 Dong Skills 自身维护，风险等级按 Lane 3 处理。
- 旧项目 `scientific_Graph` 只作为只读样本，不在本轮直接修改。
- 语义漂移应作为 warning/advisory，而不是让结构健康项目直接 fail，避免治理工具自己制造 Stop 循环。
- raw 大文件即使不被 Git 跟踪，也应该提示 owner/reason/retention，而不是只看 Git tracked 文件。

## 当前结果
- `asset-governance` 已新增 semantic state advisories：检测 handoff 顶部是否被 Dong Skills/Stop/hook/runtime 维护内容占据、current-state 是否新旧矛盾、working-notes 是否像已结束的 hook/Git 调试日志、open-questions 是否重复标题、raw footprint 是否过大。
- `project-ops-health` 已新增非阻断 warning：发现语义漂移时提示，但保持结构健康项目 pass。
- `asset-governance` CLI 已新增 `--raw-total-warn-mb` 和 `--raw-largest-warn-mb`。
- `release-check` 已增加 32MB command buffer，避免 domain-sharded tests 输出较大时误失败。
- `codex-asset-governance`、`codex-docs-stewardship`、`codex-project-governance`、根/bootstrap `AGENTS.project-ops.snippet.md` 已同步新约束：active state 应以当前项目事实为主，不把维护日志当作恢复主线。

## 下一步动作
1. 运行发布级复核：diff check、domain tests、health、asset-governance、release-check。
2. 若通过，提交并推送 `feat(governance): detect semantic state drift`。
3. 最终汇报修复内容、验证证据、旧项目同步方式。

## 最后更新
2026-07-12。

## 阻塞项
- 无。