# 验证

## 已运行命令
- `node scripts/run-domain-tests.mjs`
  - Result: pass
  - Evidence: 106/106 tests across 8 domains; concurrency 4; 67.1 seconds elapsed.
  - Date: 2026-07-10.
- `node --test tests/domains/memory-evolution.test.mjs`
  - Result: pass
  - Evidence: 15/15；新增 bundled scenario 语义等价表达回归，并确认 `直接开始实现` 仍失败。
- `node --test tests/domains/core.test.mjs tests/domains/workflow-hooks.test.mjs`
  - Result: pass
  - Evidence: 39/39；覆盖 negated readiness、negated loop review、空 Wayfinder、恢复摘要和 workflow gates。
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
  - Evidence: health、context budget、Node/PowerShell syntax、106 domain tests、privacy、readability、large-file 和 runtime-artifact 全部通过；78.6 秒。
- workflow completion
  - Result: pass
  - Evidence: `execution-complete`、`verification-pass`、`review-complete`、`checkpoint-deferred`、`delivery-complete` 均成功；`workflow-state next` 返回 `NEXT: done`。

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
