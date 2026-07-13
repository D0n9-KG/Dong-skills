import fs from "node:fs";
import path from "node:path";

export const REQUIRED_FILES = {
  current: "current-state.md",
  projectMap: "project-map.md",
  spec: "spec.md",
  plan: "plan-progress.md",
  artifacts: "artifact-index.md",
  decisions: "decisions.md",
  questions: "open-questions.md",
  risks: "risks.md",
  verification: "verification.md",
  workingNotes: "working-notes.md",
  instincts: "learned-instincts.md",
  dongSkillsOutbox: "dong-skills-outbox.md",
  solutions: "solution-index.md",
  worktree: "worktree-state.md",
  workflow: "workflow-state.yaml",
  handoff: "handoff-summary.md"
};

export const TEMPLATES = {
  "current-state.md": `# 当前状态

## 目标
建立当前任务范围，并在实施前确认正确的工作流入口。

## 最新用户指令
最新任务指令尚待从当前会话外化到本文件。

## 当前阶段
discovery

## 当前假设
- 尚无任务级假设；先使用 \`using-superpowers\` 判断下一阶段。

## 阻塞项
- 无。

## 下一步动作
使用 \`using-superpowers\` 根据最新用户指令选择 onboarding、Wayfinder、brainstorming 或直接小改路径。

## 最后更新
当前任务初始化。
`,
  "project-map.md": `# 项目地图

## 用途
[这个项目做什么；未知则写“未知”。]

## 技术栈
- [语言 / 框架 / 包管理器。]

## 架构
- [关键组件及其连接方式。]

## 重要路径
- \`path\`: [用途]

## 入口点
- \`path\`: [运行时或命令入口]

## 命令
- Dev: \`[命令或未知]\`
- Build: \`[命令或未知]\`
- Typecheck: \`[命令或未知]\`
- Lint: \`[命令或未知]\`
- Test: \`[命令或未知]\`

## 约定
- [有证据支持的项目约定。]

## 修改位置指南
- [任务类型]: \`path\`

## 架构关注点
- [需要复查的大文件、平铺目录、耦合或所有权不清问题。]

## 未知项
- [未知内容，以及如何验证。]
`,
  "spec.md": `# 规格

## 问题
[用户想解决什么。]

## 目标
- [目标。]

## 审批状态
Living Draft / Not Approved。最终讨论通过后使用 Pending written-spec approval；只有用户批准书面规格后才写 Approved by user on [日期/时间]。

## 事实优先级
- 最新用户指令。
- 代码、测试、命令、产品证据或实时仓库检查得到的已验证行为。
- 当前任务已批准的书面规格和计划。
- 当前状态文件和 handoff。
- 更早的聊天、原始记录、过期规格或未审查观察。

## 工作类别 / 风险等级
- Lane 0 / Lane 1 / Lane 2 / Lane 3，并说明理由。

## 非目标
- [明确不做的事项。]

## 已批准范围
- [已批准的内容。]

## 用户决策
- [决策和日期。]

## 候选方案
- 暂无。

## 设计
- 尚未起草。

## 验收标准
- [可观察结果。]

## 开放问题
- [问题或“无”。]

## 下一步
[brainstorming | writing-plans | executing-plans | direct tiny edit | pause]
`,
  "plan-progress.md": `# 计划进度

## 当前计划
[详细计划 / 规格路径；没有正式计划则写“暂无正式计划”。]

## 规格审批
[Approved by user / skipped by user / mechanical exception / pending。]

## 执行审批
尚未批准。实现前记录 “Approved by user for Traditional task-by-task execution on [日期/时间]”、“Approved by user for Codex Goal mode on [日期/时间]”，或 “plan-then-execute requested; Traditional task-by-task execution”。

## 执行模式
等待用户选择。可选值：Traditional task-by-task execution；Codex Goal mode。不要从“继续”、“执行”或 plan-then-execute 推断为 Codex Goal mode。

## 工作类别 / 风险等级
待定。记录 Lane 0、Lane 1、Lane 2 或 Lane 3，并说明为什么足够。该等级决定计划深度、验证深度、状态更新节奏、审查、回滚和存档节奏。

## Goal 模式目标
未选择。如果用户明确选择 Codex Goal mode，写明当前 Codex session 可用的 goal 机制、目标、规格路径、计划路径、已批准范围、非目标、当前步骤、验证命令、存档节奏、必须更新的状态文件和停止条件。若当前 session 没有真实 goal 机制，则 Goal mode 不可用。

## 运行约束
- 除非阻塞项要求重新规划，否则按已批准计划顺序执行。
- 保持 \`plan-progress.md\`、\`artifact-index.md\`、\`verification.md\`、\`current-state.md\` 和 \`handoff-summary.md\` 更新。
- 遇到需求模糊、重复验证失败、范围变化、破坏性操作、缺少凭据、缺少用户决策、架构冲突或状态矛盾时停止。
- 不要静默扩大已批准规格之外的范围。

## 存档节奏
- 每个有意义且已验证的任务或里程碑后做 checkpoint；若暂缓，记录原因。

## 任务
- [ ] 任务 1：[状态和证据]

## 当前步骤
[只写一个当前活动步骤，或“无”。]

## 存档记录
[执行期 checkpoint 只追加在本节；任务勾选、当前步骤和本节内容不改变已批准 plan contract。]

## 验证
- [命令 / 检查及预期信号。]

## 范围外
- [明确非目标。]
`,
  "artifact-index.md": `# 资产索引

## 已创建
- 当前 task-scoped 上下文已初始化。

## 已修改
- 尚未开始任务级项目修改。

## 已读取 / 已检查
- 最新任务范围和项目相关文件尚待检查。

## 原始输出
- 暂无。
`,
  "decisions.md": `# 决策

## 已接受
- 暂无。

## 已拒绝
- 暂无。
`,
  "open-questions.md": `# 开放问题

- 无。
`,
  "risks.md": `# 风险

## 上下文风险
- 暂无已知风险。

## 技术风险
- 暂无已知风险。

## 架构风险
- 暂无已知风险。

## 文档风险
- 暂无已知风险。

## 安全 / 破坏性风险
- 暂无已知风险。
`,
  "verification.md": `# 验证

## 验证证据
- 当前任务仅完成上下文初始化，尚未开始项目实现。

## 尚未验证
- 最新任务的业务行为、实现和测试均尚未验证。

## 审查证据
- 尚未审查。
`,
  "working-notes.md": `# 工作笔记

## 用途
记录需要跨压缩保留的紧凑外部化调查状态。不要在这里保存隐藏思维链、完整聊天记录、原始日志、密钥或私密推理。

## 当前发现
- 暂无。

## 当前假设
- 暂无。

## 已排除路径
- 暂无。

## 开放调查问题
- 暂无。

## 下一步验证
- 暂无。

## 提升记录
- 在阶段边界，把持久结论提升到 spec.md、decisions.md、current-state.md、handoff-summary.md 或 docs/solutions/。
`,
  "learned-instincts.md": `# 经验沉淀

## 摘要
这个文件只作为紧凑索引。单条 instinct 存放在 \`.codex-context/instincts/\`。

## 原始观察审查
- 上次审查 raw observations：暂无。
- 审查规则：有用事件转成 instincts，重复内容吸收到已有文档，噪音明确记录为丢弃。

## 当前项目有效经验
- 暂无。

## 候选经验
- 暂无。

## 已退役 / 已矛盾 / 已替代
- 暂无。

## 待提升候选
- 暂无。

## 维护记录
- 暂无。
`,
  "dong-skills-outbox.md": `# Dong Skills 优化 Outbox

## 用途
当无法找到或写入真实 Dong Skills 源仓库时，这个文件作为 Dong Skills 优化想法的 fallback 队列。

不要把这里的条目当成项目经验、项目规则或 solution memory。有用条目应迁移到 Dong Skills 源仓库的 \`docs/improvements/backlog.md\`。

## 目标位置
- 优先位置：Dong Skills repo 的 \`docs/improvements/backlog.md\`
- 发现顺序：\`DONG_SKILLS_REPO\`、\`DONG_SKILLS_HOME\`、全局 source marker、当前 repo 如果就是 Dong Skills、最后才写这个 outbox

## 待迁移优化
- 暂无。

## 已迁移
- 暂无。
`,
  "solution-index.md": `# Solution 索引

## 知识库
- docs/solutions 存在：否
- CONCEPTS.md 存在：否
- Solution 文档数量：0

## 分类
- 暂无。

## 验证
- 暂未发现验证问题。

## 刷新信号
- 暂无需要刷新的候选。

## 最后更新
- 暂无。
`,
  "worktree-state.md": `# Worktree 状态

## 当前工作区
- Role: unknown
- Path: 尚未检测
- Detection date: 尚未检测

## 主检出区
- Path: 尚未检测
- Relationship: 尚未检测

## 分支状态
- Branch: 尚未检测
- Detached HEAD: 尚未检测
- Base branch: 尚未检测

## 所有权与清理
- Cleanup owner: unknown
- Cleanup rule: 除非明确记录为 \`dong-managed-worktree\` 且用户批准清理，否则不要删除任何 worktree。

## Hook 根目录记录
- Hook source root: 尚未检测
- Actual Git root: 尚未检测
- Notes: 如果 Codex UI 显示的 hooks 来源 checkout 与当前 Git root 不同，更新这里。

## 恢复指令
- 分支完成或清理前，重新运行 \`git rev-parse --show-toplevel\`、\`git rev-parse --git-dir\`、\`git rev-parse --git-common-dir\` 和 \`git branch --show-current\`。
- 如果 session 从 Codex App worktree 恢复，编辑项目文件前先更新本文件。
`,
  "workflow-state.yaml": `workflow: standard
work_lane: lane-1
task_id: task-1
task_generation: 1
phase: discovery
next_skill: codex-codebase-onboarding
auto_next: true
decision_required: none
spec_status: not-started
plan_status: not-started
approved_spec_hash: none
approved_plan_hash: none
execution_mode: pending
execution_approval: pending
loop_review_status: pending
verify_result: pending
verification_gap_status: not-required
review_status: pending
checkpoint_status: pending
verification_evidence_hash: none
review_evidence_hash: none
resume_phase: none
resume_skill: none
debug_return_phase: none
debug_return_skill: none
handoff_hash: null
handoff_task_id: none
handoff_task_generation: none
updated_at: not-started
note: initialized
`,
  "handoff-summary.md": `# Handoff 摘要

## 目标
建立当前任务范围，并选择正确的项目工作流。

## 最新用户指令
最新任务指令尚待从当前会话外化。

## 已批准范围 / 规格
尚未形成或批准当前任务规格。

## 计划状态
暂无正式计划；当前阶段为 discovery。

## 已修改文件
- 当前 task-scoped 上下文已重置。

## 已读取但未修改文件
 - 尚未检查任务相关项目文件。

## 已做决策
- 使用 \`using-superpowers\` 选择下一阶段。

## 开放问题与假设
- 当前任务目标、边界、风险等级和验证方式尚待确认。

## 风险
- 在最新用户指令外化前，不应依赖旧任务范围或批准状态。

## 验证证据
- 当前任务仅完成上下文初始化。

## Git 存档
- 最新提交: 尚未检查。
- 推送状态: 尚未检查。
- 已包含文件: 当前 task-scoped 上下文初始化。
- 有意保留未提交的文件: 尚未检查。
- 暂缓原因: 当前任务尚未形成首个验证里程碑。
- 下次存档: 首个有意义且已验证的任务里程碑后。

## 需要保留的经验沉淀
- 尚无当前任务经验。

## 下一步动作
使用 \`using-superpowers\` 读取最新用户指令并选择下一阶段。

## 优先重读文件
- \`.codex-context/workflow-state.yaml\`
- \`.codex-context/current-state.md\`
- \`.codex-context/project-map.md\`
- \`.codex-context/spec.md\`
- \`.codex-context/plan-progress.md\`
`
};

function ensureGitkeep(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "", "utf8");
}

export function ensureContext(root) {
  const ctx = path.join(root, ".codex-context");
  fs.mkdirSync(path.join(ctx, "raw"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "archive"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "project"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "retired"), { recursive: true });
  ensureGitkeep(path.join(ctx, "raw", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "archive", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "project", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "candidates", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "retired", ".gitkeep"));
  for (const [name, body] of Object.entries(TEMPLATES)) {
    const file = path.join(ctx, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, body, "utf8");
  }
  return ctx;
}
