# Handoff 摘要

## 目标

- 修复 Dong Skills 在真实 Codex host 下的 recovery、host wrapper、refresh、external scope 与 subagent state isolation，并发布安装到 `scientific_Graph`。

## 最新用户指令

- 用户授权直接维护真实 Dong Skills 源仓库，自行修复、测试和安装到没有已知可复现问题。
- 用户已暂时关闭下游 hooks；最终安装后由用户重启并重新 trust，再补 live liveness。

## 已批准范围 / 规格

- Spec：`.codex-context/spec.md`，Lane 3，Traditional plan-then-execute。
- 允许 runtime、bootstrap 镜像、tests、installer 验证和 Dong Skills 治理状态。
- 不修改下游研究业务代码、实验数据、文献资产或方法结论。

## 计划状态

- Tasks 1-6 已完成；Task 7 正在创建源码 checkpoint。
- 下游研究 workflow 已恢复 Wayfinder。

## 已做决策

- recovery unscoped receipt 只允许单次 claim，promotion 失败 fail-closed。
- external scope 只信任可验证目标/命令，不凭单一外部路径无条件豁免。
- `{}` 以内容 hash 判定 refresh，显式失败/no-op 不计。
- tool/subagent-originated prompt 不得写 parent discussion、approval 或 learning。
- installer Apply 仍是高风险项目变更；本轮由用户明确关闭 hooks 完成，不增加无条件 self-update bypass。

## Files Modified

- `.codex/scripts/lib/events.mjs`、`.codex/scripts/lib/runtime.mjs`。
- onboarding bootstrap 中对应两个 runtime 镜像。
- `tests/domains/workflow-hooks.test.mjs`、`tests/domains/host-wrapper.test.mjs`、`tests/domains/workflow-governance.test.mjs`。
- Task 7 spec、plan、current-state、verification、artifact、decisions、open questions、working notes 与 workflow state。

## 验证证据

- domain tests 233/233 pass；release-check pass。
- workflow hooks 101/101；host-wrapper 5/5；关键 9 项连续 3 轮 pass。
- runtime/bootstrap parity、diff check、installer transaction hygiene pass。
- 下游 distribution `6de4533c325cb9cf8026622fa00f4df2a31ecb57f569ccb3857aa9de1af168a7` 已安装。
- 下游 static health/runtime parity/recovery/context budget/asset governance pass；live liveness 待重启。

## Git Checkpoint

- 最新提交：当前 HEAD，提交信息 `fix(hooks): harden host recovery and state isolation`。
- 推送状态：not-run；用户未要求 push。
- 已包含文件：runtime、bootstrap 镜像、domain tests、Task 7 spec/plan/state 与历史 Task 6 archive。
- 有意保留未提交的文件：none。
- 暂缓原因：push 未获用户要求；live hook liveness 需下游重启后补验，但不影响本地源码 checkpoint。
- 下次存档：重启后若 live 回归产生修复，再创建后续 checkpoint。

## 下一步动作

1. 源仓库 workflow 转入 verification/review/delivery 并完成 checkpoint。
2. 用户重启并 trust 下游 hooks。
3. 补 live PreToolUse/PostToolUse/Stop/subagent isolation 回归。
4. 若无新问题，关闭 Dong Skills 维护并继续研究 Wayfinder。

## 优先重读文件

1. `.codex-context/verification.md`
2. `.codex-context/plan-progress.md`
3. `tests/domains/host-wrapper.test.mjs`
4. `.codex/scripts/lib/events.mjs`
5. `.codex/scripts/lib/runtime.mjs`
