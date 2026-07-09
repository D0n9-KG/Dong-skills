# 资产索引

## 已创建
- 无。

## 已修改
- `.codex/scripts/lib/workflow.mjs`: 增加 `workflow-state.yaml` 与 `spec.md` / `plan-progress.md` 的一致性检查，并避免把模板示例误判为真实审批。
- `.codex/scripts/lib/events.mjs`: `PostToolUse` 在探索/分析类工具后提前提示刷新 `working-notes.md`。
- `.codex/scripts/lib/assets.mjs`: `asset-governance --apply` 支持在安全时归档临时 `PreCompact Emergency Notice` 并恢复正常 handoff。
- `.codex/scripts/lib/git.mjs`: checkpoint 状态接受治理/上下文文件的 checkpoint-finalize tail，避免提交后记录提交信息形成小循环。
- `scripts/project-ops-health.mjs`: 增加 workflow/spec/plan 一致性审计和中文/英文审批状态解析修复。
- `scripts/release-check.mjs`: 增加 ANSI escape / 异常控制字符扫描，避免 hook 摘要显示噪声进入发布资产。
- `tests/project-ops.test.mjs`: 增加状态一致性、模板误判、PostToolUse 提前提醒、PreCompact notice 归档等回归测试。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/...`: 同步上述运行时脚本与 bootstrap 资产镜像。
- `AGENTS.md` / `AGENTS.project-ops.snippet.md`: 更新状态一致性、PostToolUse 提前提醒、PreCompact notice 生命周期和 asset governance 规则。
- `README.md`: 更新常用命令和治理行为说明。
- `.agents/skills/codex-asset-governance/SKILL.md`: 明确 Safe-Auto / Confirm-First 分类和 PreCompact notice 清理路径。
- `.agents/skills/codex-git-checkpoint/SKILL.md`: 增加 checkpoint-finalize tail 规则。
- `docs/improvements/backlog.md`: 记录本轮 P0 状态一致性与收尾闭环优化已完成。
- `.codex-context/current-state.md` / `artifact-index.md` / `verification.md` / `handoff-summary.md` / `workflow-state.yaml`: 刷新本轮真实状态。

## 已读取 / 已检查
- 全局安装副本中的 `using-superpowers/SKILL.md`
- 全局安装副本中的 `codex-skill-evolution/SKILL.md`
- `.codex/scripts/lib/markdown.mjs`
- `.codex/scripts/lib/templates.mjs`
- 相关 diff 和测试输出。

## 原始输出
- 未新增 raw 输出。

## 最新刷新
- 2026-07-09：记录状态一致性、提前提醒、PreCompact notice 归档、checkpoint tail 和 release readability 扫描优化。
