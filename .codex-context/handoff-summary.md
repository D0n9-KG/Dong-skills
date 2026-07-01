# Handoff 摘要

## 目标
让 Dong Skills 中用户可能阅读或审批的状态文档默认使用中文，同时保持内部机器契约和旧英文项目兼容。

## 最新用户指令
“可以，那改吧，只要我可能会阅读和审批的文档都需要内容是中文的。”

## 已批准范围 / 规格
- 中文化 `.codex-context/*.md` 新项目模板和 bootstrap 静态模板。
- 保留文件名、命令名、workflow-state YAML key、枚举值、skill 名、hook 名和代码标识英文。
- hooks/health/state-prune 必须同时接受中文标题和旧英文标题。
- 核心 skill 说明必须引导 agent 以后生成中文 spec、plan、verification、handoff 等用户可读文档。

## 计划状态
- 实施状态：完成。
- 验证状态：通过。
- Checkpoint 状态：本地提交已创建，等待推送确认。

## 已修改文件
- `.codex/scripts/lib/markdown.mjs`
- `.codex/scripts/lib/templates.mjs`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/assets.mjs`
- `scripts/project-ops-health.mjs`
- `scripts/state-prune.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/**`
- `.agents/skills/brainstorming/SKILL.md`
- `.agents/skills/writing-plans/SKILL.md`
- `.agents/skills/executing-plans/SKILL.md`
- `.agents/skills/codex-git-checkpoint/SKILL.md`
- `.agents/skills/codex-verification-loop/SKILL.md`
- `.agents/skills/verification-before-completion/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `tests/project-ops.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已读取但未修改文件
- `.agents/skills/using-superpowers/SKILL.md`
- `.codex/scripts/lib/workflow.mjs`
- `.codex/scripts/lib/recovery.mjs`
- `.codex/scripts/lib/git.mjs`

## 已做决策
- 面向用户的 `.codex-context/*.md` 内容中文优先。
- 内部契约保持英文，避免破坏 workflow-state、命令和脚本。
- 用标题别名层兼容中文和英文，而不是要求文档保留隐藏英文锚点。
- `state-prune` 新增归档段统一写中文标题 `已归档证据`。

## 开放问题与假设
- 无阻塞开放问题。
- 假设：旧项目更新 Dong Skills 后可以继续保留原英文状态文档；新项目会生成中文模板。

## 风险
- 仍有少量 skill 正文保留英文流程术语，这是为了精确触发和避免破坏已有测试。
- 旧项目已有英文状态文件不会被自动全文翻译，只会在后续更新/新增 section 时逐步中文化。

## 验证证据
- `node --test tests\project-ops.test.mjs`: pass，63/63。
- `node scripts\release-check.mjs .`: pass。
- `node .codex\hooks\project-ops.mjs health-check`: pass。
- `git diff --check`: pass，只有 CRLF normalization warnings。

## Git 存档
- 最新提交: 本次 checkpoint 提交，`feat(skills): localize project state documents`。
- 推送状态: 本地提交阶段；最终远端状态以推送后 `git status -sb` 和远端分支确认结果为准。
- 已包含文件: 本次中文状态文档默认模板、hook/health/state-prune 兼容解析、bootstrap 镜像、核心 workflow skill 文档和测试更新。
- 有意保留未提交的文件: 无。
- 暂缓原因: 无。
- 下次存档: 后续 Dong Skills 优化进入新的独立 checkpoint。

## 需要保留的经验沉淀
- 用户审批/阅读的状态文档语言应跟用户默认语言一致。
- 文档显示语言和机器解析契约要分层处理：显示中文，内部 key/enum/命令保持稳定。
- bootstrap 的静态 `.codex-context` 模板和 `.codex/scripts/lib/templates.mjs` 必须同步，否则新项目初始化会回退到旧模板。

## 下一步动作
提交并推送当前 Dong Skills 改动；旧项目需要重新运行 Dong Skills bootstrap 才会拿到中文模板和解析兼容更新。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/artifact-index.md`
4. `.codex-context/verification.md`
5. `.codex/scripts/lib/markdown.mjs`
6. `.codex/scripts/lib/templates.mjs`
7. `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/spec.md`
8. `tests/project-ops.test.mjs`
