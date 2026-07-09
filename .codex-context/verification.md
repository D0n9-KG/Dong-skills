# 验证

## 已运行命令
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 69/69 tests passed；覆盖 workflow-state/doc mismatch、模板示例不误判为审批、PostToolUse 提前提醒、PreCompact notice 归档、checkpoint/asset 既有行为。
  - Date: 2026-07-09 本地时间
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过。
  - Date: 2026-07-09 本地时间
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warning。
  - Date: 2026-07-09 本地时间

## 产品证据
- `workflow-state status` / hooks / `health-check` 会报告 `workflow-state.yaml`、`spec.md`、`plan-progress.md` 的状态矛盾。
- `PostToolUse` 在探索类工具后能提前给出 `working-notes.md` 刷新提示，不再只等 Stop。
- `asset-governance --apply` 能安全归档临时 PreCompact handoff notice。
- release check 会扫描 ANSI escape 和异常控制字符，降低 hook 摘要显示噪声发布风险。

## 尚未验证
- 尚未重新运行安装脚本同步本机全局 Dong Skills 副本；下一步执行。
