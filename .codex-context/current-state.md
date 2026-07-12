# 当前状态

## 目标
修复 Dong Skills hooks 的 change-state receipt/fingerprint、命令分类和误阻断问题，并审查治理层是否会干扰 Codex 的正常探索、调试、验证、review、多智能体与跨 session 推进。

## 最新用户指令
提交并推送已完成的 Stop hook 修复，然后整体逐个审查当前 Dong Skills，重点发现近期新增/修改后可能存在的问题、实际使用风险和可优化点。

## 当前阶段
审查完成；新增验证入口诊断修复已验证；等待提交推送。

## 当前假设
- 当前工作继续沿用 Lane 3、Traditional task-by-task execution。
- 硬门只保护批准范围、恢复、破坏性操作、真实本地 mutation 和交付证据；普通读取、搜索、测试和原生多智能体完成不应产生额外债务。
- hooks 是支持路径 guardrail，不是完整 shell 或 MCP 安全沙箱。

## 当前结果
- 本轮先确认上一轮 Stop hook 修复已提交并推送：`09b5748 fix(hooks): close Stop state refresh loops`，`main...origin/main` 干净。
- 逐项审查发现一个真实问题：`scripts/run-domain-tests.mjs` 原来在完整 release-check 超时或长时间运行时不会实时输出域测试进度，也没有单域硬超时，导致发布检查卡住时无法定位卡在哪个 domain。
- 已修复测试 runner：实时输出每个 domain start/done、支持 `DONG_DOMAIN_TEST_TIMEOUT_MS`、默认单域 300 秒硬超时、超时后终止子进程并报告失败域。
- 28 个 skill 均在 manifest 中，frontmatter 名称一致，核心 workflow skill 都有审批边界和状态文件触点；未发现 missing manifest 或未适配的 Claude-only 引用。
- root runtime 与 onboarding bootstrap 镜像的关键 hooks/scripts hash 一致。
- 完整 `node scripts/release-check.mjs .` 已通过。
- change-state receipt 已修复：同任务连续 mutation 累积；无变化测试和仅提交操作不清空已完成刷新；未知/失败结果不授予刷新；intent 绑定 session、task 与 `tool_use_id`。
- shell 分类已修复：只读管道、引号内 `>`/`|`/写命令文本、`$null`/`/dev/null`/流合并保持只读；PowerShell 文件写入别名和明确复合写工具受前置门禁；任意本地 opaque shell 必须通过 workflow/recovery/approval。
- 未知外部/自定义工具不默认阻断；有 `tool_use_id` 时记录调用前 Git 基线，只有真实调用后变化才进入 change-state。
- 普通 Read/Search 不制造 working-notes/Stop 债务；PostToolUse 只提醒 artifact freshness，不中断下一工具；SubagentStop 只产生质量警告。
- verification/review/delivery/handoff 的真实项目 mutation 自动回到 debugging 并失效旧 verification/review evidence。
- root runtime、bootstrap 镜像、README、AGENTS/snippet 和 skills 合同已同步。
- 完整验证：204/204 tests across 11 domains；最终 hooks/workflow 104/104；health、release check、installer preview、runtime parity、`git diff --check` 均通过。

## 下一步动作
1. 提交并推送 `scripts/run-domain-tests.mjs` 的诊断修复及状态记录。
2. 最终答复用户：说明已推送、逐项审查结果、剩余低风险建议。
3. 旧项目仍需重新 bootstrap 才能获得最新项目级 hooks/runtime。

## 最后更新
2026-07-12。

## 阻塞项
- 无。
