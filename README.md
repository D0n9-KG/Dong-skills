# Dong Skills

Dong Skills is a Codex project-operations skill kit for long-running software work. It keeps project truth outside the chat window, makes context recoverable after compaction or new sessions, and turns verified work into reusable project knowledge.

It combines a curated subset of [Superpowers](https://github.com/obra/superpowers), learning/onboarding ideas adapted from [ECC](https://github.com/affaan-m/ECC), context-governance patterns inspired by [agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering), and workflow ideas adapted from [Compound Engineering](https://github.com/everyinc/compound-engineering-plugin).

## 中文

### 这个项目解决什么

Codex 做完整项目时，风险通常不是“不会写代码”，而是：

- 需求、边界、计划、验证证据散落在聊天里。
- 自动压缩或新 session 后，重要上下文丢失。
- 做到一半偏离目标，或者忘记前面已经做过的决策。
- 文件改了，但状态、文档、验证、交接没有同步。
- 项目推进久了，结构变平、文件变大、文档变脏，后续越来越难改。
- 已验证的经验没有沉淀，下一次又重新踩坑。

Dong Skills 把这些信息移到项目内的 `.codex-context/`、`docs/solutions/`、`CONCEPTS.md` 和 `STRATEGY.md`，再用 skills 和项目级 hooks 推动 Codex 按阶段维护它们。

### 核心机制

- 主流程治理：`codex-project-governance` 协调发现、澄清、计划、执行、调试、验证、评审、学习、提交、交接。
- 阶段边界：非平凡工作先 `brainstorming` 形成用户确认的 spec，再用 `writing-plans` 写计划，计划执行前需要用户确认或明确的 plan-then-execute 指令。
- 上下文恢复：`SessionStart` 注入恢复顺序；压缩后由 `SessionStart` 的 `compact` 启动来源恢复上下文，`PostCompact` 只确认压缩事件完成。
- 压缩前检查：`PreCompact` 检查 handoff、核心状态文件和学习审查是否新鲜。手动压缩不满足条件时会被拦住；自动压缩不硬拦，而是先写入应急 `handoff-summary.md` 再放行，避免上下文压力下静默卡住。
- 文件变更追踪：`PostToolUse` 在非上下文文件变化后要求刷新 `artifact-index.md`。
- 完成前闸门：`Stop` 检查状态、产物索引、验证记录、Git checkpoint、交接和学习审查。
- Git 存档纪律：`codex-git-checkpoint` 管理 diff review、commit message、checkpoint commit 和 push 记录。
- 策略锚点：`codex-strategy-anchor` 维护 `STRATEGY.md`，让需求和计划受产品目标、用户、指标和 active tracks 约束。
- 结构化经验库：`codex-solution-memory` 把非平凡、已验证的经验写入 `docs/solutions/`，并维护 `CONCEPTS.md` 和 `.codex-context/solution-index.md`。
- 短记忆沉淀：`codex-learning-memory` 只保存短的 trigger/action instincts，不把复杂经验塞进杂乱笔记。
- 安全 session 检索：`codex-session-history` 只先查元数据和关键词计数，不把完整 session 或 raw transcript 塞进上下文。
- Persona 评审：`codex-review-panel` 用 correctness、testing、maintainability、standards，以及按需 security、performance、API contract、reliability、adversarial 等视角审查。
- 产品证据：`codex-evidence-capture` 要求对 UI、CLI、API、生成物或工作流变化做真实使用证据，而不把测试输出冒充 demo。
- 架构治理：`codex-architecture-governance` 审查大文件、平铺目录、耦合、重复概念、边界和可测试性。
- 文档治理：`codex-docs-stewardship` 清理 README、AGENTS、docs、`.codex-context/`、`docs/solutions/` 和 `CONCEPTS.md`。
- 上下文预算：`codex-context-budget` 检查 skills、hooks、state files、docs 是否膨胀。
- 资产生命周期治理：`codex-asset-governance` 审计 docs/state/raw/archive/scripts/hooks/tests/code 资产，防止工作区一味叠加。
- 发布安全：`release-check` 跑语法、测试、隐私和运行时产物检查。

### 包含的 skills

| Skill | 用途 |
| --- | --- |
| `using-superpowers` | 进入项目工作时选择合适流程 skill。 |
| `brainstorming` | 模糊、创造性或行为变更任务先形成可恢复 spec。 |
| `writing-plans` | 把明确需求转成可执行、可验证的计划。 |
| `executing-plans` | 按计划逐项执行并维护进度。 |
| `systematic-debugging` | 遇到 bug、失败或异常时先定位根因。 |
| `verification-before-completion` | 完成声明前要求验证证据。 |
| `codex-codebase-onboarding` | 新项目启动、bootstrap 项目级 hooks、建立项目地图。 |
| `codex-project-governance` | 非平凡项目工作的主循环。 |
| `codex-verification-loop` | 选择并记录 build、typecheck、lint、test、security、diff、产品证据。 |
| `codex-evidence-capture` | 捕获真实产品使用证据。 |
| `codex-git-checkpoint` | 阶段边界、压缩、交付或 GitHub 存档前提交/推送。 |
| `codex-review-panel` | 用多 persona 审查代码、计划、文档、架构和交付证据。 |
| `requesting-code-review` | 轻量 review 入口，必要时路由到 review panel。 |
| `receiving-code-review` | 判断并处理 review 反馈。 |
| `codex-architecture-governance` | 治理项目结构、模块边界、耦合和可测试性。 |
| `codex-docs-stewardship` | 同步和清理文档、状态文件、归档和知识库。 |
| `codex-asset-governance` | 统一治理 docs/state/raw/archive/scripts/hooks/tests/code 资产生命周期。 |
| `codex-learning-memory` | 沉淀短的项目 instincts 和用户纠正。 |
| `codex-solution-memory` | 沉淀结构化 solution docs 和项目词汇。 |
| `codex-session-history` | 安全检索 prior sessions，避免完整 transcript 污染上下文。 |
| `codex-strategy-anchor` | 创建或维护 `STRATEGY.md`。 |
| `codex-context-budget` | 审查上下文成本和治理文件膨胀。 |

### 安装

Windows PowerShell:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

如果已经在目标项目目录中运行：

```powershell
.\scripts\install-windows.ps1
```

安装器会：

- 复制 bundled skills 到用户 `.agents\skills`。
- 创建或补齐 `.codex-context/` 模板。
- 安装 `.codex/hooks/project-ops.mjs`、`.codex/scripts/lib/` 和 helper scripts。
- 合并 `.codex/hooks.json` 中受管理的 hook groups。
- 合并 `.gitignore` 运行时保护规则，避免提交 `.codex-context/raw/` 内容。
- 把受 marker 管理的项目说明片段合并到 `AGENTS.md`。

安装后重启 Codex 或开新 thread。若 Codex 提示 trust hooks，打开 `/hooks` 信任项目 hooks。

Dong Skills 使用项目级 hooks，不安装全局 hooks。每个项目可以独立选择是否启用。

### 新项目怎么启动

首次安装 Dong Skills 后，新项目不必手动跑安装脚本。进入目标仓库，开一个 Codex thread，然后说：

```text
使用 codex-codebase-onboarding 启动这个项目。
```

`codex-codebase-onboarding` 会检查项目配置是否存在；缺失时运行自带 bootstrap，写入 `.codex-context/`、`.codex/hooks/`、`.codex/hooks.json` 和 `AGENTS.md` marker block，然后继续建立 `project-map.md` 和 `solution-index.md`。

### 常用命令

从目标项目运行：

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
node .codex/hooks/project-ops.mjs solution-status
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs solution-validate
node .codex/hooks/project-ops.mjs session-history scan --days 7 --keywords auth,token
node .codex/hooks/project-ops.mjs health-check
```

从本 kit 目录运行：

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/solutions.mjs "C:\path\to\repo" status
node scripts/session-history.mjs "C:\path\to\repo" scan --days 7 --keywords auth,token
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### 隐私与发布安全

发布包不应包含：

- 本机个人路径、私有目录结构、原始 session 内容。
- credentials、keys、cookies、headers、private query strings。
- raw observations、日志、临时文件、备份文件。
- 客户资料、未脱敏 URL、私有项目代码。

`UserPromptSubmit` hook 只保存脱敏短摘录、prompt fingerprint 和元数据；raw observations 不是 active memory。发布前运行：

```powershell
node scripts/release-check.mjs "."
```

### 来源与许可

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- Compound Engineering workflow ideas are adapted from [everyinc/compound-engineering-plugin](https://github.com/everyinc/compound-engineering-plugin).
- License files are included under `licenses/`.

## English

### What This Project Is For

Dong Skills is for full Codex project work, not one-off prompting. It keeps durable project truth in files that Codex can re-read after compaction, thread restarts, or long pauses.

It helps with:

- preventing implementation drift
- preserving handoff state across context compaction
- tracking changed files and why they matter
- requiring verification before completion claims
- capturing real product-use evidence when tests are not enough
- curating short instincts and structured solution memory separately
- keeping architecture and docs from degrading over time
- auditing whether the governance layer itself is becoming too large

### Core Workflow

- `codex-project-governance` is the main lifecycle skill.
- Non-trivial work has explicit phase gates: `brainstorming` produces a user-approved spec, `writing-plans` produces a verifiable plan, and execution waits for user approval unless the user explicitly requested plan-then-execute.
- `.codex-context/` stores recoverable project state.
- `STRATEGY.md` anchors product/project direction when adopted.
- `docs/solutions/` stores verified reusable solutions.
- `CONCEPTS.md` stores stable project vocabulary.
- `docs/improvements/backlog.md` stores Dong Skills improvement candidates; it is for skill, hook, installer, bootstrap, README, and governance improvements, not project memory.
- `.codex-context/solution-index.md` keeps the active recovery pointer compact.
- `.codex-context/worktree-state.md` records whether Codex is operating in the primary checkout, a Codex-managed worktree, a Dong-managed fallback worktree, a manual worktree, or an unknown workspace.
- Project hooks inject recovery context, check compaction readiness, track changed artifacts, and block final stopping when state is stale. Automatic PreCompact prepends an emergency notice to `handoff-summary.md`, preserves the existing handoff below it, and writes a raw snapshot as backup.
- `codex-asset-governance` audits accumulated docs, state files, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, and code assets. It uses Keep / Update / Consolidate / Replace / Delete / Stale / Raw-Prune classifications. Dry-run is default; `--apply` only prunes generated `precompact-auto-*.md` raw snapshots that exceed retention.
- `codex-review-panel` adds persona-based review.
- `codex-evidence-capture` records real behavior evidence for observable changes.
- `release-check` runs syntax, tests, privacy, and runtime-artifact checks.

### Installation

Windows PowerShell:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

When running from the target repository, omit the target path:

```powershell
.\scripts\install-windows.ps1
```

After installation, restart Codex or start a new thread. If Codex asks to trust hooks, open `/hooks` and trust the project hooks.

### Starting A New Project

After Dong Skills has been installed once, start Codex from the target repository and ask:

```text
Use codex-codebase-onboarding to start this project.
```

The onboarding skill bootstraps missing project files and then maps the repository.

When working in Codex App worktrees, Dong Skills uses detect-and-defer governance: it records the actual Git root and branch state, but leaves Codex-managed worktree cleanup to Codex App.

### Commands

From the target project:

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
node .codex/hooks/project-ops.mjs solution-status
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs solution-validate
node .codex/hooks/project-ops.mjs session-history scan --days 7 --keywords auth,token
node .codex/hooks/project-ops.mjs health-check
```

From this kit:

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/asset-governance.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/solutions.mjs "C:\path\to\repo" status
node scripts/session-history.mjs "C:\path\to\repo" scan --days 7 --keywords auth,token
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### Privacy And Safety

Do not publish private runtime data with this kit. A clean release should not include personal local paths, credentials, cookies, private headers, raw observations, logs, backups, customer data, or private project files.

Keep memory stores distinct: reusable project behavior belongs in `codex-learning-memory`, verified project solutions belong in `docs/solutions/`, current progress belongs in `.codex-context/`, and Dong Skills optimization ideas belong in `docs/improvements/backlog.md`.

Before release:

```powershell
node scripts/release-check.mjs "."
```
