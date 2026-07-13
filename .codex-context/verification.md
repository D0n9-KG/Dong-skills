# 验证

## Task Identity

- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## Commands Run

- `node scripts/run-domain-tests.mjs`：233/233 pass。
- `node scripts/release-check.mjs .`：pass。
- installer Preview/Apply、下游 workflow/health/recovery/context/asset checks：pass；live liveness 待重启。

## Not Yet Verified

- 用户重启并 trust 新 hooks 后的真实 PreToolUse、PostToolUse、Stop critical coverage 与 native subagent prompt isolation。

## 命令证据

- `node --test tests/domains/workflow-hooks.test.mjs`
  - Result: pass，101/101。
- `node scripts/run-domain-tests.mjs`
  - Result: pass，233/233，12 domains，concurrency 4。
- `node scripts/release-check.mjs .`
  - Result: pass；health、context budget、MJS syntax、PowerShell parse、domain tests、privacy、readability、large-file、runtime-artifact scans 全部通过。
- `node --test tests/domains/host-wrapper.test.mjs`
  - Result: pass，5/5。
- recovery/host-wrapper 关键 9 项
  - Result: 连续 3 轮 pass。
- `git diff --no-index` root/bootstrap `events.mjs`、`runtime.mjs`
  - Result: pass，无差异。
- `git diff --check`
  - Result: pass；仅 Windows CRLF warning，无 whitespace error。
- `%TEMP%/dong-skills-install-transactions`
  - Result: 无 journal/backup 残留。

## Installer / 下游证据

- Preview
  - Result: pass；只替换 Dong managed global/project skills、runtime/hooks、AGENTS managed block 与 receipts，context 采用 merge。
- Apply
  - Result: pass；最终 distribution ID=`6de4533c325cb9cf8026622fa00f4df2a31ecb57f569ccb3857aa9de1af168a7`。
- `scientific_Graph` workflow migrate/status/hash/recovery/next
  - Result: pass；恢复 `phase=wayfinding`，`next_skill=codex-wayfinder`，`decision_required=none`。
- `scientific_Graph` health
  - Result: pass；Static configuration pass、Runtime parity pass、Issues none。
  - Warning: hooks 由用户暂时关闭且 runtime 已更新，liveness 为 runtime-mismatch，待重启/trust 后复验。
- context budget
  - Result: pass；hot recovery path 约 12,268 tokens。
- asset governance
  - Result: pass；blocking issues none；保留 1 个可安全清理的旧 PreCompact snapshot、122.8 MB raw footprint advisories。

## 行为证据

- recovery：fresh unscoped 可替换 stale scoped；single claim；promotion failure consumes unscoped and denies。
- pipeline：简单 `Get-Content | Select-Object` 放行；含 scriptblock/subexpression/delete 的 pipeline deny。
- external scope：显式 external apply_patch/parsed mutation/verified control-plane 允许；无 workdir 的外部绝对脚本和 unknown relative script deny。
- PostToolUse：`{}` + 内容变化记录 refresh；显式失败或 no-op 不记录。
- subagent isolation：tool/agent-originated prompt 不创建 parent discussion marker 或 observations；正常 UserPromptSubmit 仍按契约工作。

## Review Evidence

- 本地 agent architecture/security review：修复外部绝对路径绕过、unknown external script 豁免、recovery promotion 顺序、错误优先级和 subagent prompt 污染。
- Simplicity review：复用现有 runtime lock、content hash、control-plane parser 和 domain runner；无新依赖、无新持久状态类型。
- 两个独立审查代理因平台 503 不可用，未当作审查证据。

## 剩余验证缺口

- 用户重启并 trust 新 hooks 后，补真实宿主 PreToolUse、PostToolUse、Stop critical coverage、连续 Stop freshness 和 native subagent prompt isolation。
- 一次 Wayfinder Stop 测试在初次高并发 glob 中失败；随后 targeted、整域与正式 domain runner 均通过，当前无法复现。断言已增加完整 hook 输出，作为残余 flake 监测。
