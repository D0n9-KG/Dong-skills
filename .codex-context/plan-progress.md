# 计划进度

## Task Identity
- task_id: task-7-2026-07-12T18-25-41-449Z
- task_generation: 7

## 当前计划

- 详细计划：`docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`。

## Artifact Readiness

- implementation-ready；无 launch-blocking open question。

## 规格审批

- Approved by user on 2026-07-13。

## 执行审批

- Approved by user for Traditional task-by-task execution on 2026-07-13。

## 执行模式

- Traditional task-by-task execution。

## 工作类别 / 风险等级

- Lane 3：自然语言审批权威、Stop/PreCompact、mutation gate、canonical decision evidence、发布安装与完整架构审计。

## Goal 模式目标

- 草案位于详细计划；只有用户明确选择 Codex Goal mode 且 `codex-loop-design-check` 通过后可使用。

## Loop Review

- Traditional: `not-required`。

## 运行约束

- test-first；不为绿灯削弱 prompt-authority、mutation、recovery 或危险命令负例。
- 非结构化 prompt 不得重新进入权限控制路径。
- 不修改研究业务代码、实验资产、非 Dong skills 或用户 raw evidence。
- 不把安装副本当源码；最终由真实源码 installer 更新下游。
- 完整测试失败时回 systematic-debugging，不叠补丁。

## 存档节奏

- Tasks 1-6 完成并通过 workflow domains 后 checkpoint。
- Task 7/8 完整验证与审计后 checkpoint。
- Task 9 下游安装前后记录 hashes；未明确要求时不 push。

## 任务

- [x] Task 1：建立 prompt advisory-only 失败契约。
- [x] Task 2：建立 canonical decision evidence 契约。
- [x] Task 3：移除 `UserPromptSubmit` 语义权限路径。
- [x] Task 4：discussion marker 降为 advisory。
- [x] Task 5：保持 mutation freshness 轻量且闭环。
- [x] Task 6：删除过期 receipt/regex 路径并更新指导。
- [x] Task 7：完整回归与稳定性循环。
- [x] Task 8：整体 Dong Skills agent-architecture audit 并修复高严重度 finding。
- [ ] Task 9：installer 与下游 live 回归。

## 当前步骤

- Task 8 已完成；创建 verified source checkpoint 后进入 Task 9 installer 与下游 live 回归。

## 存档记录

### Checkpoint 1
- Tasks 1-6 completed：prompt advisory-only、canonical decision evidence、discussion advisory、mutation freshness、旧 receipt/regex 权限路径清理和指导更新。
- Files changed：runtime/bootstrap hooks、workflow/markdown/runtime/events、workflow CLI、project skills、AGENTS/README、workflow/core/skills tests。
- Verification：`workflow-governance` 20/20、`workflow-hooks` 105/105、`core` 24/24、`host-wrapper` 5/5、`skills-contracts` 2/2。
- Remaining risk：plan contract debugging、全部 domain tests、三轮稳定性、release-check、architecture audit 与下游 live installer 尚未闭环。
- Next task：修复 plan progress hash drift 后返回 Task 7。

### Checkpoint 2
- Root cause fixed：`approval-contract-v2` 绑定 substantive `plan-progress.md` + linked detailed plan；忽略 checkbox、`Current Step` 和专用 `Checkpoints` progress metadata。
- Migration：`legacy-v0` / `normalized-v1` 在当前内容或 Git recorded revision 等价时安全 rebind；substantive drift 拒绝迁移。
- Health：删除复制的 workflow consistency/hash 实现，统一调用 runtime `workflowConsistencyStatus`。
- Verification：core 25/25、workflow-governance 21/21、workflow-hooks 105/105、skills-contracts 2/2。
- Next task：Task 7 全部 domain runner、三轮稳定性和 release-check。

### Checkpoint 3
- Tasks completed：Task 7 全量回归；Task 8 完整 agent architecture audit。
- Findings fixed：learning/PreCompact hard debt、SessionStart hot-context duplication、PreCompact recovery ordering、root AGENTS managed-block drift、health liveness/trust wording。
- Review：两个隔离只读子代理 + 本地 12-boundary code audit；无 unresolved High/Critical，审计后已关闭子代理。
- Verification：workflow-hooks 106/106、core 25/25、health-release 23/23、全部 domain runner 241/241、`release-check` pass。
- Remaining risk：Task 9 下游 installer/live host 尚未执行；低风险 residual 记录在 audit report。
- Next task：source checkpoint，不 push；然后 installer Preview/Apply 到 `scientific_Graph`。

## 验证

- `node --test tests/domains/workflow-governance.test.mjs`
- `node --test tests/domains/workflow-hooks.test.mjs`
- `node --test tests/domains/host-wrapper.test.mjs`
- `node scripts/run-domain-tests.mjs`
- `node scripts/release-check.mjs .`
- `git diff --check`
- installer Preview/Apply + 下游 health/recovery/连续 Stop + architecture audit report。

## 范围外

- 推送远端、发布 tag、修改研究方法与实验。
