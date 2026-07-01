# 资产索引

## 已创建
- 无。

## 已修改
- `scripts/release-check.mjs`: Windows `.ps1` parse check 新增 PowerShell host 探测，按 `pwsh`、`pwsh.exe`、`powershell.exe` 顺序选择；输出标签显示实际使用的 host。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`: 同步 bootstrap 发布资产中的 release check 修复，避免旧项目更新后仍固定使用 `powershell.exe`。
- `tests/project-ops.test.mjs`: 增加回归测试，要求 release check 具备 `findPowerShellHost()`，并优先候选 `pwsh`。
- `.codex-context/current-state.md`: 刷新当前任务状态。
- `.codex-context/artifact-index.md`: 刷新本索引。
- `.codex-context/verification.md`: 记录本轮验证结果。
- `.codex-context/handoff-summary.md`: 刷新交接摘要和 Git 存档状态。

## 已读取 / 已检查
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `.codex/hooks/launch-project-ops.mjs`
- `scripts/install-windows.ps1`
- `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
- `scripts/project-ops-health.mjs`
- `scripts/release-check.mjs`
- `tests/project-ops.test.mjs`
- `AGENTS.md`
- `.agents/skills/using-superpowers/references/codex-tools.md`

## 原始输出
- 未新增 raw 输出。

## 最新刷新
- 2026-07-01 23:08 本地时间：记录 release check 优先 PowerShell 7 / `pwsh` 的修复及验证。