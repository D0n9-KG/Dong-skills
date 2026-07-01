# 资产索引

## 已创建
- 无。

## 已修改
- `.codex/scripts/lib/markdown.mjs`: 增加中文标题别名、中文 Git 存档字段解析和中文占位内容判断。
- `.codex/scripts/lib/templates.mjs`: 将新项目默认 `.codex-context/*.md` 模板改为中文。
- `.codex/scripts/lib/events.mjs`: 自动压缩应急 handoff 改为中文用户可读内容。
- `.codex/scripts/lib/assets.mjs`: 资产治理统计验证记录时复用标题别名解析。
- `scripts/project-ops-health.mjs`: health check 接受中文/英文状态文档标题。
- `scripts/state-prune.mjs`: verification 归档支持中文标题，并写入中文归档指针。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/**`: 同步 bootstrap 安装资产，包括静态 `.codex-context` 中文模板和脚本镜像。
- `.agents/skills/brainstorming/SKILL.md`: spec 形状和 living spec 指令改为中文状态文档优先。
- `.agents/skills/writing-plans/SKILL.md`: plan 模板和执行审批文档改为中文状态文档优先。
- `.agents/skills/executing-plans/SKILL.md`: 执行前 gate 支持中文计划标题和 legacy 英文标题。
- `.agents/skills/codex-git-checkpoint/SKILL.md`: handoff 的 Git 存档示例改为中文字段。
- `.agents/skills/codex-verification-loop/SKILL.md`、`.agents/skills/verification-before-completion/SKILL.md`: verification 记录示例改为中文标题。
- `.agents/skills/codex-project-governance/SKILL.md`、`AGENTS.md`、`AGENTS.project-ops.snippet.md`: 增加用户可读状态文档中文优先规则。
- `tests/project-ops.test.mjs`: 增加中文标题兼容、中文 Git 存档字段、中文 verification 归档和中文 bootstrap 模板回归测试。

## 已读取 / 已检查
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-project-governance/SKILL.md`
- `.codex/scripts/lib/markdown.mjs`
- `.codex/scripts/lib/templates.mjs`
- `.codex/scripts/lib/events.mjs`
- `.codex/scripts/lib/assets.mjs`
- `.codex/scripts/lib/workflow.mjs`
- `scripts/project-ops-health.mjs`
- `scripts/state-prune.mjs`
- `tests/project-ops.test.mjs`

## 原始输出
- 未新增 raw 输出。

## 最新刷新
- 2026-07-01：完整测试、release check、hook health check 和 diff check 均已通过；准备提交并推送。
