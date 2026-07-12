# Handoff 摘要

## 目标
修复 Dong Skills 中 `codex-wayfinder` 不容易被 `using-superpowers` 自动路由的问题，审查是否还有类似“skill 存在但入口弱/发挥不出来”的情况，并吸收 mattpocock/skills 最新值得复用的机制。

## 最新用户指令
提交并推送本轮更新，然后整体详细检查 Dong Skills 是否能够稳定运行。

## 已批准范围 / 规格
- 规格：`.codex-context/spec.md`
- 计划：`.codex-context/plan-progress.md`
- 执行模式：Traditional task-by-task execution
- 风险等级：Lane 3
- 范围：Wayfinder 路由、Matt Pocock 机制吸收、技能入口覆盖、项目级稳定性复核。
- 非目标：不照搬 Matt Pocock 的完整 issue tracker；不把 prototype artifacts 当成生产代码；不修改非 Dong 本地 skills。

## 计划状态
- Wayfinder 路由修复：已完成。
- Matt Pocock 吸收点：已完成，范围为 prototype-as-primary-source、one-question ticket/frontier、deep-module boundary。
- 路由覆盖扫描：已完成，28 个项目级 skill 在 router/governance 中均有入口。
- 提交推送：已完成，`77d12d9 feat(skills): strengthen Wayfinder routing` 已推送到 `origin/main`。
- 稳定性复核：已完成；提交后发现的 handoff 固定章节缺失和 review evidence hash 过期已修复。

## 已修改文件
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.agents/skills/codex-wayfinder/SKILL.md`
- `.agents/skills/codex-architecture-governance/SKILL.md`
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `README.md`
- `tests/domains/skills-contracts.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已做决策
- `codex-wayfinder` 必须在 ordinary brainstorming 前被显式考虑；目标明确但路线仍有 fog/frontier/prototype/grilling 时，不应强行写普通 spec。
- Matt Pocock 的完整 issue tracker 不适合全量搬入 Dong Skills；保留本地 Markdown 和现有 `.codex-context` 治理。
- Prototype 作为回答某个设计问题的 primary source，而不是无记录的 side experiment。
- TypeScript/JavaScript package-style 项目需要显式检查 public entry points、private internals、deep imports、barrel files 和 dependency-cruiser 等边界。
- 所有项目级 skill 必须至少在 `using-superpowers` 和 `codex-project-governance` 中有入口，避免“skill 存在但用不上”。

## 整体探查结论
- 严格扫描 `.agents/skills/*/SKILL.md` 后，所有 28 个项目级 skill 均在 `using-superpowers` 和 `codex-project-governance` 中有入口。
- 扫描曾发现两个入口弱点：`codex-project-governance` 缺 router 显式入口、`requesting-code-review` 缺 router 显式入口；已修复并测试锁定。
- 未发现仍会导致某个项目级 skill 完全无法发挥作用的 P0/P1。

## 验证证据
- `node --test tests/domains/skills-contracts.test.mjs`: pass，2/2。
- 严格路由扫描：pass，无 missing routing entries。
- `node .codex/hooks/project-ops.mjs context-budget`: pass，hot recovery path 约 16,653 tokens。
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-windows.ps1 -TargetProjectRoot . -Preview`: pass，No files were written。
- 提交后稳定性复核发现：`handoff-summary.md` 缺固定章节导致 health/release fail；`verification.md` 在 review closure 后变化导致 workflow-state 需要重新闭环。当前 handoff 已按固定章节修复，workflow-state 已恢复 ok，release-check 已通过。

## Git 存档
- 最新提交: `77d12d9 feat(skills): strengthen Wayfinder routing`
- 推送状态: 已推送到 `origin/main`，远端 `refs/heads/main` 为 `77d12d928c175d956098214fd282a08031f434a2`。
- 已包含文件: Wayfinder/router/governance/planning/execution/architecture skills、README、AGENTS、bootstrap snippet、skills contracts tests、`.codex-context` 状态记录。
- 有意保留未提交的文件: 无；handoff/状态闭环修复将作为 follow-up checkpoint 提交并推送。
- 暂缓原因: 无。
- 下次存档: 下一次有意义的 Dong Skills 变更或旧项目同步后。

## 当前 Git 状态
- 分支：`main`
- 当前已推送功能提交：`77d12d9`
- 当前工作区：handoff 结构修复与 workflow evidence hash 已验证，待提交 follow-up checkpoint。

## 下一步动作
1. 提交并推送 follow-up checkpoint。
2. 最终汇报 Dong Skills 稳定性结论和剩余低风险建议。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/verification.md`
3. `.codex-context/workflow-state.yaml`
4. `.agents/skills/using-superpowers/SKILL.md`
5. `.agents/skills/codex-project-governance/SKILL.md`
6. `.agents/skills/codex-wayfinder/SKILL.md`
7. `tests/domains/skills-contracts.test.mjs`
8. `tests/domains/core.test.mjs`
9. `scripts/release-check.mjs`
10. `.codex/hooks/project-ops.mjs`

## 边界
- 不保存隐藏思维链、完整聊天、密钥或私有 transcript。
- 不把 hooks 描述为完整安全沙箱。
- 不引入新的第三方依赖或常驻进程。
- 不为了通过 health-check 删除必要状态信息；只补齐固定结构和真实证据。

## 开放问题与假设
- 假设：用户希望本轮稳定性 follow-up 也提交并推送，确保远端 `main` 可直接用于旧项目更新。
- 开放问题：无阻塞问题；当前可继续验证和修复闭环。
