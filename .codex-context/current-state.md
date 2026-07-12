# 当前状态

## 目标
修复 Dong Skills 中 `codex-wayfinder` 存在但不容易被 `using-superpowers` 路由到的问题，整体扫描是否还有“skill 有但入口弱/无法发挥作用”的类似情况，并吸收 Matt Pocock Skills 最近值得引入的机制。

## 最新用户指令
确认 Wayfinder 路由思路正确；修完后整体探查 Dong Skills 是否还有类似导致模块无法发挥作用的问题；之后吸收 mattpocock/skills 中最新的几个 skill/机制进入 Dong Skills。

## 当前阶段
实现和验证已完成；等待最终交付/按需提交推送。

## 当前假设
- 本轮属于 Dong Skills 自身维护，继续按 Lane 3、Traditional task-by-task execution 处理。
- 不照搬 Matt Pocock 的完整 issue tracker；只吸收对 Dong Skills 有用且能融入现有文件化治理的机制。
- 优先修入口、路由、状态契约和测试锁定，避免“轻量化”把关键流程删掉。

## 当前结果
- 已确认 mattpocock/skills 当前 upstream HEAD 为 `391a2701dd948f94f56a39f7533f8eea9a859c87`。
- 已修复 `using-superpowers`：frontmatter 和路由门现在明确包含 `wayfind uncertain multi-session routes`、route discovery、Wayfinder vs brainstorming 预判、frontier/prototype/grilling/fog/dishonest-spec 风险。
- 已修复 `codex-project-governance`：主循环 Scope 阶段先做 Wayfinder pre-check；Skill Map 明确 research/prototype/user-grilling/frontier-ticket/blocking-edge 触发。
- 已增强 `codex-wayfinder`：新增 Typical Triggers、one-question ticket 约束、`docs/codex/wayfinder/tickets/`、Prototype As Primary Source、Logic prototype / UI prototype、primary-source pointer、原型归档/清理规则。
- 已增强 `codex-architecture-governance`：新增 Deep Module Boundary Check，覆盖 public entry points、private internals、deep imports、package exports/path alias/barrel file/dependency-cruiser 边界。
- 已增强 `writing-plans` 和 `executing-plans`：计划和执行必须在涉及 package/module 边界时记录/遵守 public entry point、private internals、forbidden deep imports，按 ticket-like execution 切任务。
- 已同步 README、AGENTS、根/bootstrap `AGENTS.project-ops.snippet.md`。
- 严格路由扫描已通过：所有 28 个项目 skill 均在 `using-superpowers` 和 `codex-project-governance` 中有入口或说明；额外补了 `codex-project-governance` 与 `requesting-code-review` 的 router 入口。
- 完整 release check 已通过。

## 下一步动作
1. 如需存档，提交并推送本轮 Dong Skills 变更。
2. 旧项目需要重新 bootstrap 才能拿到这批项目级技能/AGENTS/hooks 文档更新。
3. 后续可继续关注 context-budget 提示的冷路径大文件拆分，但本轮不是阻塞项。

## 最后更新
2026-07-12。

## 阻塞项
- 无。
