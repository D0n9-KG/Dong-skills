# 决策

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 已接受
- 四 hook 最小内核：`SessionStart`、`PreToolUse`、`PreCompact`、`Stop`。
- `Stop` 永不阻断；`PreCompact` 不改 handoff，只保留 bounded latest snapshot。
- `PreToolUse` 只对可确定当前项目 mutation hard gate；未知、外部、网络、浏览器和诊断 fail-open。
- shell 目标使用 tokenizer + command semantics，不用自然语言 prompt regex 推断权限。
- 合法 PowerShell `EncodedCommand` 可确定解码时按内部命令分类；无效编码保持 fail-open。
- 外部 Git 通过 workdir 或显式 `-C` / `--git-dir` + `--work-tree` 验证后不受当前项目 phase 约束。

## 已拒绝
- 保留旧九事件控制面并继续堆 allowlist。
- 删除全部 hooks。
- 让 Stop/PreCompact 制造 freshness、checkpoint、continuation 或 handoff 重写债务。
- 把 hooks 描述成完整安全 sandbox。
