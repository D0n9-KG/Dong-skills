# Handoff 摘要

## 目标
完成 Dong Skills recovery、forward timeout、installer 持久事务/精确快照和 bootstrap 测试拆分的可靠性补强。

## 最新用户指令
提交并推送本轮可靠性修复，并确认本机 Dong Skills 安装副本已同步到最新源码。

## 已批准范围 / 规格
- 活跃 recovery 必须验证 handoff hash 与 task identity；complete + `next_skill: none` 合法。
- forward-eval 单 case timeout 必须 fail closed，并继续后续 case。
- installer 必须支持进程终止后的恢复、closed cleanup 幂等、精确 managed-file 快照和同名非 Dong 技能保护。
- bootstrap 测试拆为 install、integrity、recovery/并发域。
- 不引入第三方依赖，不修改 substring judge、网络要求或未批准流程。

## 计划状态
Task 1-5、独立 review 修复、最终 release check、Git 提交/推送、全局重同步、receipt/hash 校验、残留扫描和 workflow transitions 全部完成。

## 已修改文件
见 `.codex-context/artifact-index.md`。本轮核心为 workflow/recovery runtime、forward-eval timeout、两份 Windows installer、workflow-state 模板和三个 bootstrap 测试域。

## 已读取但未修改文件
- 全局安装 receipt 与入口 skill 安装副本仅用于验证；源码事实源仍是当前仓库。

## 已做决策
- handoff hash 写入时绑定 task id/generation；新任务重置三者。
- complete recovery 不要求活跃 next action，但 active recovery 必须有新鲜 hash/identity。
- journal v1 增加兼容状态：无 `status` 按 active，closed 只完成清理、不 rollback。
- repair 仅在存在 `.previous-*`/`.staging-*` 证据时介入。
- forward timeout 使用 Node 标准库，严格正整数参数，不增加依赖。
- 测试按真实行为域拆分，测试名称和断言保持唯一归属。

## 开放问题与假设
- 未模拟 rollback 恢复操作本身再次断电。
- 未压力测试超大 managed context/runtime 集合。
- backend 若创建 detached 子进程，直接进程 timeout 未证明会清理整棵进程树。

## 风险
- bootstrap-recovery 域约 74 秒，仍是完整套件瓶颈，但分域后完整墙钟约 92 秒，低于旧单体约 125 秒。
- journal 路径和资源范围依赖 Windows 路径规范化；跨平台 installer 不在本轮范围。
- 旧项目需要重新 bootstrap 才会获得新模板和 runtime。

## 验证证据
- 完整领域测试：114/114，10 domains，concurrency 4，91.7 秒。
- recovery 域：7/7；memory-evolution：16/16；bootstrap-install：5/5。
- source health：pass。
- 真实临时 bootstrap、最终安装副本 bootstrap/health 和残留扫描：pass。
- 最终 release check：pass，包含 114 domain tests 和全部发布门禁。
- workflow completion：pass，phase=`complete`，next_skill=`none`，checkpoint=`done`。
- 远端发布：`origin/main` 已包含功能提交 `868884aaf827837d593b95614e754d648d02c6d7`。
- 本机安装：manifest SHA256、三个全局入口 skill 的 receipt tree SHA256 与实际目录全部一致；无 journal、backup、staging 或 previous 残留。

## Git 存档
- 最新功能提交: `868884aaf827837d593b95614e754d648d02c6d7`（`fix(project-ops): harden recovery and install transactions`）。
- 推送状态: 已推送至 `origin/main`；本文件所在 checkpoint 状态收口提交将紧随其后推送。
- 已包含文件: recovery/workflow runtime、forward-eval timeout、Windows installer 事务恢复、bootstrap 镜像、测试拆分及配套状态文档。
- 有意保留未提交的文件: 仅本 checkpoint 状态收口文件，提交后应为空。
- 暂缓原因: 无。
- 下次存档: 后续出现新的已验证功能变更时。

## 下一步动作
本轮交付完成；后续仅在用户提出新任务时启动新的 workflow task。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/verification.md`
3. `.codex-context/plan-progress.md`
4. `.codex/scripts/lib/workflow.mjs`
5. `.codex/scripts/lib/recovery-eval.mjs`
6. `scripts/skill-forward-eval.mjs`
7. `scripts/install-windows.ps1`
8. `.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`
9. `tests/domains/bootstrap-recovery.test.mjs`
10. `tests/domains/workflow-hooks.test.mjs`

## 需要保留的经验沉淀
