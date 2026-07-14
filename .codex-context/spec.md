# Dong Skills 最小 Hook 内核与热路径减负规格

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 问题

当前 Dong Skills 的项目 hooks 与状态资产已经从辅助性 guardrail 演化为高频阻塞层：纯读取和诊断命令、外部源码治理、浏览器 CDP 前置检查、上游服务进程控制被误判为当前项目 mutation；`Stop` 和 health 在 `wayfinding` 强制交付态固定标题；`PreCompact` 重写 handoff 并累积 raw snapshots。三个真实项目的总扫描约为 121k-153k tokens，默认热恢复路径约为 13k-18k tokens，其中 `.codex/hooks.json` 单文件约 5.3k tokens。

## 目标

- Dong Skills 默认成为轻量辅助层，而不是通用安全 sandbox。
- hooks 只硬阻止有确定证据的当前项目高风险写入或 workflow 破坏；不透明、外部、网络和只读命令不再因无法证明安全而被当作项目 mutation。
- 删除低收益常驻 hook 事件；保留的事件必须有明确、可验证且低成本的职责。
- `Stop` 默认不阻断工作，不制造 freshness、checkpoint 或固定模板债。
- `PreCompact` 不改写 handoff，只保留一个大小有上限的 ignored latest snapshot。
- health 与状态文档合同按 workflow phase 最小化，不要求早期研究阶段填写交付态字段。
- 缩短 AGENTS managed block 和 hooks 配置，使真实项目默认热恢复路径低于 8k estimated tokens。

## 审批状态
- status: approved
- approved_by: user

## 事实优先级

- 最新用户指令。
- 真实 Codex Desktop live 复现、源码、Git、测试和产品 smoke。
- 本规格与实施计划。
- 当前状态文件和 handoff。
- 旧验证、旧 distribution 与历史聊天。

## 工作类别 / 风险等级

- Lane 3。变更触及 `PreToolUse` 权限边界、Stop/PreCompact 行为、安装分发和项目恢复；必须 test-first、完整 domain 回归、release-check、安装与重启后 live 正反验证。

## 非目标

- 不把 hooks 做成完整 shell、网络、浏览器或数据外发安全 sandbox。
- 不解析任意自然语言来推断审批、范围、意图或命令语义。
- 不删除用户已有 `.codex-context` 事实、raw 研究证据或非 Dong Skills 文件。
- 不修改 `scientific_Graph` 研究业务代码或 `sci-evo-extract` 业务能力，安装和 live smoke 除外。
- 不新增依赖、第二套状态机或新的长期 receipt 类型。
- 不用固定 URL、固定句式或不断扩充命令名的补丁冒充根治。

## 已批准范围

- `.codex/hooks.json` 与 hook event set。
- `.codex/scripts/lib/events.mjs`、`markdown.mjs`、`assets.mjs`、`recovery.mjs`、health/context-budget/release 脚本及其 bootstrap 镜像。
- AGENTS managed block、相关 project skills、README、installer receipts/manifest。
- `tests/domains` 中 hooks、health、assets、recovery、host wrapper 和 installer 回归。
- 下游两个项目的 installer Preview/Apply、context hash preservation、重启后 live smoke。

## 用户决策

- 2026-07-14：Dong Skills 应辅助 Codex，不应以繁重流程限制正常项目推进。
- 2026-07-14：不完全删除 hooks；采用最小内核并把未知命令从 fail-closed 改为 advisory/fail-open。
- 2026-07-14：网络/API/浏览器副作用由对应工具和用户确认规则治理，不由项目文件 hook 越权处理。
- 2026-07-14：允许直接修改真实 Dong Skills 源仓库并在本项目完成充分测试。

## 候选方案

- 已拒绝：保留现有九事件严格控制面，只继续扩充 allowlist。该路线已被多轮 paraphrase、PowerShell、HTTP、CDP 和外部 workdir 误伤证伪。
- 已拒绝：删除全部 hooks。会失去低成本的恢复提示和明确危险写入保护。
- 已选择：最小 hook 内核，正证据 hard gate，其余 advisory。

## 设计

### Hook 内核

