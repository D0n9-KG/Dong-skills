# 资产索引

## 已创建
- `docs/codex/plans/2026-07-10-dong-skills-hooks-control-plane.md`: hooks 控制面重构实施计划。
- `docs/codex/plans/2026-07-10-dong-skills-reliability-hardening.md`: 本轮六项可靠性修复实施计划。
- `.agents/skills/codex-wayfinder/SKILL.md`: 本地 Markdown、多 session frontier 决策地图。
- `.agents/skills/codex-agent-architecture-audit/SKILL.md`: agent/harness、memory、tool、rendering 和 persistence 审查。
- `.agents/skills/codex-loop-design-check/SKILL.md`: Goal/自动循环的目标、边界、judge、重试和人工停止审查。
- `.codex/scripts/lib/recovery-eval.mjs` 与 bootstrap 镜像: 恢复 probes 和 Active Wayfinder 摘要。
- `scripts/context-recovery-eval.mjs` 与 bootstrap 镜像: 恢复 evaluator CLI。
- `scripts/skill-forward-eval.mjs` 与 bootstrap 镜像: 外部执行器、recorded outputs 和独立判定 harness。
- `evals/skill-forward/complex-project-gates.json`: 2 train + 2 held-out 的复杂项目核心门禁场景；断言停止执行、计划要素和语义等价表达。
- `evals/skill-forward/README.md`: forward-eval 场景与 backend 协议。
- `scripts/run-domain-tests.mjs`: 测试唯一归属校验和有界并行 runner。
- `tests/project-ops-support.mjs`、`tests/domains/*.test.mjs`: 11 个领域；最新完整基线 189 条，宏观补强后预计 191 条。
- `.codex/scripts/lib/runtime.mjs` 与 bootstrap 镜像: session-scoped recovery receipt、hook runtime hash 和关键事件 liveness。
- `tests/domains/{bootstrap-install,bootstrap-integrity,bootstrap-recovery}.test.mjs`: 从旧 bootstrap 单体拆出的安装、完整性、恢复/并发域。
- `docs/codex/plans/2026-07-10-dong-skills-hardening.md`: 实施计划。
- `licenses/MATT-POCOCK-SKILLS-LICENSE`: Matt Pocock Skills MIT 许可证。

