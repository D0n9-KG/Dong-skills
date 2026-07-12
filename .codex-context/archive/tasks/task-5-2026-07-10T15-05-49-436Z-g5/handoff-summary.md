# Handoff 摘要

## 目标
修复 Dong Skills 在真实项目运行中暴露的恢复门问题：`context-recovery-eval` 成功后，后续 `workflow-state transition wayfinder-start` 不应继续被 PreToolUse 判定为“本 session 没有 recovery acknowledgement”。同时保持 session 隔离，避免一个 session 的恢复确认被另一个 session 复用。

## 最新用户指令
用户确认这些主要问题有价值，要求针对性修复。

## 已批准范围 / 规格
- 规格来源：用户基于旧项目 `scientific_Graph` 的真实状态文件反馈，要求修复 Dong Skills 本身。
- 执行模式：Traditional task-by-task execution。
- 风险等级：Lane 3。
- 范围：semantic state drift 检测、raw footprint 提醒、health 非阻断 warning、asset-governance CLI 参数、release-check 输出缓冲、技能文档和 bootstrap 镜像同步。
- 非目标：不修改 `scientific_Graph` 旧项目；不把 semantic warning 升级成硬失败；不引入新依赖或常驻进程。

## 计划状态
- recovery receipt 写入/校验路径定位：已完成。
- safe unscoped fallback：已实现并同步 bootstrap 镜像。
- 复合只读命令分类边界：已补回归测试。
- session 隔离不被 fallback 破坏：已通过回归测试。
- 发布级复核：进行中。
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
- `node --test tests/domains/workflow-hooks.test.mjs --test-name-pattern "compound read-only diagnostics|unscoped recovery eval receipt|recovery acknowledgements remain scoped|recovery receipt is invalidated|recovery receipt covers transitive"`: pass，93/93。
- 覆盖点：unscoped `recovery.json` fallback、session-scoped recovery 隔离、runtime hash 失效、transitive runtime hash、复合只读 workflow-state 诊断。

## Git 存档
- 最新提交: `d905759 chore(state): close semantic governance checkpoint`
- 已包含文件: 上一轮语义状态治理代码、技能文档、bootstrap 镜像、测试和状态文件。
- 推送状态: 上一轮已推送到 `origin/main`；本次 recovery receipt 修复待提交推送。
- 有意保留未提交的文件: 无。
- 暂缓原因: 无。
- 下次存档: recovery receipt 修复发布检查通过后立即提交推送。

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