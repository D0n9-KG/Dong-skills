# Dong Skills 最小 Hook 内核实施计划

## Product Contract

- 规格：`.codex-context/spec.md`。
- 用户可见结果：正常读取、联网、浏览器、外部仓库和服务诊断不再被项目 workflow 阻断；明确当前项目写入仍受阶段门禁；Stop/PreCompact 不再制造循环；热恢复路径显著缩短。
- 非目标：完整 shell/network sandbox、删除用户事实、修改下游业务代码。

## Planning Contract

- Work lane：Lane 3。
- Execution Mode：`Traditional task-by-task execution`；用户已请求 plan-then-execute。
- Test-first：每个行为变化先在 domain/host-wrapper 测试中复现失败，再修改 runtime/bootstrap 镜像。
- Runtime parity：根 runtime、onboarding bootstrap、installer manifest 必须一致。
- Rollback：每个实现 checkpoint 可由独立 Git commit 回滚；下游安装使用 installer transaction，失败必须回滚。
- Simplicity Gate：不新增依赖或 policy engine；删除现有低收益事件和 receipt/freshness 路径，复用已有 workflow 读取、Git target 解析和原子写 helper。

## Verification Contract

- Focused：`node --test tests/domains/host-wrapper.test.mjs tests/domains/workflow-hooks.test.mjs tests/domains/health-release.test.mjs tests/domains/assets-worktree.test.mjs`。
- Full：`node scripts/run-domain-tests.mjs`。
- Release：`node scripts/release-check.mjs .`、`git diff --check`、runtime/bootstrap parity。
- Budget：source、`scientific_Graph`、`sci-evo-extract` 的 `context-budget`；下游 hot < 8k，hooks.json < 1.5k。
- Installer：两个下游 Preview/Apply、六个核心 context 文件 hash preservation、无 transaction/staging/backup 残留。
- Live：重启 Codex 后只读复合命令、context-budget、HTTP/CDP、外部源码命令、明确项目写入负例、连续 Stop、PreCompact handoff preservation。
- Review：agent architecture + security + simplicity；无 unresolved High/Critical。

## Definition Of Done

- 规格 AC 全部有 fresh evidence。
- Source tests/release pass，source checkpoint 清晰且未 push。
- 两个下游安装成功，context facts 未覆盖。
- 用户完成一次宿主重启/trust 后，live hooks/CDP 回归通过。
- 上游服务新进程真实 acquisition/MinerU 通过或产生与 Dong Skills 无关的明确上游 blocker。

## 任务

### Task 1：锁定失败合同

- Files：`tests/domains/host-wrapper.test.mjs`、`workflow-hooks.test.mjs`、`health-release.test.mjs`、`assets-worktree.test.mjs`、必要 support fixture。
- Steps：加入当前 live 命令正例、明确项目写入负例、最小事件集、Stop non-blocking、PreCompact single-latest、phase-aware health、context budget 阈值；先运行并确认旧实现失败。
- Verify：focused tests 必须因目标行为失败，而不是 fixture/schema 错误。
- Checkpoint：不单独提交；与 Task 2 合并。

### Task 2：实现最小 hook 内核

- Files：`.codex/scripts/lib/events.mjs`、`.codex/hooks/project-ops.mjs`、`.codex/hooks.json`、对应 bootstrap 镜像。
- Steps：移除低收益事件路由；PreToolUse 仅正证据 hard gate；删除 mutation/freshness continuation 依赖；Stop advisory-only；PreCompact 原子覆盖 bounded latest snapshot；SessionStart read-only minimal。
- Verify：Task 1 focused tests pass；明确写入负例保持 deny。
- Checkpoint：`fix(hooks): reduce project hooks to minimal guardrails`。

### Task 3：状态、health 与热路径减负

- Files：`scripts/project-ops-health.mjs`、`.codex/scripts/lib/markdown.mjs`、`assets.mjs`、context-budget、AGENTS snippet、相关 skills/README 与 bootstrap 镜像。
- Steps：按 phase 评估 handoff；working-notes 固定标题改 advisory；raw latest 覆盖策略；缩短 AGENTS managed block；修正 hot-set，把 `.codex/hooks.json` 作为配置而非全文恢复资产。
- Verify：phase-aware tests、asset tests、context-budget tests pass；source budget 不因用户事实删除而达标。
- Checkpoint：`refactor(project-ops): shrink recovery and state overhead`。

### Task 4：完整验证和独立审查

- Files：verification/review/state docs only，除非 accepted finding 需要返回 debugging。
- Steps：focused、full domains、release-check、三轮关键稳定性；运行 fresh 隔离审查并立即关闭；处理 High/Critical。
- Verify：全绿、无 unresolved High/Critical、Git diff check pass。
- Checkpoint：closure checkpoint，不 push。

### Task 5：下游安装与 live 回归

- Files：仅 Dong-managed assets 和下游 context 状态记录；不改业务代码。
- Steps：两个项目安装前 hash、Preview、Apply、静态 health/budget；要求重启 Codex；重启后真实 hooks/CDP/Stop/PreCompact 正反例。
- Verify：context preservation、distribution parity、live smoke、无 installer 残留。
- Checkpoint：下游是否提交按各项目 dirty 边界决定，不混入业务改动。

### Task 6：上游服务与研究恢复

- Files：上游仅在 fresh process 仍失败且有 failing test 时修改；研究只刷新 Wayfinder 状态/证据。
- Steps：重启 8000，真实 OpenAlex/Crossref/Sciverse acquisition 与 QASPER MinerU；若通过则回到 12-window evidence-manifest completion。
- Verify：live API job/readiness evidence；不得将基础设施 smoke 写成方法结果。
- Checkpoint：上游代码修复若存在必须独立提交；研究 discovery 单独 checkpoint。

## 验收映射

- 只读/HTTP/CDP/外部命令不误拦 -> Tasks 1, 2, 5。
- 明确项目写入仍拒绝 -> Tasks 1, 2, 5。
- Stop/PreCompact 无循环 -> Tasks 1, 2, 5。
- phase-aware state -> Tasks 1, 3, 5。
- hot < 8k / hooks < 1.5k -> Tasks 1, 3, 5。
- installer/context preservation -> Task 5。
- browser/upstream live -> Tasks 5, 6。
- full release/review -> Task 4。

## 测试场景

- Happy path：wayfinding 下读取、诊断、context-budget、GET/POST CDP、外部脚本、Stop、PreCompact。
- Regression path：当前 live 失败命令逐一变绿。
- Error/edge path：当前项目 apply_patch、Remove-Item、Set-Content、重定向、workflow-state 直接编辑继续 deny。
- Non-goal preservation：未知命令允许不代表安全认证；浏览器敏感操作仍由 Browser skill 确认。

## 执行备注

- 优先读取：`events.mjs`、hooks config、health/context-budget tests、installer manifest。
- 不要触碰：下游业务代码、研究实验数据、用户 raw evidence、全局安装副本。
- 不用 allowlist 补单句；按工具作用域与可证明文件 mutation 分类。
- 任何目标阈值若只能靠删除用户事实达到，停止并回规格。
