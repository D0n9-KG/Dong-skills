# 资产索引

## Task Identity
- task_id: task-6-2026-07-12T15-42-07-054Z
- task_generation: 6

## 已创建
- `.codex-context/archive/tasks/task-5-2026-07-10T15-05-49-436Z/`：上一任务状态归档。

## 已修改
- `.codex/scripts/lib/events.mjs`：收紧 raw 治理修复豁免，向 checkpoint 传递统一 freshness 文件集合。
- `.codex/scripts/lib/core.mjs`：新增 `latestChangedInfo`。
- `.codex/scripts/lib/git.mjs`：checkpoint 判定与详情共用 freshness 事实源。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/{events,core,git}.mjs`：bootstrap 镜像同步。
- `tests/domains/workflow-hooks.test.mjs`：新增两个真实失败回归。
- `.codex-context/*.md`、`workflow-state.yaml`：当前任务状态和证据。

## 已读取 / 已检查
- `using-superpowers`、`systematic-debugging`、`verification-before-completion`。
- PreToolUse mutation 分类、governance repair、Stop、checkpoint、mtime 和 change-state receipt 实现。
- 相邻已有 workflow hook 回归。

## 原始输出
- 无需保留临时 probe；测试 fixture 位于系统临时目录并自动清理。
