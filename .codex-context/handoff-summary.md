# Handoff 摘要

## 目标
修复 Dong Skills 在真实旧项目使用中暴露的状态治理问题：active state 文件不能因为 Stop/hook/runtime/Dong Skills 维护日志而失去当前项目焦点，压缩或新 session 恢复时应优先看到当前项目事实、下一步和真正未解决问题。

## 最新用户指令
用户确认这些主要问题有价值，要求针对性修复。

## 已批准范围 / 规格
- 规格来源：用户基于旧项目 `scientific_Graph` 的真实状态文件反馈，要求修复 Dong Skills 本身。
- 执行模式：Traditional task-by-task execution。
- 风险等级：Lane 3。
- 范围：semantic state drift 检测、raw footprint 提醒、health 非阻断 warning、asset-governance CLI 参数、release-check 输出缓冲、技能文档和 bootstrap 镜像同步。
- 非目标：不修改 `scientific_Graph` 旧项目；不把 semantic warning 升级成硬失败；不引入新依赖或常驻进程。

## 计划状态
- 旧项目样本问题归因：已完成。
- asset-governance semantic drift/raw footprint：已实现。
- health semantic warnings：已实现。
- release-check maxBuffer：已实现。
- 技能文档和 bootstrap 镜像同步：已完成。
- 测试与发布复核：已完成一轮，正在做最终提交前复核。
- Git checkpoint：待最终复核后提交推送。

## 已修改文件
- `.codex/scripts/lib/assets.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`
- `scripts/asset-governance.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/asset-governance.mjs`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`
- `.agents/skills/codex-asset-governance/SKILL.md`
- `.agents/skills/codex-docs-stewardship/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `tests/domains/assets-worktree.test.mjs`
- `tests/domains/health-release.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已做决策
- Semantic state drift 作为 warning/advisory，而不是 hard fail，避免治理系统在收尾时制造新的 Stop 循环。
- Handoff 顶部必须恢复当前业务/项目任务；Dong Skills 维护日志只可保留为简短审计或归档。
- `current-state.md` 应表达一个当前结论；旧的失败/已修复过程不应并存成恢复事实。
- `working-notes.md` 是临时调查状态，已结束的 hook/Git/Stop 调试应提炼后归档。
- `open-questions.md` 应合并重复问题，并标记 resolved/superseded/archived。
- raw 资产即使 ignored，也需要在体积过大时提示 owner/reason/retention。

## 验证证据
- `node --test tests/domains/assets-worktree.test.mjs`: pass，9/9。
- `node --test tests/domains/health-release.test.mjs`: pass，23/23。
- `node --test tests/domains/core.test.mjs`: pass，24/24。
- `node --test tests/domains/workflow-hooks.test.mjs`: pass，92/92。
- `node scripts/run-domain-tests.mjs`: pass，219/219，11 domains。
- `node scripts/project-ops-health.mjs .`: pass，仅 liveness warning。
- `node scripts/asset-governance.mjs .`: pass，仅非阻断建议。
- `node scripts/release-check.mjs .`: pass。
- `git diff --check`: pass。

## Git 存档
- 最新远端基线：`origin/main` 上一轮 Dong Skills 提交已同步。
- 本轮计划提交信息：`feat(governance): detect semantic state drift`。
- 推送状态：待最终复核后推送。
- 有意保留未提交的文件：无。
- 暂缓原因：无。
- 下次存档：最终复核通过后立即提交推送。

## 当前 Git 状态
- 分支：`main`
- 工作区：本轮语义治理修复文件已修改，待最终复核、提交、推送。

## 下一步动作
1. 运行 `git diff --check` 和 `node scripts/release-check.mjs .`。
2. 若通过，提交并推送。
3. 汇报修复内容、验证结果和旧项目更新提示。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/verification.md`
4. `.codex/scripts/lib/assets.mjs`
5. `scripts/project-ops-health.mjs`
6. `scripts/release-check.mjs`
7. `.agents/skills/codex-asset-governance/SKILL.md`
8. `.agents/skills/codex-docs-stewardship/SKILL.md`
9. `.agents/skills/codex-project-governance/SKILL.md`
10. `tests/domains/assets-worktree.test.mjs`

## 边界
- 不保存隐藏思维链、完整聊天、密钥或私有 transcript。
- 不把 semantic advisories 当作绝对诊断；它们是恢复质量提示。
- 不修改旧项目样本；旧项目需重新 bootstrap 才能获得新规则。
- 不把 hooks 描述成完整安全沙箱。

## 开放问题与假设
- 假设：用户希望本轮修复通过后提交并推送到 `origin/main`。
- 开放问题：无阻塞问题。