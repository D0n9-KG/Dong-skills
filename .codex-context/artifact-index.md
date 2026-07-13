# Artifact Index

## 当前任务资产

- `.codex-context/spec.md`：已批准的 prompt semantic authority removal Product Contract。
- `.codex-context/plan-progress.md`：Lane 3 Traditional execution；Tasks 1-6 完成，当前 Task 7。
- `docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`：当前 implementation-ready 详细计划。
- `docs/codex/plans/2026-07-13-dong-skills-host-stability.md`：上一轮宿主稳定性计划，作为历史证据。
- `.codex/scripts/lib/runtime.mjs`：recovery claim/promotion 与 legacy decision receipt 清理；旧 decision/advance receipt 写入/校验已删除。
- `.codex/scripts/lib/events.mjs`：advisory-only UserPromptSubmit、受控 decision operation、Stop/PreCompact、mutation freshness、pipeline、外部作用域和 PostToolUse refresh。
- `.codex/scripts/lib/recovery.mjs`：精简 SessionStart hot context；保留 recovery order、handoff、Wayfinder、workflow 与 current state，按需读取其余状态；业务 handoff sections 先于临时 PreCompact notice。
- `.codex/scripts/lib/{workflow,markdown}.mjs`：canonical decision evidence、`workflow-state decision`、evidence consumption 与结构化状态验证。
- `scripts/workflow-state.mjs`：`decision <transition>` CLI；只写 evidence，不自动 transition。
- `.codex/hooks/project-ops.mjs`：rootless `workflow-state decision` 转发。
- `.agents/skills/{using-superpowers,brainstorming,writing-plans,executing-plans,codex-verification-loop,codex-project-governance}/SKILL.md`：canonical decision 使用指导。
- `AGENTS.project-ops.snippet.md`、`AGENTS.md`、`README.md`：prompt advisory 与 deterministic control-plane 说明。
- onboarding bootstrap 对应 runtime 镜像：installer 事实源。
- `tests/domains/workflow-hooks.test.mjs`：prompt advisory、decision CLI/PreToolUse、Stop/PreCompact、mutation freshness 和 recovery 回归。
- `tests/domains/workflow-governance.test.mjs`：canonical decision evidence 与 transition 回归。
- `tests/domains/host-wrapper.test.mjs`：真实宿主 wrapper 回归。
- `tests/domains/skills-contracts.test.mjs`：root `AGENTS.md` managed block、root snippet 与 bootstrap snippet parity。
- `docs/codex/reviews/2026-07-13-dong-skills-agent-architecture-audit.md`：12 个 agent architecture 边界的 severity、修复、证据与 residual risk。

## 已读取 / 已检查

- `tests/project-ops-support.mjs`：临时项目与 hook fixture。
- `scripts/run-domain-tests.mjs`：domain 并发和超时合同。
- `scripts/release-check.mjs`：发布级验证入口。

## 临时资产

- 无 active 临时实现；旧 prompt semantic regex 权限路径已删除。

## 下一里程碑

- 完成 Task 7 全量/稳定性/release-check；随后完成 Task 8 架构审计和 Task 9 下游 live 回归。
