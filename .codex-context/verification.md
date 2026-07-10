# 验证

## 本轮可靠性补强
- `node scripts/run-domain-tests.mjs`
  - Result: pass
  - Evidence: 114/114 tests across 10 domains; concurrency 4; 91.7 seconds elapsed.
  - Date: 2026-07-10 16:36 +08:00.
- `node scripts/project-ops-health.mjs .`
  - Result: pass
  - Evidence: source checkout、workflow/schema、runtime parity 和 worktree diagnostics 无问题。
  - Date: 2026-07-10 16:38 +08:00.
- `node --test tests/domains/bootstrap-recovery.test.mjs`
  - Result: pass
  - Evidence: 7/7；覆盖 active rollback、closed cleanup 强杀、closed cleanup 普通异常、损坏 journal、并发锁和 locked raw。
- `node --test tests/domains/memory-evolution.test.mjs`
  - Result: pass
  - Evidence: 16/16；超时分类、后续 case 继续和严格正整数 timeout 校验通过。
- 真实临时 bootstrap 与安装副本 bootstrap
  - Result: pass
  - Evidence: source bootstrap health 与已安装 onboarding bootstrap health 均通过；临时目录已清理。

## 本轮 Review
- P1 closed cleanup 强杀窗口：先删 backup 后删 journal 会永久阻断恢复；已用 `status: closed` 和幂等 cleanup 修复。
- P1 closed cleanup 异常回滚：外层 catch 会恢复已提交旧集合；已限定只有 active 事务可 rollback。
- P2 非 Dong 技能误判：无 previous/staging 时 repair 提前返回，原有预检保护恢复。
- P3 timeout 参数截断：改用严格 `Number` + safe integer 校验。
- Simplicity: 无新增依赖；复用现有 lock、entry snapshot、SHA256/path guard 和 domain runner。

## 最终发布证据
- `node scripts/release-check.mjs .`
  - Result: pass
  - Evidence: health、context budget、Node/PowerShell syntax、114 domain tests、privacy、readability、large-file 和 runtime-artifact 全部通过。
  - Date: 2026-07-10 16:51 +08:00.
- 最终全局同步与 installed health
  - Result: pass
  - Evidence: 最终源码重同步到 `%USERPROFILE%\.agents\skills`；安装副本 bootstrap 临时项目 health 通过。
  - Date: 2026-07-10 16:54 +08:00.
- 残留扫描
  - Result: pass
  - Evidence: 无 install journal、backup、`.previous-*`、`.staging-*` 或最终临时项目残留。
- workflow completion
  - Result: pass
  - Evidence: `execution-complete`、`verification-pass`、`review-complete`、`checkpoint-deferred`、`delivery-complete` 均成功；phase=`complete`，next_skill=`none`。

## 已运行命令
- `node scripts/run-domain-tests.mjs`
  - Result: pass
  - Evidence: 114/114 tests across 10 domains; concurrency 4; 91.7 seconds elapsed.
  - Date: 2026-07-10.
- `node --test tests/domains/memory-evolution.test.mjs`
  - Result: pass
  - Evidence: 16/16；包含 forward timeout、严格 timeout 参数和后续 case 继续执行。
- `node --test tests/domains/core.test.mjs tests/domains/workflow-hooks.test.mjs`
  - Result: pass
  - Evidence: 41/41；包含 handoff hash/task identity 和 complete recovery 回归。
- `node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json --root . --read-output-dir .codex-context/raw/skill-forward-eval/independent-agent-2026-07-10`
  - Result: pass
  - Evidence: 4/4，2 train + 2 held-out；独立 agent 未读取 expected 条件。
- `node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json --root . --backend <installed-codex-native> ...`
  - Result: pass
  - Evidence: 修复 Codex CLI 与 FlClash 网络链路后，真实 `codex.exe` backend 直接重跑 4/4，2 train + 2 held-out；使用临时 session、只读 sandbox 和独立 raw output。
- `node scripts/project-ops-health.mjs .`
  - Result: pass
  - Evidence: workflow/schema、root/bootstrap parity、manifest、runtime helper 和安装身份无问题。
- 全局安装与真实 bootstrap
  - Result: pass
  - Evidence: source receipt v2、manifest SHA256、三个全局入口完整文件集/哈希、全局 onboarding 临时 bootstrap、installed health、workflow/recovery runtime hash 全部通过。
- `node scripts/release-check.mjs .`
  - Result: pass
  - Evidence: health、context budget、Node/PowerShell syntax、114 domain tests、privacy、readability、large-file 和 runtime-artifact 全部通过；100.2 秒。
- workflow completion
  - Result: pass
  - Evidence: `execution-complete`、`verification-pass`、`review-complete`、`checkpoint-deferred`、`delivery-complete` 均成功；phase=`complete`，next_skill=`none`。

## Review
- 独立 reviewer 首轮发现 3 个 P1：否定 Artifact Readiness 误判、否定 Loop Review 误判、空 Wayfinder 误通过。
- 三项均已在共享 parser/recovery runtime 根因修复，并增加反例测试；根 runtime 与 bootstrap 镜像哈希一致。
- 本地复核未发现新的 P0/P1；无第三方依赖、无自动提交/推送，原有 fail-closed、transaction、lock 和 privacy 边界保持。

## 产品证据
- `not implementation-ready; requirements-only` 无法获得执行审批。
- `Loop Review: not completed` 无法写入 `loop_review_status: approved`。
- 空 Active Wayfinder 文件使 recovery evaluator 失败。
- SessionStart 恢复包含受限 Wayfinder 摘要，恢复 skill 明确 handoff-first 和 evaluator gate。
- forward backend 只收到 prompt 与 skill 内容；判定条件不进入请求，raw output 先落盘再 judge。
- 缺失 backend、缺少 held-out、required/forbidden 失败和 hook root 参数路径均有测试。
- 真实 CLI 首轮 `requirements-only-plan` 输出正确停止编码并补全计划，但因场景要求精确词面而假阴性；场景改为“停止执行 + 补全计划 + 具体计划要素”的语义 alternatives 后，同一 raw output 与直接 backend 重跑均通过。

## 尚未验证
- 未模拟断电恰好发生在 rollback 恢复过程中。
- 未做超大 `.codex-context` 临时磁盘压力测试。

## 已运行命令
- `node .codex/hooks/project-ops.mjs workflow-state hash --write`
  - Result: pass
  - Evidence: 重新计算六个受管上下文文件并更新 workflow handoff hash。
  - Date: 2026-07-10 16:58 +08:00.
- `node scripts/release-check.mjs .`
  - Result: pass
  - Evidence: health、context budget、Node/PowerShell syntax、domain-sharded tests、privacy、readability、large-file 和 runtime-artifact 全部通过；退出码 0，耗时 99.8 秒。
  - Date: 2026-07-10 16:58 +08:00.

## 发布与本机同步
- `git push origin main`
  - Result: pass
  - Evidence: 远端 `refs/heads/main` 与本地功能提交均为 `868884aaf827837d593b95614e754d648d02c6d7`。
  - Date: 2026-07-10 17:28 +08:00.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/install-windows.ps1`
  - Result: pass
  - Evidence: 从真实源码重新安装三个全局入口 skill，并更新 source receipt。
  - Date: 2026-07-10 17:28 +08:00.
- `Get-TreeSha256` receipt parity verification
  - Result: pass
  - Evidence: manifest SHA256 匹配；`codex-codebase-onboarding`、`using-superpowers`、`codex-skill-evolution` 的实际安装目录 tree SHA256 与 receipt 全部一致；无事务残留。
  - Date: 2026-07-10 17:28 +08:00.
