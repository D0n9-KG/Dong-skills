# Dong Skills 移除 Prompt 语义权威实施计划

**目标:** 让非结构化用户 prompt 只承担 advisory/恢复作用；权限、审批、Stop 和 mutation 门禁只依据确定性结构化证据与真实项目事实。
**规格:** `.codex-context/spec.md`，Approved by user on 2026-07-13。
**Artifact Readiness:** implementation-ready。
**工作类别 / 风险等级:** Lane 3；涉及审批、scope、Stop、PreCompact、recovery 与 mutation 控制面。
**执行模式:** Traditional task-by-task execution，用户于 2026-07-13 明确选择选项 1。
**当前步骤:** Task 7，完整回归与稳定性循环。
**验证:** targeted tests、234+ domain tests、`release-check`、installer Preview/Apply、下游 live hooks 与整体 agent-architecture audit。
**执行审批:** Approved by user for Traditional task-by-task execution on 2026-07-13。

## Product Contract

- R8：非结构化 prompt 不得单独授权 transition、重开 scope、阻塞 mutation、Stop 或 PreCompact。
- R9：审批和关键决定只由 canonical 结构化字段、task identity、phase 与 document hash 提供证据。
- R10：修复后完成完整 Dong Skills agent-architecture audit，并关闭所有高严重度 finding。
- 保留 recovery、真实 mutation freshness、危险命令、workflow consistency、verification 和 checkpoint 的确定性门禁。

## Planning Contract

- 不增加第二套状态机、模型调用、依赖或用户专用 decision token。
- 不让 hook 解释复杂自然语言；Markdown 中的机器字段使用精确 key/value 解析，不做语义正则匹配。
- `UserPromptSubmit` 只保留 redacted advisory、learning candidate 与 complete-phase 新任务提醒。
- 先建立新契约，再删除旧 prompt authority；每个步骤保持测试可解释。
- 当前窄正则补丁仅作为失败复现，不作为最终实现保留。

## Verification Contract

- 自动化：`workflow-governance.test.mjs`、`workflow-hooks.test.mjs`、`host-wrapper.test.mjs`、全部 domain tests、`release-check`。
- 安装：Preview 仅计划 Dong-managed assets；Apply 保持 context hash、receipt/runtime parity 和事务清洁。
- Live：重启/trust 后 health critical coverage complete；普通 prompt 不制造 Stop debt；连续两次 Stop 无循环。
- 审计：按 agent architecture 12 个边界输出 severity-ranked report；高严重度 finding 必须修复并重跑验证。

## Definition of Done

- AC8-AC12 全部有自动化或 live 证据。
- 非结构化 prompt 相关语义正则不再位于权限控制路径。
- canonical decision evidence 缺失或 hash/task 不匹配时 transition 被拒绝，匹配时通过。
- discussion marker 无论 stale 或 malformed 都不能单独阻塞交付；严重 workflow/Git/verification 问题仍阻塞。
- source 与 bootstrap parity、release-check、installer、live Stop 和整体审计均通过。
- 源仓库 checkpoint 创建；不 push，除非用户另行要求。

## 文件边界

- 优先修改：`.codex/scripts/lib/events.mjs`、必要时 `workflow.mjs`、`markdown.mjs`、`runtime.mjs`。
- 同步镜像：`.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/`。
- 测试：`tests/domains/workflow-governance.test.mjs`、`workflow-hooks.test.mjs`、`host-wrapper.test.mjs`。
- 指导：`AGENTS.project-ops.snippet.md`、bootstrap snippet、`codex-project-governance/SKILL.md`。
- 审计报告：`docs/codex/reviews/2026-07-13-dong-skills-agent-architecture-audit.md`。
- 不触碰：`scientific_Graph` 研究业务代码、实验数据、论文资产；非 Dong Skills local skills。

## Simplicity Gate

- Can avoid building：删除 prompt authority 比新增分类器更简单。
- Existing code：复用现有 workflow phase、task identity、document hash、Markdown section parser 和 Git mutation receipts。
- Standard library：继续使用 Node `fs/path/crypto`；不增加 parser 或 NLP 依赖。
- Native platform：hooks 只消费宿主事件和确定性工具输入，不新增外部服务。

## 任务

