# 资产索引

## 本轮新增 / 修改
- `.codex/scripts/lib/assets.mjs`: 新增 semantic state advisory 检测与 raw footprint 统计。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/assets.mjs`: 同步 bootstrap runtime 镜像。
- `scripts/asset-governance.mjs`: 新增 raw footprint warning 参数 `--raw-total-warn-mb`、`--raw-largest-warn-mb`。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/asset-governance.mjs`: 同步 bootstrap script 镜像。
- `scripts/project-ops-health.mjs`: 新增非阻断 semantic context warnings。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/project-ops-health.mjs`: 同步 bootstrap script 镜像。
- `scripts/release-check.mjs`: 增加 32MB command buffer，避免 domain test 输出较大时误失败。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/scripts/release-check.mjs`: 同步 bootstrap script 镜像。
- `.agents/skills/codex-asset-governance/SKILL.md`: 增加 active state semantics、raw footprint、semantic drift 处理规则。
- `.agents/skills/codex-docs-stewardship/SKILL.md`: 增加状态文件语义卫生与维护任务收口规则。
- `.agents/skills/codex-project-governance/SKILL.md`: 增加 Dong Skills 维护结束后恢复业务项目 handoff 焦点的规则。
- `AGENTS.project-ops.snippet.md`: 根 snippet 增加 active state semantic 约束与 asset-governance 新输出说明。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/AGENTS.project-ops.snippet.md`: 同步 bootstrap snippet。
- `tests/domains/assets-worktree.test.mjs`: 增加 asset-governance semantic drift/raw footprint 回归测试。
- `tests/domains/health-release.test.mjs`: 增加 health warning 不 fail 回归测试，并锁定 release-check maxBuffer。

## 外部样本
- `C:\Users\D0n9\Desktop\scientific_Graph`: 只读检查的旧项目样本；用于发现真实使用中的状态语义漂移，不在本轮修改。

## 验证产物
- 待本轮最终复核运行后写入 `.codex-context/verification.md`。

## 原始输出
- 本轮未新增需要长期保存的 raw 输出。

## 最新刷新
2026-07-12：记录语义状态治理修复的代码、技能文档、bootstrap 镜像和测试资产。