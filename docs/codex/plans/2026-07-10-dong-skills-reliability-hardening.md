# Dong Skills 恢复与安装可靠性实施计划

**目标:** 修复提交后审查确认的六项恢复、外部进程、安装事务和测试编排问题。
**规格:** `.codex-context/spec.md`。
**规格审批:** Approved by user。
**Artifact Readiness:** implementation-ready。
**工作类别 / 风险等级:** Lane 3，涉及恢复信任边界、持久事务和发布验证。
**执行模式:** Traditional task-by-task execution。
**当前步骤:** Task 1-5 已完成。
**验证:** 定向测试、完整领域测试、health、release check、真实 bootstrap 与全局同步。
**执行审批:** plan-then-execute requested。

## 技术决策
- 在 workflow state 中持久化生成 handoff hash 时对应的 task id 与 generation；普通工作阶段允许 hash 为空，但 recovery evaluator 对活跃 workflow 要求有效 hash 和身份一致。
- complete workflow 不要求活跃 next skill；recovery 输出应明确 workflow 已完成。
- forward-eval 使用 Node `spawnSync` 原生 timeout，不引入进程管理依赖；超时单独分类并继续其余 case。
- installer 在稳定的临时 journal 路径记录事务快照；下次安装获得同一目标锁后先恢复未完成事务。
- installer 只快照实际修改的 context 模板、managed runtime、hooks、marker、AGENTS 和 gitignore，不快照 `.codex-context/raw`。
- bootstrap 测试按行为域拆分，不改变测试逻辑和断言。

## Simplicity Gate
- 复用现有 `workflowContextHash`、安装 lock、transaction entry、managed runtime 列表和领域 runner。
- timeout 使用 Node 标准库；journal 使用 PowerShell JSON 和现有 SHA256/path guard。
- 不创建通用事务框架，不增加依赖，不重构无关 skills。

## 任务

- [x] Task 1: Recovery freshness、task identity 与 complete 语义
  - Files: `.codex/scripts/lib/workflow.mjs`, `.codex/scripts/lib/recovery-eval.mjs` 及 bootstrap 镜像；`tests/domains/{core,workflow-hooks}.test.mjs`
  - Steps: 增加 null hash、task mismatch、complete recovery 失败测试；扩展 workflow hash identity；实现 phase-aware probes；验证镜像 parity。
  - Verify: `node --test tests/domains/core.test.mjs tests/domains/workflow-hooks.test.mjs`

- [x] Task 2: Forward backend timeout
  - Files: `scripts/skill-forward-eval.mjs`、bootstrap 镜像、`evals/skill-forward/README.md`、`tests/domains/memory-evolution.test.mjs`
  - Steps: 增加慢 backend 失败测试；实现 `--timeout-ms`、参数校验和 timeout 分类；验证后续 case 继续执行。
  - Verify: `node --test tests/domains/memory-evolution.test.mjs`

- [x] Task 3: Crash-safe installer 与精确快照
  - Files: `scripts/install-windows.ps1`、`.agents/skills/codex-codebase-onboarding/scripts/bootstrap-project-ops.ps1`、`tests/domains/bootstrap-*.test.mjs`
  - Steps: 增加持久 journal、启动恢复、staging/previous 清理；将目录快照改为 managed files；增加强制终止和 locked raw e2e。
  - Verify: `node --test tests/domains/bootstrap-recovery.test.mjs tests/domains/bootstrap-install.test.mjs`

- [x] Task 4: Bootstrap 测试域拆分
  - Files: `tests/domains/bootstrap-runtime.test.mjs`、新 bootstrap domain files、必要共享 support。
  - Steps: 按安装、完整性、恢复/并发移动原测试；保持 test names 和断言；删除空旧文件。
  - Verify: `node scripts/run-domain-tests.mjs`

- [x] Task 5: 集成验证与交付
  - Files: README/health/manifest/state docs 仅在实际合同变化时更新。
  - Steps: 运行完整领域测试、health、release、真实临时 bootstrap、全局同步和 installed health；执行 diff/self-review。
  - Verify: `node scripts/run-domain-tests.mjs`; `node scripts/release-check.mjs .`

## 运行约束
- 每个任务先红后绿；不为通过测试削弱 fail-closed 规则。
- 根文件和 bootstrap 镜像必须同一任务内同步。
- installer rollback/recovery 失败时保留证据。
- 连续两次同根因失败时停止叠补丁，回到设计。

## 存档节奏
- 每个任务验证后更新 `.codex-context/plan-progress.md` 与 verification。
- 最终 checkpoint 暂缓，等待用户确认是否提交。

## 回滚
- Recovery 新字段缺失时按 `none` 归一化，普通 health 不阻断旧项目；只有恢复 evaluator 对活跃 workflow fail closed。
- Timeout 默认值可通过 CLI 覆盖；recorded output 模式不受影响。
- Journal 恢复不能安全验证路径或备份时停止并保留文件。

## Definition of Done
- 六项问题均有失败回归和通过证据。
- 现有测试不减少；当前为 114 条、10 个 domain。
- health、release、bootstrap 镜像、全局安装均通过。
- 无临时 backend、transaction、staging 或 previous 产物残留。