- [x] Task 1：建立“prompt advisory-only”失败契约
  - Files: `tests/domains/workflow-hooks.test.mjs`, `tests/domains/workflow-governance.test.mjs`
  - Steps: 将“Stop blocks stale discussion”改为 Stop 允许；增加 stale/malformed marker、hook 状态、普通讨论、执行期 prompt 的回归；确认旧实现按预期失败。
  - Verify: `node --test --test-name-pattern="discussion|prompt|approval" tests/domains/workflow-hooks.test.mjs tests/domains/workflow-governance.test.mjs`
  - Done: 失败只来自旧 prompt authority，不来自 fixture 或 workflow 失配。

- [x] Task 2：建立 canonical decision evidence 契约
  - Files: `tests/domains/workflow-governance.test.mjs`, `.codex/scripts/lib/markdown.mjs`, `.codex/scripts/lib/workflow.mjs`
  - Steps: 为 spec、execution、verification gap/retry、resume 定义精确字段；测试缺失、错误 task/hash、错误 event 被拒，正确 evidence 通过；不得调用 prompt parser。
  - Verify: `node --test --test-name-pattern="decision|approval|verification gap|resume" tests/domains/workflow-governance.test.mjs`
  - Done: transition 的允许/拒绝完全由 canonical evidence 决定。

- [x] Task 3：移除 `UserPromptSubmit` 语义权限路径
  - Files: `.codex/scripts/lib/events.mjs`, bootstrap mirror
  - Steps: 删除 decision/scope/status/project-ops semantic regex 在控制面的调用；保留 advisory snapshot、redaction、learning candidate 和 new-task 提醒；移除不可达 helper。
  - Verify: Task 1/2 tests 转绿；`node --check` 两份 `events.mjs`。
  - Done: 非结构化文本不能写入授权 receipt 或 enforceable discussion debt。

- [x] Task 4：将 discussion marker 从 blocker 降为 advisory
  - Files: `.codex/scripts/lib/events.mjs`, bootstrap mirror, `tests/domains/workflow-hooks.test.mjs`
  - Steps: `discussionStateStatus` 分离 advisory 与 issue；Stop/PreCompact 不把 advisory marker 加入 hard issues；auto compaction 仍可保存 prompt snapshot；malformed marker 可告警并安全清理。
  - Verify: Stop/PreCompact targeted tests；连续 Stop tests。
  - Done: marker 单独存在时 Stop/PreCompact 可结束，真实 workflow/mutation debt 仍阻塞。

- [x] Task 5：保持 mutation freshness 轻量且闭环
  - Files: `.codex/scripts/lib/events.mjs`, `tests/domains/workflow-hooks.test.mjs`
  - Steps: 保留 no-change verification 与 ignored governance cleanup 修复；确认已有 change-state 时 governance refresh 仍可关闭债务。
  - Verify: `node --test --test-name-pattern="no-change verification|ignored governance cleanup|batched governance refreshes|closure maintenance" tests/domains/workflow-hooks.test.mjs`
  - Done: 无新 mutation 不追债，有真实 mutation 不漏债。

- [x] Task 6：删除过期 receipt/regex 路径并更新指导
  - Files: `events.mjs`, 必要时 `runtime.mjs`, AGENTS snippets, governance skill, tests
  - Steps: 删除仅服务 prompt semantic authority 的 decision/advance receipt 代码；更新说明为 advisory prompt + canonical evidence；保留 recovery/session receipts。
  - Verify: `rg` 不再发现权限路径引用；skills-contracts、runtime/bootstrap parity 通过。
  - Done: 没有隐藏兼容分支继续接受自然语言审批。
  - Usability closure: `workflow-state decision <transition>` 原子写入 task/hash-bound evidence，不自动执行 transition；PreToolUse 只放行与 pending decision 匹配的受控命令。

- [x] Task 7：完整回归与稳定性循环
  - Files: tests/runtime only
  - Steps: workflow domains；全部 domain tests；关键 Stop/recovery/mutation 测试连续 3 轮；`release-check`；`git diff --check`。
  - Verify: `node scripts/run-domain-tests.mjs`; `node scripts/release-check.mjs .`
  - Done: 全绿且无测试削弱、无 transaction/staging 残留。

- [ ] Task 8：整体 Dong Skills agent-architecture audit
  - Files: 全部 hook/runtime/skills/install/state boundary；审计报告
  - Steps: 审查 instructions、compaction、memory、tool routing、execution proof、rendering、hidden loops、receipts、installed copies；按 severity 排序；高严重度 finding test-first 修复。
  - Verify: audit report 无 unresolved high severity；接受 finding 的 targeted/full verification 通过。
  - Done: 报告包含 symptom、mechanism、evidence、fix 和 residual risk。

