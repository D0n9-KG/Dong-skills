# Dong Skills

Dong Skills is a Codex-specific project-operations kit for long-running software work. It keeps project truth outside the chat window, makes context recoverable after compaction or new sessions, and turns verified work into reusable project knowledge.

Current scope: Dong Skills targets OpenAI Codex only. Claude Code compatibility would require a separate adapter for `.claude/skills`, `CLAUDE.md`, and Claude hook settings.

Dong Skills combines selected ideas from Superpowers, ECC, agent-skills-for-context-engineering, Compound Engineering, Comet, and Ponytail, adapted for Codex project-level skills, project-level hooks, and file-based recovery.

## 中文

### 解决什么问题

Codex 做完整项目时，风险通常不是“不会写代码”，而是：

- 需求、边界、计划、验证证据只留在聊天里。
- 自动压缩或新 session 后，关键上下文丢失。
- 讨论还没结束，已经忘了前面确认过的设计约束。
- 文件改了，但状态、文档、验证、交接没有同步。
- 项目推进久了，结构变平、文件变大、文档变脏，后续越来越难改。
- 已验证的经验没有沉淀，下次继续重复踩坑。

Dong Skills 把这些信息移到项目内的 `.codex-context/`、`docs/solutions/`、`CONCEPTS.md` 和 `STRATEGY.md`，并用项目级 skills/hooks 推动 Codex 按阶段维护。

### 安装模型

Dong Skills 使用“全局最小、项目完整”的安装模型：

- 全局用户 skills 只保留 bootstrap/router：`codex-codebase-onboarding` 和 `using-superpowers`。
- 完整工作流 skills 安装到每个项目自己的 `.agents/skills/`。
- 项目 hooks 也只安装到项目 `.codex/hooks.json` 和 `.codex/hooks/`，不安装全局 hooks。
- 安装器只管理 `dong-skills.manifest.json` 里列出的 Dong skill 名称。
- 非 Dong 的本地 skills 会被保留；同名但无法确认是 Dong 管理的目录不会被静默覆盖或删除。

这个模型避免“某个项目没初始化 Dong Skills，但全局重型 skill 仍然被隐式调用”的混乱。

### 安装

从 Dong Skills 源仓库运行：

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

如果当前目录就是目标项目：

```powershell
.\scripts\install-windows.ps1
```

安装器会：

- 安装全局 bootstrap/router skills 到 `%USERPROFILE%\.agents\skills`。
- 写入 `%USERPROFILE%\.agents\skills\.dong-skills-source.json`，让项目 bootstrap 能定位真实 Dong Skills 源仓库。
- 清理能明确识别为 Dong 旧全局安装的重型 skills。
- 保留所有非 Dong 本地 skills。
- 把完整项目级 Dong Skills 安装到目标项目 `.agents/skills/`。
- 写入 `.agents/skills/.dong-skills-project.json`。
- 创建或补齐 `.codex-context/`、`.codex/` hooks、helper scripts、`.gitignore` 运行时规则和 `AGENTS.md` managed block。

安装后重启 Codex 或从目标项目新开 thread。如果 Codex 提示 trust hooks，打开 `/hooks` 信任项目 hooks。

### 新项目启动

首次全局安装后，在目标项目打开 Codex，然后说：

```text
使用 codex-codebase-onboarding 启动这个项目。
```

`codex-codebase-onboarding` 会检查项目是否已有：

- `.agents/skills/.dong-skills-project.json`
- `.codex-context/workflow-state.yaml`
- `.codex/hooks/project-ops.mjs`
- `.codex/hooks.json`
- `AGENTS.md` managed block

缺失时，它会运行 bootstrap，安装项目级 skills/hooks/context，然后继续建立 `project-map.md` 和 `solution-index.md`。

### 核心 workflow

- `using-superpowers`：轻量路由，不直接替代完整流程。
- `codex-codebase-onboarding`：新项目 bootstrap 和项目地图。
- `brainstorming`：模糊、创造性、行为变化、多文件、架构、UX/API、项目方向任务先形成 living spec，再进入 approved spec。
- `writing-plans`：把 approved spec 转成可执行、可验证计划。
- `executing-plans`：按计划执行，支持传统逐项执行和显式选择后的 Codex Goal mode。
- `systematic-debugging`：遇到 bug、失败或异常时先复现和定位根因。
- `verification-before-completion` / `codex-verification-loop`：完成声明前先有证据。
- `codex-git-checkpoint`：阶段性提交/推送纪律。
- `codex-learning-memory`：短的项目 instincts；Dong Skills 优化候选进入 Dong Skills backlog 或项目 outbox。
- `codex-solution-memory`：结构化、可复用的项目解决方案。
- `codex-asset-governance` / `codex-docs-stewardship` / `codex-architecture-governance`：治理资产、文档和架构。
- `codex-review-panel` / `codex-simplicity-review`：交付前审查和反过度工程。

### 上下文恢复

压缩后或新 session 恢复时，优先读取：

1. `.codex-context/handoff-summary.md`
2. `.codex-context/worktree-state.md`
3. `.codex-context/workflow-state.yaml`
4. `.codex-context/current-state.md`
5. `.codex-context/project-map.md`
6. `.codex-context/spec.md`
7. `.codex-context/decisions.md`
8. `.codex-context/open-questions.md`
9. `.codex-context/working-notes.md`
10. `.codex-context/plan-progress.md`
11. `.codex-context/artifact-index.md`
12. `.codex-context/solution-index.md`
13. `.codex-context/learned-instincts.md`
14. `.codex-context/dong-skills-outbox.md`，仅当讨论 Dong Skills 改进时读取。
15. `STRATEGY.md`、`CONCEPTS.md` 或相关 `docs/solutions/`，仅当当前任务需要。

