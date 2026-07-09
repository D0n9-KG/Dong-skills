# Handoff 摘要

## 目标
完成 Dong Skills 状态一致性、提前提醒、PreCompact handoff 清理、资产治理和 checkpoint 收尾优化。

## 最新用户指令
用户要求根据另一个项目推进结束后总结出的 Dong Skills 问题进行优化。

## 已批准范围 / 规格
- 修复 workflow-state / spec / plan 多处状态不一致时仍继续推进的问题。
- 让探索/分析过程更早提醒刷新 `working-notes.md`，降低压缩前丢失分析发现的概率。
- 给自动 PreCompact emergency notice 明确生命周期，避免长期污染 active handoff。
- 让 asset governance 区分可自动整理与必须确认的资产。
- 避免 checkpoint 后记录 checkpoint 又导致无休止提交尾巴。
- 增加 hook 摘要 readability 扫描，避免 ANSI / 控制字符噪声进入发布资产。

## 计划状态
- 实施状态：代码、文档、测试、bootstrap 镜像均已更新。
- 验证状态：通过。
- Checkpoint 状态：等待提交/推送。

## 已修改文件
- `.codex/scripts/lib/assets.mjs`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/git.mjs`
- `.codex/scripts/lib/workflow.mjs`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `tests/project-ops.test.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/...`
- `.agents/skills/codex-asset-governance/SKILL.md`
- `.agents/skills/codex-git-checkpoint/SKILL.md`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `README.md`
- `docs/improvements/backlog.md`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`
- `.codex-context/workflow-state.yaml`

## 已读取但未修改文件
- 全局安装副本中的 `using-superpowers/SKILL.md`
- 全局安装副本中的 `codex-skill-evolution/SKILL.md`
- `.codex/scripts/lib/markdown.mjs`
- `.codex/scripts/lib/templates.mjs`

## 已做决策
- 保留自动 PreCompact 的“允许压缩并写 emergency notice”救场行为，但增加后续 `asset-governance --apply` 清理路径。
- 对状态文档只做一致性审计，不让 hook 自动替用户改 spec/plan 审批结论。
- 对 checkpoint-finalize tail 只在剩余改动全是 governance/context 且 `Git 存档` 结构完整时放行。
- 模板里的审批示例和可选值不应被解析为真实审批状态。

## 开放问题与假设
- 无阻塞开放问题。
- 旧项目需要重新 bootstrap / 更新 Dong Skills，才能拿到本轮 hook 和 runtime 修复。

## 风险
- 状态一致性检查会让旧项目中历史残留的 spec/plan/workflow 矛盾更早暴露；这属于预期行为，需要先修状态再继续实施。
- `asset-governance --apply` 仍只处理 Safe-Auto 项，不会自动删除真实项目文档、代码或用户批准记录。

## 验证证据
- `node --test tests\project-ops.test.mjs`: pass，69/69。
- `node scripts\release-check.mjs .`: pass。
- `git diff --check`: pass。

## Git 存档
- 最新提交: 待提交。
- 推送状态: 当前工作区有未提交修改。
- 已包含文件: 无。
- 有意保留未提交的文件: 本轮修改文件待提交。
- 暂缓原因: 正在执行安装同步和提交前状态刷新。
- 下次存档: 提交并推送本轮 Dong Skills governance 修复。

## 需要保留的经验沉淀
- 这类反馈属于 Dong Skills meta-learning，应进入 `docs/improvements/backlog.md` / 本仓实现，而不是业务项目 instinct。
- 模板状态文本必须和解析器配套测试，否则容易把“可选值/示例”误判为真实审批。

## 下一步动作
同步本机全局 Dong Skills 安装副本，然后提交并推送。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex/scripts/lib/workflow.mjs`
4. `.codex/scripts/lib/events.mjs`
5. `.codex/scripts/lib/assets.mjs`
6. `scripts/project-ops-health.mjs`
7. `tests/project-ops.test.mjs`
