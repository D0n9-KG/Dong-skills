# 验证

## 已运行命令
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 63/63 tests passed. 覆盖中文状态模板、中文/英文标题 health check 兼容、中文 Git 存档字段、中文 verification 归档、bootstrap 安装资产和既有流程回归。
  - Date: 2026-07-01 01:00 本地时间。
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过。
  - Date: 2026-07-01 01:03 本地时间。
- `node .codex\hooks\project-ops.mjs health-check`
  - Result: pass
  - Evidence: worktree、Git root、branch、hook/script/state/bootstrap parity 均无问题。
  - Date: 2026-07-01 01:24 本地时间。
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warnings。
  - Date: 2026-07-01 01:24 本地时间。

## 产品证据
- bootstrap 静态模板 `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/spec.md` 已包含 `## 审批状态`、`## 事实优先级`、`## 工作类别 / 风险等级`。
- `project-ops-health.mjs` 接受中文状态文档标题，同时保持英文旧项目兼容。
- `state-prune.mjs` 接受中文 `## 已运行命令` 并写入中文 `## 已归档证据`。

## 尚未验证
- 尚未在一个真实旧业务项目里重新 bootstrap 并人工查看 UI hooks 显示；代码路径和测试夹具已覆盖安装生成内容。
