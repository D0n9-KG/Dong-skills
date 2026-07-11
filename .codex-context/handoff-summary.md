# Handoff 摘要

## 目标
修复 Dong Skills hooks 的 change-state receipt/fingerprint 与近期 wrapper regression，确保复杂项目中的读取、探索、调试、验证、review、多智能体和恢复流程不被无意义打断。

## 最新用户指令
整体仔细审查近期 hooks 优化；重点核实 change-state receipt fingerprint/刷新 bug，并修复实际使用中会干扰模型或阻碍项目推进的问题。

## 已批准范围 / 规格
- 规格：`.codex-context/spec.md`
- 计划：`docs/codex/plans/2026-07-10-dong-skills-hooks-control-plane.md`
- 执行模式：Traditional task-by-task execution
- 风险等级：Lane 3
- 本轮 GPT 5.6 SOL 适配由用户直接要求继续优化。

## 计划状态
- Task 1-11 已实现并通过验证。
- 当前状态：verified, not committed, not installed globally in this round。
- 下一步取决于用户：审阅后提交/推送和真实安装同步。

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
- 本地 opaque shell 视为潜在 mutation，必须通过 workflow/recovery/approval；已知 verification 命令仍可做基线检查，真实生成物由 PostToolUse 记账。
- 中性未知外部/自定义工具不默认阻断；有调用 ID 时用调用前后 Git 证据观察真实变化。明确复合写动词仍走前置 mutation 门。
- 普通 Read/Search 和 SubagentStop 质量警告不制造强制 Stop 债务。
- 本轮不自动 commit/push；等待用户确认。

## 当前状态
- Git 分支：`main`
- HEAD / 基线：`774430a2e92fc42980555b8fa980fe981d699ee4`
- 远端：与 `origin/main` 一致；当前工作区有本轮未提交变更。
- 安装副本：本轮仅运行 installer preview，未覆盖全局或其他项目安装副本。
- health：pass；hook liveness runtime-mismatch warning 仅表示当前会话未刷新对应 runtime liveness，不是静态失败。

## 已完成
- hooks 控制面：PreToolUse recovery/approval/lane/phase/Git 门禁，PostToolUse mutation intent，Stop 分级与有界 continuation，Subagent lifecycle，liveness health。
- 信任闭环：session-scoped transition、一次性用户决策 receipt、Lane 3 closure、workflow 锁与原子写、new-task 归档重置。
- 安装生命周期：self-contained distribution snapshot/id、stale source fail closed、source relocation、junction 物理锁、workflow schema migrator。
- 宏观流程补强：审批 fail closed、执行期范围重开、执行中调试恢复、Wayfinder map freshness、subagent 外化、范围缩减/延期识别、shell 证据阶段前置阻断和 shell 状态刷新闭环。
- GPT 5.6 SOL 适配：语义化 subagent 结果合同、goal/workflow 机制抽象、Wayfinder bounded parallel exploration。
- hooks 实际使用修复：receipt refresh 保留和多 mutation 累积；quote-aware shell parser；PowerShell alias/复合写动词；opaque 前置门禁；未知工具观察式追踪；未知执行结果不授予刷新；review/verification 真实 mutation 自动 reopen；普通探索无债务。

## 验证证据
- `node scripts/run-domain-tests.mjs`: pass, 204/204, 11 domains, concurrency 4, 237.8s。
- 最终 `node --test tests/domains/workflow-hooks.test.mjs tests/domains/workflow-governance.test.mjs`: pass, 104/104, 153.2s。
- `node --test tests/domains/skills-contracts.test.mjs`: pass, 2/2。
- `node scripts/project-ops-health.mjs .`: pass；liveness runtime-mismatch 为 warning。
- `node scripts/release-check.mjs .`: pass。
- `git diff --check`: pass。
- `scripts/install-windows.ps1 -TargetProjectRoot <repo> -Preview`: pass；No files were written。
- root/bootstrap `events`、`workflow`、`recovery-eval`、AGENTS snippet SHA-256 parity: pass。

## 当前判断
- 本轮确认的实际误阻断和漏门禁问题已修复；未发现仍会系统性阻碍复杂项目推进的 P0/P1。
- Dong Skills 当前约束可恢复事实、批准边界和交付证据，不强制模型按旧模板表达探索、多智能体或 scoped fix。
- 无已知未修复 P0/P1。

## 下一步动作
1. 等待用户审阅本轮结果。
2. 用户确认后提交并推送，并运行真实安装同步。
3. 对旧项目运行 onboarding/bootstrap，更新项目级 Dong Skills。

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
- 最新功能提交：`774430a2e92fc42980555b8fa980fe981d699ee4`。
- 推送状态：该基线与 `origin/main` 一致；本轮未提交改动尚未推送。
- 已包含文件：已提交基线包含上一轮 GPT 5.6 SOL 适配。
- 有意保留未提交的文件：当前 hooks/runtime、bootstrap 镜像、tests、skills/docs 和状态文件。
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
