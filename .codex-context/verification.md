# 验证

## Task Identity

- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## Commands Run

- `node --test tests/domains/workflow-governance.test.mjs`：21/21 pass。
- `node --test tests/domains/workflow-hooks.test.mjs`：106/106 pass。
- `node --test tests/domains/core.test.mjs`：25/25 pass。
- `node --test tests/domains/health-release.test.mjs`：23/23 pass。
- `node --test tests/domains/host-wrapper.test.mjs`：5/5 pass。
- `node --test tests/domains/skills-contracts.test.mjs`：2/2 pass。
- `node scripts/run-domain-tests.mjs`：241/241 pass，12 domains。
- `node scripts/release-check.mjs .`：pass；health、context budget、syntax、PowerShell parse、domain tests、privacy、readability、large-file、runtime-artifact 全通过。
- `node .codex/hooks/project-ops.mjs health-check`：pass，Issues none；当前源码 session 的旧 liveness receipt 为 runtime-mismatch warning。
- `node .codex/hooks/project-ops.mjs asset-governance`：pass，Blocking issues none；仅 on-demand freshness/source-task semantic advisories。
- `git diff --check`：pass；仅 CRLF normalization warning。

## Not Yet Verified

- installer Preview/Apply 与下游 live host。

## 命令证据

- `node --test tests/domains/workflow-governance.test.mjs`
  - Result: pass，20/20；prompt advisory、canonical evidence、hash/task/event mismatch、verification/resume、compaction/recovery 全覆盖。
- `node --test tests/domains/workflow-hooks.test.mjs`
  - Result: pass，106/106；包含 learning advisory、bounded SessionStart recovery、PreCompact ordering、liveness/trust 与 Stop/recovery/mutation contract。
- `node --test tests/domains/core.test.mjs`
  - Result: pass，25/25；全量首轮暴露的 plan approval fixture drift 已按真实 approval contract 根因修复后复验。
- `node --test tests/domains/health-release.test.mjs`
  - Result: pass，23/23。
- `node --test tests/domains/host-wrapper.test.mjs`
  - Result: pass，5/5。
- `node --test tests/domains/skills-contracts.test.mjs`
  - Result: pass，2/2；指导要求 `workflow-state decision` 且禁止 legacy decision receipt 说明。
- `git diff --no-index` root/bootstrap `events.mjs`、`workflow.mjs`、hook launcher、workflow CLI、AGENTS snippet
  - Result: pass，无差异。
- `node scripts/run-domain-tests.mjs`
  - Result: pass，241/241，12 domains。
- `node scripts/release-check.mjs .`
  - Result: pass；所有发布门禁通过。
- `node .codex/hooks/project-ops.mjs health-check`
  - Result: pass；static configuration、runtime parity 通过，Issues none；health 明确 liveness 不证明 host trust。
- `node .codex/hooks/project-ops.mjs asset-governance`
  - Result: pass；Blocking issues none，runtime artifacts/tracked raw 为 0。
- `git diff --check`
  - Result: pass；无 whitespace error。
- `%TEMP%/dong-skills-install-transactions`
  - Result: 无 journal/backup 残留。

## Installer / 下游证据

- 本轮最终实现尚未安装；旧 distribution 与旧 live 证据不作为当前 release 结论。

## 行为证据

- prompt：普通、状态复核、hook 开关、执行期 paraphrase 全部 advisory-only，不产生授权或 freshness debt。
- canonical decision：缺失、错 task/hash/event 被拒；正确 evidence 允许 transition。
- decision CLI：写入正确 context file、保持 pending、不自动 transition；错误 pending/event 被拒；transition 后 evidence section 被消费。
- Stop/PreCompact：stale/malformed/legacy discussion marker advisory；真实 mutation/workflow/recovery/verification 负例保持 gate。
- host wrapper：只读 pipeline、外部 repo scope、空 tool response 与显式失败契约保持通过。

## Review Evidence

- `docs/codex/reviews/2026-07-13-dong-skills-agent-architecture-audit.md` 覆盖 12 个边界。
- 两个隔离只读子代理分别审查 instructions/memory/recovery/loops 与 execution/rendering/installer/persistence；结果由主代理逐项验证，审后已关闭。
- 无 unresolved High/Critical；accepted medium/low findings 均有 targeted test 和全量回归。

## 剩余验证缺口

- Task 9 下游 installer Preview/Apply、context hash 对比和 live host 连续 Stop/freshness 尚待执行。
