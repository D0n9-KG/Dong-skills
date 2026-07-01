# 验证

## 已运行命令
- `node --test tests\project-ops.test.mjs --test-name-pattern "Windows hook|published Windows hook|health check rejects Windows encoded"`
  - Result: pass
  - Evidence: Node test runner 实际执行该文件全部测试，64/64 tests passed。覆盖 Windows hook encoded command、`pwsh` 优先路径、fallback 和 health check 拒绝错误 hook。
  - Date: 2026-07-01 本地时间。
- `node --test tests\project-ops.test.mjs`
  - Result: pass
  - Evidence: 64/64 tests passed。
  - Date: 2026-07-01 本地时间。
- `node scripts\release-check.mjs .`
  - Result: pass
  - Evidence: health-check、context budget、Node syntax checks、PowerShell parse checks、完整 Node tests、privacy scan、text readability scan、large file scan、runtime artifact scan 均通过。
  - Date: 2026-07-01 本地时间。
- `git diff --check`
  - Result: pass
  - Evidence: 无 whitespace error；仅有 Git CRLF normalization warnings。
  - Date: 2026-07-01 本地时间。
- `node .codex\hooks\project-ops.mjs health-check`
  - Result: pass
  - Evidence: Issues none；hook/script/state/bootstrap parity 均无问题。
  - Date: 2026-07-01 本地时间。
- `git push origin main`
  - Result: pass
  - Evidence: `main` 从 `396dcc3` 推进到 `1a77fa9`。
  - Date: 2026-07-01 本地时间。

## 待运行命令
- 无。

## 产品证据
- `.codex/hooks.json` 的 `commandWindows` 外层 encoded script 包含 `Get-Command pwsh`、`& $pwsh.Source -NoProfile -EncodedCommand` 和 `} else {` fallback。
- bootstrap 镜像 `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/hooks.json` 已同步同样 hook。
- `scripts/project-ops-health.mjs` 会在缺少 `pwsh` 优先路径或 fallback 时报告问题。

## 尚未验证
- 尚未在一个真实旧业务项目重新运行 bootstrap 并观察 Codex UI hooks 展示；本轮先通过发布资产、测试和 health check 覆盖。
