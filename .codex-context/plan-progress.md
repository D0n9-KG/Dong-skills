# 计划进度

## Task Identity
- task_id: task-8-2026-07-14T02-39-43-596Z
- task_generation: 8

## 当前计划

- `docs/codex/plans/2026-07-14-minimal-hook-kernel.md`

## Artifact Readiness

- implementation-ready；无 launch-blocking open question。

## 规格审批

- Approved by user on 2026-07-14。

## 执行审批
- status: approved
- approved_by: user
- mode: traditional

## 执行模式
- mode: traditional

## 工作类别 / 风险等级

- Lane 3：hook 权限边界、状态恢复、安装分发和下游 live runtime。

## Goal 模式目标

- 未选择；本轮按用户直接修复授权使用 Traditional 模式。

## Loop Review

- Traditional: not-required。

## 运行约束

- test-first；不为绿灯削弱明确当前项目写入负例。
- 不把 hooks 声称为完整安全 sandbox；未知命令 fail-open 是显式产品边界。
- 不删除用户事实或 raw 研究证据以达到预算目标。
- 根 runtime、bootstrap、installer manifest 必须一致。
- 不修改下游业务代码；上游代码只有 fresh process 仍失败并有 failing test 时才改。

## 存档节奏

- Tasks 1-2 focused pass 后 checkpoint。
- Task 3 budget/health pass 后 checkpoint。
- Task 4 完整验证审查后 closure checkpoint。
- 下游安装和上游服务分别记录，禁止混提交。

## 任务

- [x] Task 1：锁定失败合同。
- [x] Task 2：实现最小 hook 内核。
- [x] Task 3：状态、health 与热路径减负。
- [x] Task 4：完整验证和独立审查。
- [ ] Task 5：下游安装与 live 回归。
- [ ] Task 6：上游服务与研究恢复。

## 当前步骤

- Task 5：先创建 source checkpoint，再执行两个下游 installer Apply 与 live 回归。

## 存档记录

### Checkpoint
- Task completed：Tasks 1-4；Task 4 最终 closure review 无 Critical/High。
- Files changed：最小 hook runtime/config、bootstrap 镜像、health/budget/skills/AGENTS、installer 与 domain tests。
- Verification：focused 64/64；full domains 160/160；release-check pass；最终 closure review 无 Critical/High；health issues none；hot path 约 3.3k；runtime/bootstrap parity pass。
- Remaining risk：source commit、下游 Apply/live smoke。
- Next task：source checkpoint，然后下游 Apply/live 回归。

### Checkpoint
- Task completed：Task 5 installer migration 调试；legacy CRLF plan hash 连续迁移问题已 test-first 修复。
- Files changed：root/bootstrap `workflow.mjs`、core migration regression 与状态证据。
- Verification：两个精确 legacy CRLF migration 回归均先红后绿；core 27/27、full domains 162/162、release-check pass、runtime parity pass。
- Remaining risk：`sci-evo-extract` 真实 installer Apply 与两个下游静态/live 验证。
- Next task：创建修复 checkpoint，重试 `sci-evo-extract` Apply。

## 验证

- `node --test tests/domains/host-wrapper.test.mjs tests/domains/workflow-hooks.test.mjs tests/domains/health-release.test.mjs tests/domains/assets-worktree.test.mjs`
- `node scripts/run-domain-tests.mjs`
- `node scripts/release-check.mjs .`
- `git diff --check`
- installer Preview/Apply、context hash preservation、下游 context-budget、重启后 live hooks/CDP/Stop/PreCompact。

## 范围外

- 推送远端、发布 tag、删除用户事实、修改研究方法/实验、无 failing evidence 的上游业务重构。