`.codex-context/working-notes.md` 用于记录可外部化的探索状态：已检查事实、被排除路径、当前假设/结论、开放调查问题和下一步验证。不要把隐藏推理、完整聊天、原始日志、密钥或隐私内容写进去。

### 常用命令

从目标项目运行：

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
node .codex/hooks/project-ops.mjs workflow-state recover
node .codex/hooks/project-ops.mjs health-check
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
```

从 Dong Skills 源仓库运行：

```powershell
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### 隐私与发布安全

发布包不应包含：

- 本机个人路径或私有目录结构。
- credentials、keys、cookies、headers、private query strings。
- raw observations、日志、临时文件、备份文件。
- 客户资料、未脱敏 URL、私有项目代码。

发布前运行：

```powershell
node scripts/release-check.mjs "."
```

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
- separating hot recovery context from warm on-demand skills and cold runtime/bootstrap maintenance

### Split Installation Model

Dong Skills uses a split model:

- Global user skills contain only `codex-codebase-onboarding` and `using-superpowers`.
- Full workflow skills are installed per project into `.agents/skills/`.
- Project hooks are installed per project into `.codex/hooks.json` and `.codex/hooks/`.
- The installer manages only names listed in `dong-skills.manifest.json`.
- Non-Dong local skills are preserved.
- Same-name directories that cannot be identified as Dong-managed are not silently overwritten or deleted.

This prevents uninitialized projects from accidentally invoking heavy global Dong workflow skills.

### Installation

From the Dong Skills source checkout:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

When running from the target repository, omit the target path:

```powershell
.\scripts\install-windows.ps1
```

The installer:

- installs global bootstrap/router skills to `%USERPROFILE%\.agents\skills`
- writes `%USERPROFILE%\.agents\skills\.dong-skills-source.json`
- removes old global heavy Dong skills only when they are identifiable as Dong-managed
- preserves non-Dong local skills
- installs full project-level Dong Skills into the target repo `.agents/skills/`
- writes `.agents/skills/.dong-skills-project.json`
- installs `.codex-context/`, project hooks, helper scripts, runtime `.gitignore` rules, and the managed `AGENTS.md` block

After installation, restart Codex or start a new thread. If Codex asks to trust hooks, open `/hooks` and trust the project hooks.

### Starting A New Project

After Dong Skills has been installed once, start Codex from the target repository and ask:

```text
Use codex-codebase-onboarding to start this project.
```

The onboarding skill bootstraps missing project-level skills, hooks, context files, and guidance, then maps the repository.

A healthy project install has `.agents/skills/.dong-skills-project.json`. Run this from the target project to check:

```powershell
node .codex/hooks/project-ops.mjs health-check
```

### Core Workflow

- `codex-project-governance` is the main lifecycle skill.
- Truth hierarchy: latest user instruction; verified behavior from code, tests, commands, product evidence, or live repo inspection; approved spec and plan; current state and handoff; older chat/raw notes/stale specs.
- Work lanes keep ceremony proportional: Lane 0 mechanical edit, Lane 1 small bounded change, Lane 2 multi-file or behavior-changing work, Lane 3 high-risk core logic/migration/security/money/permissions/release work.
- `spec.md` is a current-task intent and acceptance record, not a permanent system truth. Durable knowledge belongs in `CONCEPTS.md`, `STRATEGY.md`, `docs/solutions/`, or curated instincts.
- `context-budget` reports hot recovery path, warm on-demand path, and cold runtime/bootstrap path separately. Use the hot path as the main budget signal; the total scanned number is for maintenance awareness.
- Non-trivial work has explicit phase gates: brainstorming produces a written spec, planning produces a verifiable plan with an execution mode, and execution waits for approval.
- `.codex-context/workflow-state.yaml` stores the script-readable phase, next skill, pending decision, spec/plan/execution status, verification result, review status, checkpoint status, and context hash.
- `.codex-context/working-notes.md` stores compact externalized investigation state. It is not for hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning.
- `.codex-context/discussion-state.json` is a runtime-only dirty marker and should stay ignored by Git.
- Project hooks inject recovery context, check compaction readiness, track changed artifacts, mark discussion/exploration state dirty, and block final stopping when state is stale.
- Automatic `PreCompact` prepends an emergency notice to `handoff-summary.md`, preserves the existing handoff below it, writes a raw snapshot as backup, and allows compaction to continue.
- `codex-asset-governance` audits accumulated docs, state files, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, and code assets.

### Commands

From the target project:

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
node .codex/hooks/project-ops.mjs workflow-state recover
node .codex/hooks/project-ops.mjs health-check
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
```

From this kit:

```powershell
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### Privacy And Safety

Do not publish private runtime data with this kit. A clean release should not include personal local paths, credentials, cookies, private headers, raw observations, logs, backups, customer data, or private project files.

Keep memory stores distinct: reusable project behavior belongs in `codex-learning-memory`, verified project solutions belong in `docs/solutions/`, current progress belongs in `.codex-context/`, and Dong Skills optimization ideas belong in the Dong Skills repo `docs/improvements/backlog.md`. If that repo is unavailable, use `.codex-context/dong-skills-outbox.md` and migrate it later.

Before release:

```powershell
node scripts/release-check.mjs "."
```

### Sources And Licenses

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- Compound Engineering workflow ideas are adapted from [everyinc/compound-engineering-plugin](https://github.com/everyinc/compound-engineering-plugin).
- Workflow-state ideas are adapted from [rpamis/comet](https://github.com/rpamis/comet).
- Simplicity review ideas are adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail).
- License files are included under `licenses/`.