- `SessionStart`：只读注入当前 root、task、phase、next skill、handoff/current-state 指针；不创建或删除 receipts。
- `PreToolUse`：仅对明确写文件工具、明确 shell 文件 mutation、明确 destructive operation 和直接 `workflow-state.yaml` 篡改应用当前项目 workflow gate；未知 shell、网络请求、外部工具和只读诊断直接放行，不写 mutation receipts。
- `PreCompact`：始终 non-blocking；原子覆盖 `.codex-context/raw/precompact-latest.md`，限制大小，不改 `handoff-summary.md`。
- `Stop`：只输出一次非阻塞 advisory；不得返回 `decision:block`，不得创建 continuation/freshness/checkpoint debt。
- 移除常驻 `UserPromptSubmit`、`PostToolUse`、`PostCompact`、`SubagentStart`、`SubagentStop` 项目 hooks。相关纪律保留在按需 skill 中。

### 项目写入边界

- `apply_patch`、明确 write/edit/delete 工具和可确定目标的 shell 写入继续按 phase/approval gate。
- `Remove-Item`、`Set-Content`、重定向到项目文件、直接修改 workflow state 等负例继续拒绝。
- `curl`、`Invoke-RestMethod`、CDP `POST /eval`、外部绝对脚本、`context-budget`、health、Git/PowerShell 复合诊断不再被视为项目 mutation，除非命令同时包含可确定的项目文件写入。
- 未知命令默认放行并可 advisory；hooks 明确不承诺捕获所有可能写入。

### 状态与资产

- health 只检查结构化 workflow 一致性和当前 phase 必需的最小语义；固定交付标题只在 delivery/handoff/complete 作为 advisory 或必要合同。
- `wayfinding` 最小 handoff 合同：当前任务、当前结论/边界、下一步、重读指针；不要求 Files Modified、Verification Evidence 或完整 checkpoint 表。
- `working-notes` 不因缺少固定七标题而 health fail；只检查文件存在、非占位和合理大小。
- AGENTS managed block 缩为路由与关键不变量索引；详细流程只在对应 skill 中按需加载。
- raw/archive 不进入 hot recovery；`precompact-latest.md` 采用覆盖式单文件，不累积时间戳快照。

## 验收标准

- WHEN 项目处于 `wayfinding` 且未 execution-approved，THE SYSTEM SHALL 允许 `context-budget`、health、纯 GET/HEAD、CDP check-deps、外部绝对脚本和纯读取复合诊断。
- WHEN 命令执行 HTTP POST/PUT/PATCH/DELETE 但不写当前项目文件，THE SYSTEM SHALL 不把它当作项目 mutation；浏览器/网络工具自身安全规则仍适用。
- WHEN 命令明确删除、覆盖、重定向或写入当前项目文件，THE SYSTEM SHALL 在未授权 phase 拒绝。
- WHEN `Stop` 连续触发，THE SYSTEM SHALL 两次都允许停止，且不新增 freshness/continuation/checkpoint debt。
- WHEN 自动或手动 `PreCompact` 触发，THE SYSTEM SHALL 不修改 handoff，只原子覆盖一个不超过 64 KiB 的 ignored latest snapshot。
- WHEN health 检查 `wayfinding` 项目，THE SYSTEM SHALL 不因缺少交付态固定标题失败。
- WHEN installer Apply 到现有项目，THE SYSTEM SHALL 保留已有 context Markdown 内容和非 Dong Skills assets。
- WHEN运行 context-budget，THE SYSTEM SHALL 在 `scientific_Graph` 与 `sci-evo-extract` 上报告 hot recovery path < 8,000 estimated tokens，`.codex/hooks.json` < 1,500 estimated tokens。
- WHEN live browser smoke 运行，THE SYSTEM SHALL 完成 web-access dependency check、创建后台 tab、导航/DOM/交互并关闭自己的 tab。
- WHEN full domain tests 与 release-check 运行，THE SYSTEM SHALL 全部通过，无 unresolved High/Critical agent architecture finding。

## 开放问题

- 无。若 hot path 低于 8k 需要删除用户事实文件，则停止；只能继续缩短 managed runtime/config/AGENTS 或调整 hot-set，不以删除事实换指标。

## 下一步

进入 `writing-plans`，按 test-first 计划实施；用户已请求 plan-then-execute，计划完成后使用 `Traditional task-by-task execution` 继续，不再等待执行模式确认。
