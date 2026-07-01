# Handoff 摘要

## 目标
优化 Dong Skills Windows hooks 和中文 UTF-8 操作纪律：可用时优先 PowerShell 7 / `pwsh`，无 `pwsh` 时保持 Windows PowerShell 5.1 fallback。

## 最新用户指令
用户安装 PowerShell 7 并重启后，追问为什么 hooks 不全部切到 PowerShell 7、旧版会不会仍有乱码风险，并要求继续优化 Dong Skills。

## 已批准范围 / 规格
- 不硬依赖 `pwsh`。
- Windows `commandWindows` 继续使用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand` 兼容入口。
- encoded outer script 检测 `Get-Command pwsh`；可用时委派内层 encoded hook 到 `pwsh`；不可用时走旧 fallback。
- health check 和测试必须防止发布资产回退。
- AGENTS 和工具映射必须说明中文 Markdown 的 UTF-8 验证纪律。

## 计划状态
- 实施状态：代码和文档改动已完成。
- 验证状态：通过。
- Checkpoint 状态：待完整验证通过后提交并推送。

## 已修改文件
- `.codex/hooks.json`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
- `scripts/project-ops-health.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`
- `tests/project-ops.test.mjs`
- `AGENTS.md`
- `AGENTS.project-ops.snippet.md`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`
- `.agents/skills/using-superpowers/references/codex-tools.md`
- `.codex-context/current-state.md`
- `.codex-context/spec.md`
- `.codex-context/plan-progress.md`
- `.codex-context/workflow-state.yaml`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已读取但未修改文件
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/codex-skill-evolution/SKILL.md`
- `package.json` 不存在，验证入口为现有 Node 脚本和测试文件。

## 已做决策
- 正确策略不是“全部切到 `pwsh`”，而是“外层兼容，内层优先 `pwsh`”。
- 中文文件是否损坏不能用 Windows PowerShell 5.1 的默认显示直接判断，应使用 `pwsh`、Node UTF-8 读取或显式 UTF-8 reader。
- bootstrap 资产必须和 root 资产同步，否则旧项目更新/新项目初始化会拿不到修复。

## 开放问题与假设
- 无阻塞开放问题。
- 假设：没有 PowerShell 7 的环境仍应能运行 hooks，只是中文显示稳定性不如 `pwsh`。

## 风险
- `commandWindows` encoded 字符串很长，人工审查困难；已用测试解码 outer/inner 脚本并用 health check 约束形状。
- 若 Codex UI 的 hook 执行环境找不到 `pwsh`，会自动 fallback 到旧逻辑，不会因此失效。

## 验证证据
- 已完成定向测试：`node --test tests\project-ops.test.mjs --test-name-pattern "Windows hook|published Windows hook|health check rejects Windows encoded"`，64/64 pass。
- `node --test tests\project-ops.test.mjs`: pass，64/64。
- `node scripts\release-check.mjs .`: pass。
- `git diff --check`: pass，仅有 Git CRLF normalization warnings。
- `node .codex\hooks\project-ops.mjs health-check`: pass，Issues none。

## Git 存档
- 最新提交: `396dcc3 feat(skills): localize project state documents`。
- 推送状态: 当前 `main...origin/main`，本轮改动尚未提交。
- 已包含文件: 本轮改动尚未提交；验证通过后将包含 hook 配置、bootstrap 镜像、health check、测试、AGENTS 规则和 `.codex-context` 状态文件。
- 有意保留未提交的文件: 当前无；等待提交推送。
- 暂缓原因: 无，准备提交。
- 下次存档: 本轮 `pwsh` hook 优化验证通过后。

## 需要保留的经验沉淀
- Windows hook 兼容策略应优先“检测并委派”而不是硬切命令入口。
- 中文用户可读文档要按 UTF-8 验证；PowerShell 5.1 的显示问题不等于文件内容损坏。
- 对发布资产中的 encoded command，测试应解码检查语义，而不是只检查字符串存在。

## 下一步动作
提交并推送，然后给用户旧项目更新提示词。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex-context/spec.md`
4. `.codex-context/plan-progress.md`
5. `.codex/hooks.json`
6. `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`
7. `scripts/project-ops-health.mjs`
8. `tests/project-ops.test.mjs`
