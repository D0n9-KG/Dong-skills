# Handoff 摘要

## 目标
完成 Dong Skills hooks 控制面、安装生命周期、复杂项目主路径和 GPT 5.6 SOL 适配优化，使 Dong Skills 辅助 Codex 的构思、探索、多智能体、规划、执行、调试、验证、审查、压缩恢复和跨 session 延续，而不是限制模型原生能力。

## 最新用户指令
从 GPT 5.6 SOL 适配角度审查并优化 Dong Skills；GPT 5.6 自带多智能体、工作流等能力，Dong Skills 应起辅助作用，不应限制这些能力。

## 已批准范围 / 规格
- 规格：`.codex-context/spec.md`
- 计划：`docs/codex/plans/2026-07-10-dong-skills-hooks-control-plane.md`
- 执行模式：Traditional task-by-task execution
- 风险等级：Lane 3
- 本轮 GPT 5.6 SOL 适配由用户直接要求继续优化。

## 计划状态
- Task 1-10 已实现并通过完整验证。
- 当前状态：verified, not committed。
- 下一步取决于用户：提交/推送，或继续审查新的边界。

## 已修改文件
- hooks/runtime：`.codex/hooks*`、`.codex/scripts/lib/{core,events,git,learning,markdown,recovery-eval,runtime,templates,workflow}.mjs`。
- bootstrap/install：onboarding assets、`bootstrap-project-ops.ps1`、`install-windows.ps1`。
- skills/docs：governance、router、planning、execution、debugging、verification、review、checkpoint、Wayfinder、README、AGENTS。
- tests：11 个领域测试、`workflow-governance.test.mjs`、skills contracts 和共享 fixture。
- state：`.codex-context/*.md`、`workflow-state.yaml`、`worktree-state.md`。

## 已做决策
- Dong Skills 的职责是事实源、恢复层、风险门禁和证据账本，不做第二套多智能体编排器。
- 保留 hard gates：用户审批、scope re-open、execution approval、context recovery receipt、verification/review evidence、workflow-state validated transitions、destructive/action boundary、安装完整性。
- 软化 advisory/format 层：subagent summary 不要求固定标题；Goal mode 不绑定具体工具名；Wayfinder 默认单 frontier，但允许共享 decision boundary 的 bounded parallel exploration。
- hooks 仍明确不是完整安全沙箱。
- 本轮不自动 commit/push；等待用户确认。

## 当前状态
- Git 分支：`main`
- HEAD / 基线：`9b6eb315a73fad22624d3dc3c3d567faeb562c45`
- 远端：与 `origin/main` 一致；当前工作区有本轮未提交变更。
- 安装副本：已通过 `scripts/install-windows.ps1 -TargetProjectRoot <repo>` 同步全局 entry skills 与当前项目安装副本。
- health：post-install health pass；hook liveness runtime-mismatch warning 仅表示当前会话未刷新对应 runtime liveness，不是静态失败。

## 已完成
- hooks 控制面：PreToolUse recovery/approval/lane/phase/Git 门禁，PostToolUse mutation intent，Stop 分级与有界 continuation，Subagent lifecycle，liveness health。
- 信任闭环：session-scoped transition、一次性用户决策 receipt、Lane 3 closure、workflow 锁与原子写、new-task 归档重置。
- 安装生命周期：self-contained distribution snapshot/id、stale source fail closed、source relocation、junction 物理锁、workflow schema migrator。
- 宏观流程补强：审批 fail closed、执行期范围重开、执行中调试恢复、Wayfinder map freshness、subagent 外化、范围缩减/延期识别、shell 证据阶段前置阻断和 shell 状态刷新闭环。
- GPT 5.6 SOL 适配：语义化 subagent 结果合同、goal/workflow 机制抽象、Wayfinder bounded parallel exploration。

## 验证证据
- `node --test tests/domains/workflow-hooks.test.mjs --test-name-pattern "SubagentStart injects lifecycle context"`: pass, 77/77。
- `node --test tests/domains/skills-contracts.test.mjs`: pass, 2/2。
- `node scripts/run-domain-tests.mjs`: pass, 195/195, 11 domains, concurrency 4, 220.8s。
- `node scripts/project-ops-health.mjs .`: pass；liveness runtime-mismatch 为 warning。
- `node scripts/release-check.mjs .`: pass。
- `git diff --check`: pass。
- `scripts/install-windows.ps1 -TargetProjectRoot <repo> -Preview`: pass；No files were written。
- `scripts/install-windows.ps1 -TargetProjectRoot <repo>`: pass。
- post-install `node scripts/project-ops-health.mjs .`: pass。

## 当前判断
- 可以投入较复杂项目使用；当前剩余边界主要是完整安全沙箱、未知未来 UI/API 形态、极端中断/磁盘压力等，不建议为了这些边界继续加重常规流程。
- GPT 5.6 SOL 视角下，Dong Skills 现在更像辅助层：约束可恢复事实和交付证据，不抢模型自己的多智能体和工作流能力。
- 无已知未修复 P0/P1。

## 下一步动作
1. 如用户确认：提交并推送本轮变更。
2. 对旧项目运行 onboarding/bootstrap，更新项目级 Dong Skills。
3. 新项目使用时先运行 health；若 liveness 缺失，只说明 hooks 尚未被当前会话触发/信任，不代表静态安装失败。

## 优先重读文件
1. `.codex-context/spec.md`
2. `.codex-context/plan-progress.md`
3. `.codex-context/current-state.md`
4. `.codex-context/verification.md`
5. `.codex/scripts/lib/events.mjs`
6. `.agents/skills/codex-wayfinder/SKILL.md`
7. `.agents/skills/executing-plans/SKILL.md`
8. `tests/domains/workflow-hooks.test.mjs`
9. `tests/domains/skills-contracts.test.mjs`
10. `scripts/install-windows.ps1`

## 边界
- 不保存隐藏思维链、完整聊天、密钥或子 agent transcript。
- 不把 hooks 描述为完整安全沙箱。
- 不引入第三方依赖、数据库或常驻进程。
- 不自动 commit/push。

## Git 存档
- 最新功能提交：`9b6eb315a73fad22624d3dc3c3d567faeb562c45`。
- 推送状态：该基线与 `origin/main` 一致；本轮未提交改动尚未推送。
- 已包含文件：已提交基线包含上一轮可靠性补强和发布状态。
- 有意保留未提交的文件：当前 hooks/runtime、installer、bootstrap 镜像、tests、skills/docs 和状态文件。
- 暂缓原因：等待用户确认提交/推送。
- 下次存档：用户确认后提交并推送。

## 已读取但未修改文件
- 外部上游快照和历史验证证据仅作为背景；本轮最终判断以 2026-07-11 验证为准。

## 开放问题与假设
- 假设：用户下一步会决定是否提交并推送。
- 开放问题：是否现在提交并推送。

## 风险
- 任意 shell/脚本不是完整可判定语言；hooks 只能在支持路径上前置识别常见写入，并用 Git/status/Stop 后置收口。
- 旧项目必须运行 bootstrap 才会获得项目级最新 hooks/runtime；全局入口更新不等于旧项目自动更新。

## 需要保留的经验沉淀
- 新模型适配应优先抽象“证据和状态合同”，不要把某一代模型/工具的表达格式写成硬门禁。
- 多智能体结果的关键不是标题模板，而是父任务能否吸收证据、风险和下一步。
- Wayfinder 可允许并行探索，但必须在 session 结束前归并到 map，避免路线事实分叉。