- [ ] Task 9：installer 与下游 live 回归
  - Files: installer-managed assets and downstream state only
  - Steps: source checkpoint；Preview/Apply；比较 context hashes；重启/trust；health coverage；状态提示和普通讨论；连续两次 Stop；asset-governance/context-recovery。
  - Verify: static/runtime parity pass，critical coverage complete，第二次 Stop 无重复 debt。
  - Done: live host 与自动化契约一致；研究业务状态未被污染。

## 验收映射

- AC8 -> Tasks 1, 3, 4, 9 -> discussion/Stop/PreCompact targeted + live paraphrase。
- AC9 -> Task 2 -> canonical decision evidence tests。
- AC10 -> Tasks 2, 3 -> approval hash drift 与 execution prompt tests。
- AC11 -> Tasks 4, 5, 7 -> mutation/recovery/dangerous command regression。
- AC12 -> Task 8 -> architecture audit report + finding verification。

## 测试场景

- Happy path: assistant 写入匹配 task/hash 的 canonical evidence，transition 通过；无债 Stop 静默结束。
- Regression path: hook 开关、状态复核、普通讨论、Dong Skills 维护、no-change verification 不制造债务。
- Error/edge path: evidence 缺失/过期/错 event、workflow malformed、Git unavailable、真实 mutation 未刷新时保持 deny/block。
- Non-goal preservation: scriptblock、删除、重定向、未知写命令与跨 session recovery 继续受控。

## 执行模式

- 已选择：Traditional task-by-task execution。
- Codex Goal mode 未选择；live 安装需要用户关闭/开启/trust hooks 与重启宿主，独立 judge 无法完全自动闭环。

## Goal 模式目标草案

仅在用户明确选择 Codex Goal mode 后使用。

- 当前 session 可用的 goal 机制: `create_goal` / `update_goal`。
- 目标: 满足 AC8-AC12，并完成 source、installer、live host 和 architecture audit 证据闭环。
- 规格路径: `.codex-context/spec.md`。
- 计划路径: `docs/codex/plans/2026-07-13-remove-prompt-semantic-authority.md`。
- 边界: 不修改研究业务代码、测试验收条件、非 Dong skills；不自动开关用户 trust。
- 验证命令: domain tests、release-check、installer、health、连续 Stop。
- 停止条件: 用户交互缺失、宿主需重启、范围变化、三次同类失败、危险操作或证据冲突。

## Loop Review

- Traditional task-by-task execution: `not-required`。
- Codex Goal mode: `pending`；选择后必须先运行 `codex-loop-design-check`。

## 运行约束

- Test-first；builder 不得削弱 Task 1/2 的 acceptance tests。
- 每个任务后重读 spec/plan，遇到范围变化返回 brainstorming。
- 用户关闭 hooks 只用于 installer 窗口；不得以关闭 hooks 代替修复。
- 外部审查或子代理只读，完成后立即关闭；其输出不能替代本地验证。
- 不把 advisory warning 重新升级为无事实依据的 hard gate。

## 存档节奏

- Tasks 1-6 完成并通过 workflow domains 后做 source checkpoint。
- Task 7/8 后做 verified checkpoint。
- Task 9 安装前记录 downstream hash，安装后刷新 verification/handoff；不混入研究业务 commit。

## 风险与回滚

- 风险：移除 prompt receipts 后，assistant 可能错误记录用户决定。缓解：canonical exact fields、task/hash binding、workflow consistency、书面流程指令和审计。
- 风险：discussion advisory 可能导致一次对话结论未及时写入。缓解：PreCompact snapshot、SessionStart recovery、brainstorming/wayfinder skill 纪律；不把该风险转化为 Stop 死循环。
- 回滚：保留前一 source checkpoint；installer 有事务回滚；不通过删除用户 state 或回滚研究文件恢复。

## 执行备注

- 优先读取：approved spec、`events.mjs` UserPromptSubmit/PreToolUse/Stop/PreCompact、decision tests、runtime receipts。
- 不要触碰：研究业务代码、实验资产、非 Dong skills、用户 raw evidence。
- Test-first：每个 authority removal 先让旧行为测试失败，再做最小实现。
- 优先验证：workflow-governance、workflow-hooks、host-wrapper、release-check、live Stop。
