# Handoff 摘要

## 目标
修复 Dong Skills 中 `codex-wayfinder` 不容易被 `using-superpowers` 自动路由的问题，审查是否还有类似“skill 存在但入口弱/发挥不出来”的情况，并吸收 mattpocock/skills 最新值得复用的机制。

## 最新用户指令
这个思路正确；修完后整体探查 Dong Skills 里是否还有其他类似情况，之后开始吸收 mattpocock 中最新的几个 skill 进入 Dong Skills。

## 已完成
- 修复 `using-superpowers`：description、Routing Gate、Phase Order、Skill Selection 均明确包含 route discovery、Wayfinder vs brainstorming 判断、frontier/prototype/grilling/fog/dishonest-spec 风险。
- 修复 `codex-project-governance`：description、Skill Map、Lifecycle Scope 均明确 Wayfinder pre-check 先于普通 brainstorming。
- 增强 `codex-wayfinder`：新增 Typical Triggers、one-question ticket、`docs/codex/wayfinder/tickets/`、Prototype As Primary Source、Logic prototype、UI prototype、primary-source pointer、原型归档/清理规则。
- 增强 `codex-architecture-governance`：新增 Deep Module Boundary Check，覆盖 public entry points、private internals、deep imports、package exports/path alias/barrel file/dependency-cruiser。
- 增强 `writing-plans` / `executing-plans`：涉及 package/module 边界时必须记录/遵守 public entry point、private internals、forbidden deep imports；任务采用 ticket-like execution。
- 同步 README、AGENTS、根/bootstrap `AGENTS.project-ops.snippet.md`。
- 补强 `tests/domains/skills-contracts.test.mjs`，锁住 Wayfinder 路由、Matt Pocock 吸收点和 router/governance 覆盖。

## 上游依据
- mattpocock/skills upstream HEAD：`391a2701dd948f94f56a39f7533f8eea9a859c87`。
- 本轮没有照搬 Matt Pocock 的完整 issue tracker / local tracker 流程；只吸收适合 Dong Skills 文件化治理的 prototype-as-primary-source、deep-module boundary、one-question ticket/frontier。

## 整体探查结论
- 严格扫描 `.agents/skills/*/SKILL.md` 后，所有 28 个项目 skill 均在 `using-superpowers` 和 `codex-project-governance` 中有入口。
- 扫描曾发现两个入口弱点：`codex-project-governance` 缺 router 显式入口、`requesting-code-review` 缺 router 显式入口；已修复。
- 未发现仍会导致某个项目 skill 完全无法发挥作用的 P0/P1。

## 验证证据
- `node --test tests/domains/skills-contracts.test.mjs`: pass，2/2。
- `node .codex/hooks/project-ops.mjs health-check`: pass，Issues none；hook liveness runtime-mismatch 为 warning。
- `node .codex/hooks/project-ops.mjs context-budget`: pass，hot recovery path 约 16,670 tokens。
- `node scripts/release-check.mjs .`: pass，包含 health、context budget、syntax、domain-sharded tests、privacy、readability、large-file、runtime-artifact。

## 当前 Git 状态
- 分支：`main`
- HEAD 基线：`907640f test: improve domain test diagnostics`，工作区有本轮未提交改动。
- 上一轮 Stop hook 修复状态记录中曾提到 `09b5748`；当前真实 `git log -1` 在本轮开始时显示 `907640f`。后续提交前应以当前 `git status` / `git log` 为准。

## 下一步动作
1. 如需存档，提交并推送本轮 Dong Skills 更新。
2. 旧项目需要重新运行 onboarding/bootstrap，才能获得最新项目级 skills、AGENTS/snippet 和 hook runtime 资产。
3. 后续可择机处理 context-budget 提示的冷路径大文件拆分，但本轮不阻塞。

## 优先重读文件
1. `.agents/skills/using-superpowers/SKILL.md`
2. `.agents/skills/codex-project-governance/SKILL.md`
3. `.agents/skills/codex-wayfinder/SKILL.md`
4. `.agents/skills/codex-architecture-governance/SKILL.md`
5. `.agents/skills/writing-plans/SKILL.md`
6. `.agents/skills/executing-plans/SKILL.md`
7. `AGENTS.md`
8. `AGENTS.project-ops.snippet.md`
9. `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
10. `README.md`
11. `tests/domains/skills-contracts.test.mjs`
12. `.codex-context/verification.md`

## 边界
- 不把 Matt Pocock 的重型 issue tracker 全量搬入 Dong Skills。
- 不把 prototype artifacts 当成可交付生产代码。
- 不允许 ordinary brainstorming 吞掉本应进入 Wayfinder 的跨 session 路线探索。
- 不保存隐藏思维链、完整聊天、密钥或私有 transcript。

## 开放问题
- 用户是否希望现在提交并推送。