## 已修改
- `.agents/skills/using-superpowers/SKILL.md`: 明确 Wayfinder 路由入口、route discovery、Wayfinder vs brainstorming scope 判断，并补齐 `codex-project-governance` 与 `requesting-code-review` 入口。
- `.agents/skills/codex-project-governance/SKILL.md`: 在生命周期 Scope 阶段加入 Wayfinder pre-check，Skill Map 强化 research/prototype/user-grilling/frontier-ticket/blocking-edge 触发。
- `.agents/skills/codex-wayfinder/SKILL.md`: 吸收 mattpocock/skills 的 Wayfinder/prototype 思路，新增 Typical Triggers、one-question local tickets、Prototype As Primary Source、Logic/UI prototype 和 primary-source pointer 规则。
- `.agents/skills/codex-architecture-governance/SKILL.md`: 新增 Deep Module Boundary Check，覆盖 public entry points、private internals、deep imports、package exports/path alias/barrel file/dependency-cruiser。
- `.agents/skills/writing-plans/SKILL.md`: 新增 package/module 边界计划要求、forbidden deep imports、ticket-like execution。
- `.agents/skills/executing-plans/SKILL.md`: 执行 Simplicity Gate 时同步检查 package/module boundaries，禁止未经授权的 deep imports 和隐藏 ownership 的 barrel files。
- `README.md`、`AGENTS.md`、根/bootstrap `AGENTS.project-ops.snippet.md`: 同步 Wayfinder 置于 ordinary brainstorming 前、Matt Pocock prototype/deep-module/ticket 吸收点和架构边界规则。
- `tests/domains/skills-contracts.test.mjs`: 新增 Wayfinder 路由、Prototype As Primary Source、Deep Module Boundary Check、ticket-like execution、routing completeness 等合同断言。
- `scripts/run-domain-tests.mjs`: 新增 domain 测试实时 start/done 输出、`DONG_DOMAIN_TEST_TIMEOUT_MS` 单域硬超时、超时终止与失败域报告，避免 release-check 长时间运行或卡住时无诊断。
- `.codex/scripts/lib/{events,workflow,recovery-eval}.mjs` 与 bootstrap 镜像：修复 change-state receipt/fingerprint、shell/tool 分类、recovery hash 与 evidence 自动 reopen。
- `tests/domains/{workflow-hooks,workflow-governance,skills-contracts}.test.mjs`：新增 no-op/commit/连续 mutation、quote-aware shell、PowerShell alias、opaque/unknown 工具、普通 Read、scoped fix 与恢复 hash 回归。
- `.agents/skills/{codex-project-governance,codex-review-panel,executing-plans,receiving-code-review,requesting-code-review,systematic-debugging,using-superpowers,verification-before-completion}/SKILL.md`：把状态更新移到 meaningful checkpoint，移除每次本地 fix 的额外 ceremony，保留跨 session 显式 reopen。
- `README.md`、`AGENTS.md`、根/bootstrap `AGENTS.project-ops.snippet.md`：同步 receipt 保留、普通探索无债务与 hooks 边界。
- `.codex-context/{spec,plan-progress,current-state,working-notes,artifact-index}.md`: hooks 控制面规格、计划、已验证边界和当前执行状态。
- `.codex/scripts/lib/{events,git,workflow,core,recovery-eval}.mjs`、hooks、health 与 bootstrap 镜像: 修改前门禁、mutation intent、Lane schema、恢复、Stop/Subagent continuation 和 liveness/parity。
- `.agents/skills/{codex-project-governance,using-superpowers}/SKILL.md`、`README.md`、`AGENTS.md`、根/bootstrap `AGENTS.project-ops.snippet.md`: 当前 hooks 控制面语义和边界。
- `.codex-context/{spec,plan-progress,current-state,working-notes,artifact-index}.md`: 新任务规格、计划、根因与执行边界。
- `.codex/scripts/lib/workflow.mjs` 与 bootstrap 镜像: Artifact Readiness、legacy normalization、Goal loop review 和共享 schema。
- `.codex/scripts/lib/recovery.mjs`、hooks 与镜像: SessionStart 恢复摘要和 evaluator dispatch。
- `scripts/project-ops-health.mjs` 与镜像: 共享 workflow parser/validator、Goal/readiness consistency、helper parity。
- `scripts/install-windows.ps1`、bootstrap script 与 receipt: 事务安装、锁、完整 helper 集合和 forward/recovery 分发。
- `scripts/release-check.mjs` 与镜像: 领域 runner、junction 安全和隐私扫描字面量识别。
- `.agents/skills/{using-superpowers,executing-plans,writing-plans,codex-context-budget,codex-loop-design-check,codex-skill-evolution}/SKILL.md`: 四项行为门禁和恢复合同。
- `README.md`: recovery/forward-eval 使用与验证命令。
- `tests/domains/{core,workflow-hooks,memory-evolution,bootstrap-install,bootstrap-integrity,bootstrap-recovery,health-release,skills-contracts}.test.mjs`: recovery、timeout、installer 和拆分回归覆盖。
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex-context/workflow-state.yaml`: 新项目 handoff task identity 默认字段。
- `.codex/scripts/lib/{events,workflow,templates}.mjs` 与 bootstrap 镜像: 审批询问 fail closed、执行期指令 marker、范围重开门禁和独立 execution-debug 返回状态。
- `.agents/skills/{using-superpowers,executing-plans,systematic-debugging,codex-project-governance}/SKILL.md`、README、AGENTS 与 snippet: 执行期纠偏和调试恢复流程。
- `tests/domains/{core,workflow-governance,workflow-hooks,skills-contracts}.test.mjs`: 新增误审批、状态询问、learning-only、长期产品指令、范围重开与嵌套调试恢复回归。
- `.codex-context/*.md` 与 `workflow-state.yaml`: 本轮规格、计划、证据和 handoff。

## 外部上游快照
- mattpocock/skills `391a2701dd948f94f56a39f7533f8eea9a859c87`：本轮核实 upstream HEAD，吸收 prototype-as-primary-source、deep-module boundary、local-ticket/frontier 机制。
- mattpocock/skills `d574778`
- obra/superpowers `d884ae0`
- everyinc/compound-engineering-plugin `ee2fee4`
- rpamis/comet `da58122`
- affaan-m/ECC `4092795`
- muratcankoylan/agent-skills-for-context-engineering `c2b9a19`
- DietrichGebert/ponytail `14a0d79`
- microsoft/SkillOpt `e4ea6a6`

## 验证产物
- 2026-07-12 Wayfinder/Matt Pocock 吸收验证：严格路由扫描通过，所有 28 个项目 skill 在 router/governance 中有入口；`node --test tests/domains/skills-contracts.test.mjs` 2/2 pass；`node .codex/hooks/project-ops.mjs health-check` pass；`node scripts/release-check.mjs .` pass。
- 2026-07-12 完整 release check：pass；包含新增可诊断 domain runner、health、context budget、syntax、domain-sharded tests、privacy/readability/large-file/runtime-artifact。
- 2026-07-12 单独慢域复验：bootstrap-install 8/8、bootstrap-integrity 8/8、bootstrap-recovery 8/8、health-release 22/22、installer-global 10/10、workflow-governance 19/19、workflow-hooks 92/92。
- 当前完整领域测试：204/204，11 domains，concurrency 4，237.8 秒。
- 最终 hooks/workflow 两域：104/104，153.2 秒。
- 当前 release check、health、installer preview、root/bootstrap parity 和 diff check：pass。
- 宏观修复前完整领域测试：189/189，11 domains，concurrency 4，183.2 秒。
- 宏观修复后相关四域：112/112；最终完整领域测试待重跑。
- 当前 source health：pass；static hook configuration 与 root/bootstrap runtime parity 通过，缺少近期 liveness 为 warning。
- 领域测试：114/114，10 domains，concurrency 4，91.7 秒。
- 最终 release check：pass，包含 health、114 domain tests、Node/PowerShell syntax、privacy、readability、large-file 和 runtime-artifact。
- 真实 forward-eval：独立 agent 输出 4/4 pass；真实 Codex CLI backend 直接重跑 4/4 pass；输出位于 ignored raw 目录。
- 全局安装：最终源码已重同步；source receipt v2、三个入口技能、真实 installed bootstrap/health 和残留扫描全部通过。

## 原始输出
- `.codex-context/raw/skill-forward-eval/independent-agent-2026-07-10/`: 独立行为评测输出与 summary，保持 ignored。
- `.codex-context/raw/skill-forward-eval/codex-cli-2026-07-10/`: 首次真实 CLI 输出；用于定位精确词面假阴性，保持 ignored。
- `.codex-context/raw/skill-forward-eval/codex-cli-rerun-2026-07-10/`: 修正场景后的真实 CLI 4/4 输出与 summary，保持 ignored。
- 临时 bootstrap、安装和错误场景 fixture 位于系统临时目录并已清理。

## 最新刷新
2026-07-12：修复 Wayfinder 路由弱入口，整体扫描并补齐所有项目 skill 在 router/governance 中的入口，吸收 mattpocock/skills 最新 prototype/deep-module/local-ticket 机制；完整 release-check 通过。

## 已读取 / 已检查
- mattpocock/skills upstream HEAD：`391a2701dd948f94f56a39f7533f8eea9a859c87`。
