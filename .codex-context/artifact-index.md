# 资产索引

## 已创建
- `.agents/skills/codex-wayfinder/SKILL.md`: 本地 Markdown、多 session frontier 决策地图。
- `.agents/skills/codex-agent-architecture-audit/SKILL.md`: agent/harness、memory、tool、rendering 和 persistence 审查。
- `.agents/skills/codex-loop-design-check/SKILL.md`: Goal/自动循环的目标、边界、judge、重试和人工停止审查。
- `.codex/scripts/lib/recovery-eval.mjs` 与 bootstrap 镜像: 恢复 probes 和 Active Wayfinder 摘要。
- `scripts/context-recovery-eval.mjs` 与 bootstrap 镜像: 恢复 evaluator CLI。
- `scripts/skill-forward-eval.mjs` 与 bootstrap 镜像: 外部执行器、recorded outputs 和独立判定 harness。
- `evals/skill-forward/complex-project-gates.json`: 2 train + 2 held-out 的复杂项目核心门禁场景；断言停止执行、计划要素和语义等价表达。
- `evals/skill-forward/README.md`: forward-eval 场景与 backend 协议。
- `scripts/run-domain-tests.mjs`: 测试唯一归属校验和有界并行 runner。
- `tests/project-ops-support.mjs`、`tests/domains/*.test.mjs`: 8 个领域、106 条测试。
- `docs/codex/plans/2026-07-10-dong-skills-hardening.md`: 实施计划。
- `licenses/MATT-POCOCK-SKILLS-LICENSE`: Matt Pocock Skills MIT 许可证。

## 已修改
- `.codex/scripts/lib/workflow.mjs` 与 bootstrap 镜像: Artifact Readiness、legacy normalization、Goal loop review 和共享 schema。
- `.codex/scripts/lib/recovery.mjs`、hooks 与镜像: SessionStart 恢复摘要和 evaluator dispatch。
- `scripts/project-ops-health.mjs` 与镜像: 共享 workflow parser/validator、Goal/readiness consistency、helper parity。
- `scripts/install-windows.ps1`、bootstrap script 与 receipt: 事务安装、锁、完整 helper 集合和 forward/recovery 分发。
- `scripts/release-check.mjs` 与镜像: 领域 runner、junction 安全和隐私扫描字面量识别。
- `.agents/skills/{using-superpowers,executing-plans,writing-plans,codex-context-budget,codex-loop-design-check,codex-skill-evolution}/SKILL.md`: 四项行为门禁和恢复合同。
- `README.md`: recovery/forward-eval 使用与验证命令。
- `tests/domains/{core,workflow-hooks,memory-evolution,bootstrap-runtime,health-release,skills-contracts}.test.mjs`: 四项纵向场景与回归覆盖。
- `.codex-context/*.md` 与 `workflow-state.yaml`: 本轮规格、计划、证据和 handoff。

## 外部上游快照
- mattpocock/skills `d574778`
- obra/superpowers `d884ae0`
- everyinc/compound-engineering-plugin `ee2fee4`
- rpamis/comet `da58122`
- affaan-m/ECC `4092795`
- muratcankoylan/agent-skills-for-context-engineering `c2b9a19`
- DietrichGebert/ponytail `14a0d79`
- microsoft/SkillOpt `e4ea6a6`

## 验证产物
- 领域测试：106/106，8 domains，concurrency 4，67.1 秒。
- release check：pass，包含 health、budget、语法、106 domain tests、隐私、可读性、large-file 和 runtime-artifact。
- 真实 forward-eval：独立 agent 输出 4/4 pass；真实 Codex CLI backend 直接重跑 4/4 pass；输出位于 ignored raw 目录。
- 全局安装：source receipt v2、manifest SHA256、三个入口文件集/哈希、真实 bootstrap 和 health 全部通过。

## 原始输出
- `.codex-context/raw/skill-forward-eval/independent-agent-2026-07-10/`: 独立行为评测输出与 summary，保持 ignored。
- `.codex-context/raw/skill-forward-eval/codex-cli-2026-07-10/`: 首次真实 CLI 输出；用于定位精确词面假阴性，保持 ignored。
- `.codex-context/raw/skill-forward-eval/codex-cli-rerun-2026-07-10/`: 修正场景后的真实 CLI 4/4 输出与 summary，保持 ignored。
- 临时 bootstrap、安装和错误场景 fixture 位于系统临时目录并已清理。

## 最新刷新
2026-07-10：四项复杂项目能力补强、独立 review 修复、真实行为评测、全局同步和 workflow 收口完成。
