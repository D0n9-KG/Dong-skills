# Handoff 摘要

## 目标
优化 Dong Skills 的 Windows PowerShell 7 / `pwsh` 使用策略，降低中文编码乱码风险，同时保留兼容 fallback。

## 最新用户指令
用户要求更新 Dong Skills，让 hooks / 脚本更合理地使用 PowerShell 7。

## 已批准范围 / 规格
- 保留 Windows hook 外层 `powershell.exe` 兼容入口，因为 Codex host 或未安装 PowerShell 7 的机器仍需要 fallback。
- hook 内部优先检测并委派 `pwsh`。
- release check 的 `.ps1` parse 检查也优先使用 `pwsh`，找不到时才回退 `powershell.exe`。
- 不把系统 Windows PowerShell 5.1 删除或替换掉。

## 计划状态
- 实施状态：代码和测试改动已完成。
- 验证状态：通过。
- Checkpoint 状态：等待提交/推送。

## 已修改文件
- `scripts/release-check.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`
- `tests/project-ops.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已做决策
- 不把所有入口硬切成 `pwsh`，因为这会破坏没有 PowerShell 7 的环境；采用“优先 `pwsh`，fallback `powershell.exe`”。
- release check 属于 Dong Skills 自身质量门禁，应和 hooks 一样优先 `pwsh`，避免中文/UTF-8 相关验证在旧 PowerShell 行为下产生误导。

## 风险
- 旧项目需要重新运行 Dong Skills 更新/bootstrap 才能拿到 release check 资产更新。
- 如果项目自己的脚本仍手动调用 `powershell.exe`、`Set-Content` 或 `Out-File` 且未指定 UTF-8，仍可能出现中文显示/写入问题；这属于项目脚本层面，不是 Dong Skills hook 层面。

## 验证证据
- `node --test tests\project-ops.test.mjs`: pass，65/65。
- `node scripts\release-check.mjs .`: pass；PowerShell parse checks 显示 `via pwsh`。
- `git diff --check`: pass。

## Git 存档
- 最新提交: 待提交。
- 推送状态: 当前工作区有未提交修改。
- 已包含文件: 无。
- 有意保留未提交的文件: 本轮修改文件待提交。
- 暂缓原因: 正在执行提交前状态刷新。
- 下次存档: 提交并推送 `fix(release): prefer pwsh for PowerShell checks`。

## 下一步动作
提交并推送；随后运行安装脚本同步本机全局 Dong Skills 副本。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `scripts/release-check.mjs`
4. `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`
5. `tests/project-ops.test.mjs`