# 当前状态

## 目标
修复 Dong Skills hooks 的 change-state receipt/fingerprint、命令分类和误阻断问题，并审查治理层是否会干扰 Codex 的正常探索、调试、验证、review、多智能体与跨 session 推进。

## 最新用户指令
整体仔细审查近期 hooks 优化，重点核实 change-state receipt 的 fingerprint/刷新判断，并修复会干扰模型或阻碍项目推进的问题。

## 当前阶段
verified / checkpoint pushed；workflow closure pending

## 当前假设
- 当前工作继续沿用 Lane 3、Traditional task-by-task execution。
- 硬门只保护批准范围、恢复、破坏性操作、真实本地 mutation 和交付证据；普通读取、搜索、测试和原生多智能体完成不应产生额外债务。
- hooks 是支持路径 guardrail，不是完整 shell 或 MCP 安全沙箱。

## 当前结果
- change-state receipt 已修复：同任务连续 mutation 累积；无变化测试和仅提交操作不清空已完成刷新；未知/失败结果不授予刷新；intent 绑定 session、task 与 `tool_use_id`。
- shell 分类已修复：只读管道、引号内 `>`/`|`/写命令文本、`$null`/`/dev/null`/流合并保持只读；PowerShell 文件写入别名和明确复合写工具受前置门禁；任意本地 opaque shell 必须通过 workflow/recovery/approval。
- 未知外部/自定义工具不默认阻断；有 `tool_use_id` 时记录调用前 Git 基线，只有真实调用后变化才进入 change-state。
- 普通 Read/Search 不制造 working-notes/Stop 债务；PostToolUse 只提醒 artifact freshness，不中断下一工具；SubagentStop 只产生质量警告。
- verification/review/delivery/handoff 的真实项目 mutation 自动回到 debugging 并失效旧 verification/review evidence。
- root runtime、bootstrap 镜像、README、AGENTS/snippet 和 skills 合同已同步。
- 完整验证：204/204 tests across 11 domains；最终 hooks/workflow 104/104；health、release check、installer preview、runtime parity、`git diff --check` 均通过。

## 下一步动作
1. 主功能 checkpoint `2ac0c55` 已推送到 `origin/main`。
2. 完成 workflow 状态收口并运行真实安装同步。
3. 旧项目仍需重新 bootstrap 才能获得最新项目级 hooks/runtime。

## 最后更新
2026-07-11。

## 阻塞项
- 无实现阻塞。
- 仍等待用户是否提交/推送的明确指令。
