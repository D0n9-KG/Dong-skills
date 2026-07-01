# 计划进度

## 当前计划
优化 Dong Skills Windows hook 启动策略：兼容旧 `powershell.exe` 外壳，优先委派 PowerShell 7 / `pwsh`，并补齐中文 UTF-8 文件处理纪律。

## 规格审批
用户已明确要求继续优化 Dong Skills；本项是已讨论清楚的兼容性修补。

## 执行审批
用户要求“优化一下 Dong Skills”，按传统逐项执行模式推进。

## 工作类别 / 风险等级
Lane 1 / Lane 2：hook 配置、bootstrap 镜像、health check、测试和文档规则更新。

## 执行模式
Traditional task-by-task execution。

## Goal 模式目标
未选择 Goal mode。

## 运行约束
- 不硬依赖 `pwsh`。
- 保持 `-EncodedCommand`。
- 根目录 project-ops 资产和 onboarding bootstrap 镜像必须同步。
- 中文用户可读 Markdown 按 UTF-8 处理。
- 不修改非 Dong Skills 的本地 skills。

## 存档节奏
完整验证通过后提交并推送。

## 验收映射
- `.codex/hooks.json`：Windows hook 外层兼容 `powershell.exe`，内部优先 `pwsh` 并保留 fallback。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json`：bootstrap 新项目拿到同样 hook。
- `scripts/project-ops-health.mjs` 与 bootstrap 镜像：检查 `pwsh` 优先路径和 fallback。
- `tests/project-ops.test.mjs`：覆盖 outer/inner encoded command。
- `AGENTS.md`、`AGENTS.project-ops.snippet.md`、bootstrap snippet、`codex-tools.md`：写明 Windows / 中文 UTF-8 操作纪律。

## 测试场景
- `node --test tests\project-ops.test.mjs`
- `node scripts\release-check.mjs .`
- `node .codex\hooks\project-ops.mjs health-check`
- `git diff --check`

## 任务
- [x] 审查当前差异，确认没有把 hooks 硬切到 `pwsh`。
- [x] 同步 root hook 配置和 bootstrap hook 配置。
- [x] 增加 health check 约束。
- [x] 增加测试覆盖。
- [x] 增加 Windows / UTF-8 操作纪律。
- [x] 刷新 `.codex-context` 主动状态文档。
- [x] 运行完整验证。
- [x] 提交并推送。

## 当前步骤
交付结果和旧项目更新提示词。

## 验证
- `node --test tests\project-ops.test.mjs`: pass，64/64 tests。
- `node scripts\release-check.mjs .`: pass，包含 health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan。
- `git diff --check`: pass，仅有 Git CRLF normalization warnings。
- `node .codex\hooks\project-ops.mjs health-check`: pass，Issues none。
- `git push origin main`: pass，远端 `main` 已更新到 `1a77fa9`。

## 范围外
- 不做 Claude Code 迁移。
- 不改跨平台 installer。
- 不碰用户本地非 Dong Skills 的 skills。
