# Handoff 摘要

## 目标
修复 Dong Skills Stop hook 返回协议与当前 Codex App 不兼容的问题，避免 UI 钩子摘要显示 `hook returned invalid stop hook JSON output`。

## 最新用户指令
用户发来钩子摘要截图，询问该错误是否需要理会、具体是什么问题。

## 已批准范围 / 规格
- 只修 Stop hook 返回协议；PreCompact / PostCompact 暂不改，因为截图和最小复现只指向 Stop。
- Stop 通过时输出空对象 `{}`。
- Stop 阻断时输出 `{decision:"block", reason:"..."}`。
- `reason` 保留原有 Hook status、Git root、workflow、changed files、issues 和下一步指导。
- 同步 root 模板和 onboarding bootstrap 资产，避免旧项目更新后仍拿到旧协议。

## 计划状态
- 实施状态：代码和测试改动已完成。
- 验证状态：通过。
- Checkpoint 状态：本轮 Stop hook 协议修复尚未提交。

## 已修改文件
- `.codex/scripts/lib/events.mjs`
- `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
- `tests/project-ops.test.mjs`
- `.codex-context/current-state.md`
- `.codex-context/artifact-index.md`
- `.codex-context/verification.md`
- `.codex-context/handoff-summary.md`

## 已读取但未修改文件
- `.agents/skills/using-superpowers/SKILL.md`
- `.agents/skills/diagnosing-bugs/SKILL.md`
- Codex manual 本地缓存文件，已用于只读核实 hooks 章节。
- 旧业务项目的项目级 hook，已通过模拟 payload 间接调用检查。

## 已做决策
- 这不是文件损坏，也不是普通“状态过期”警告；它会导致 Stop hook 阻断反馈不能被 Codex UI 正确解析。
- 根因是 Dong Skills 源模板把 Stop hook 输出固定成旧协议 `{continue:false, stopReason, systemMessage, hookSpecificOutput}`。
- 当前修复依据来自本机 Codex UI 报错、同一 payload 的最小复现、Dong Skills 测试旧断言；官方 Codex 手册确认 Stop hook 事件和 hooks 运行机制，但没有公开 Stop 输出 schema。

## 开放问题与假设
- 无阻塞开放问题。
- 假设：当前 Codex App Stop hook 阻断协议使用 `decision/reason`，通过时空对象安全；测试与 UI 症状支持该判断。

## 风险
- 旧业务项目不会自动拿到该修复；需要重新运行 Dong Skills 项目更新/bootstrap，并在 `/hooks` 里重新 trust 变更后的 hook。
- PreCompact 仍保持 `continue/stopReason/systemMessage`，如果未来 UI 对 PreCompact 也报类似 invalid JSON，再单独按事件协议修。

## 验证证据
- `node --test tests\project-ops.test.mjs`: pass，64/64。
- `node scripts\release-check.mjs .`: pass。
- `git diff --check`: pass，仅有 Git CRLF normalization warning。
- `node .codex\hooks\project-ops.mjs health-check`: pass，Issues none。
- 用 `sci-evo-extract` 的 Stop payload 调用修复后源模板，输出为 `{decision:"block", reason:"..."}`。

## Git 存档
- 最新提交: `1a77fa9 fix(hooks): prefer pwsh for Windows project ops hooks`，本轮 Stop hook 协议修复尚未提交。
- 推送状态: 当前工作区有未提交修改。
- 已包含文件: 上一轮 PowerShell 7 hook 优化已提交并推送。
- 有意保留未提交的文件: 本轮修改文件尚未提交。
- 暂缓原因: 等待用户确认是否提交，或由本轮继续提交。
- 下次存档: 本轮确认后提交 `fix(hooks): emit Codex-compatible Stop output` 并推送。

## 需要保留的经验沉淀
- Hook 事件的输出协议不能跨事件套用；Stop、PreCompact、PostToolUse 应分别验证。
- UI 提示 `invalid ... JSON output` 不一定表示 JSON 语法错，也可能是 schema 不符合当前 Codex 对该事件的期望。
- 测试不能固定旧协议字段，否则会把兼容性问题长期固化。

## 下一步动作
向用户说明“这个需要理会”，根因已定位并修复源头；给出旧项目更新提示词。

## 优先重读文件
1. `.codex-context/handoff-summary.md`
2. `.codex-context/current-state.md`
3. `.codex/scripts/lib/events.mjs`
4. `.agents/skills/codex-codebase-onboarding/assets/project-ops/.codex/scripts/lib/events.mjs`
5. `tests/project-ops.test.mjs`
