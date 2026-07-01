# 资产索引

## 已创建
- 无。

## 已修改
- `.codex/hooks.json`: Windows hooks 改为外层兼容 `powershell.exe`，内部优先检测并委派 `pwsh`，保留无 PowerShell 7 环境的回退路径。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`: 同步新项目 bootstrap 发布资产中的 Windows hook 命令。
- `scripts/project-ops-health.mjs`: health check 增加 `commandWindows` 形状检查，要求优先 `pwsh` 且保留 `powershell.exe` fallback。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: 同步 bootstrap 发布资产中的 health check。
- `tests/project-ops.test.mjs`: 增加 Windows hook 断言，覆盖外层 `pwsh` 检测、内层 `-EncodedCommand`、fallback 和 launcher 调用。
- `AGENTS.md`: 增加 Windows shell 与中文 UTF-8 文件处理规则。
- `AGENTS.project-ops.snippet.md`: 同步项目初始化写入的 AGENTS 片段。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`: 同步 bootstrap 发布资产中的 AGENTS 片段。
- `.agents/skills/using-superpowers/references/codex-tools.md`: Codex 工具映射中明确 Windows 优先 PowerShell 7 / `pwsh`，中文文件使用显式 UTF-8。
- `.codex-context/current-state.md`: 刷新当前任务状态。
- `.codex-context/spec.md`: 刷新当前任务 spec。
- `.codex-context/plan-progress.md`: 刷新当前任务计划和验收项。
- `.codex-context/workflow-state.yaml`: 刷新当前 workflow 阶段。
- `.codex-context/artifact-index.md`: 刷新本索引。
- `.codex-context/verification.md`: 记录本轮验证。
- `.codex-context/handoff-summary.md`: 刷新压缩和接手摘要。

## 已读取 / 已检查
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-skill-evolution/SKILL.md`
- `AGENTS.md`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`
- `.codex-context/workflow-state.yaml`
- `.codex-context/plan-progress.md`
- `.codex-context/spec.md`
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `tests/project-ops.test.mjs`

## 原始输出
- 未新增 raw 输出。

## 最新刷新
- 2026-07-01：等待完整验证结果写入。
