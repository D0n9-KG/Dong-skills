# 计划进度

## Task Identity
- task_id: task-6-2026-07-12T15-42-07-054Z
- task_generation: 6

## 当前计划
修复 `raw` 治理豁免和 checkpoint freshness 事实源不一致，并同步发行镜像。

## 规格审批
Approved by user on 2026-07-12。

## 执行审批
Approved by user for Traditional task-by-task execution on 2026-07-12。

## 执行模式
Traditional task-by-task execution。

## Artifact Readiness
implementation-ready。

## 工作类别 / 风险等级
Lane 3。涉及 hook 安全门、恢复门和 Stop 收尾，必须测试先行并做完整发布检查。

## Goal 模式目标
未选择 Codex Goal mode。

## 运行约束
- 不削弱 recovery、workflow、审批、验证和 checkpoint 证据。
- 不建立第二套 shell 解析器或 freshness 状态。
- 根运行时和 bootstrap 镜像必须完全一致。
- 失败测试先证明问题，再做最小实现。
- 状态文件只记录可恢复事实，不记录隐藏思维链。

## 存档节奏
- 两个失败用例转绿并通过完整发布检查后提交。
- 推送后同步全局 Dong Skills 安装副本。

## 简化门禁
- can avoid building：不能，仅改文档无法修复运行时误判。
- standard library：复用现有 `fs.statSync`、路径和 mtime 逻辑。
- native platform：继续使用 Git 状态和现有 hook receipt，不引入依赖。

## 任务
- [x] Task 1：新增 `raw` 复合重定向绕过 recovery 的失败回归。
- [x] Task 2：新增 checkpoint stale 结论与详情文件集合不一致的失败回归。
- [x] Task 3：排除 `.codex-context/raw` 的治理修复豁免。
- [x] Task 4：新增统一 freshness info，并接入 Stop、PreCompact 和状态摘要。
- [x] Task 5：同步 onboarding bootstrap 镜像。
- [x] Task 6：运行针对性回归、完整 workflow-hooks 和 release-check。
- [x] Task 7a：完成代码审查。
- [ ] Task 7b：提交、推送和全局安装同步。

## 当前步骤
Task 7b：Git checkpoint 与安装同步。

## 验证
- 两个原始失败用例：2/2 pass。
- 相邻回归：8/8 pass。
- `tests/domains/workflow-hooks.test.mjs`：97/97 pass。
- `node scripts/release-check.mjs .`：pass。

## 范围外
- 完整 shell sandbox。
- 自动升级所有旧项目。
- 修改非 Dong Skills 的全局技能。
