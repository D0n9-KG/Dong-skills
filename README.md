# Dong Skills

Dong Skills is a Codex-specific project-operations kit for long-running software work. It keeps project truth outside the chat window, makes context recoverable after compaction or new sessions, and turns verified work into reusable project knowledge.

Current scope: Dong Skills targets OpenAI Codex only. Claude Code compatibility would require a separate adapter for `.claude/skills`, `CLAUDE.md`, and Claude hook settings.

Dong Skills combines selected ideas from Superpowers, Matt Pocock Skills, ECC, agent-skills-for-context-engineering, Compound Engineering, Comet, Ponytail, and SkillOpt, adapted for Codex project-level skills, project-level hooks, and file-based recovery.

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

- 全局用户 skills 只保留入口能力：`codex-codebase-onboarding`、`using-superpowers` 和 `codex-skill-evolution`。
- 完整工作流 skills 安装到每个项目自己的 `.agents/skills/`。
- 项目 hooks 也只安装到项目 `.codex/hooks.json` 和 `.codex/hooks/`，不安装全局 hooks。
- 安装器只管理 `dong-skills.manifest.json` 里列出的 Dong skill 名称。
- 非 Dong 的本地 skills 会被保留；同名但无法确认是 Dong 管理的目录不会被静默覆盖或删除。

这个模型避免“某个项目没初始化 Dong Skills，但全局重型 workflow skill 仍然被隐式调用”的混乱，同时允许 Dong Skills 自身维护入口在全局可用。

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

- 安装全局入口 skills 到 `%USERPROFILE%\.agents\skills`，包括 onboarding、router 和 Dong Skills 自进化维护入口。
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

- `using-superpowers`：轻量路由，不直接替代完整流程；会先判断是否需要 `codex-wayfinder`，避免把跨 session 路线探索误压成普通 brainstorming。
- `codex-codebase-onboarding`：新项目 bootstrap 和项目地图。
- `brainstorming`：模糊、创造性、行为变化、多文件、架构、UX/API、项目方向任务先形成 living spec，再进入 approved spec。
- `writing-plans`：把 approved spec 转成可执行、可验证计划。
- `executing-plans`：按计划执行，支持传统逐项执行和显式选择后的 Codex Goal mode。
- `systematic-debugging`：遇到 bug、失败或异常时先复现和定位根因。
- `verification-before-completion` / `codex-verification-loop`：完成声明前先有证据。
- `codex-git-checkpoint`：阶段性提交/推送纪律。
- `codex-learning-memory`：短的项目 instincts；Dong Skills 优化候选进入 Dong Skills backlog 或项目 outbox。
- `codex-solution-memory`：结构化、可复用的项目解决方案。
- `codex-asset-governance` / `codex-docs-stewardship` / `codex-architecture-governance`：治理资产、文档和架构；架构治理也会检查 package/module public entry points、private internals、deep imports、barrel file 和 dependency-cruiser 这类边界；`asset-governance --apply` 只做安全自动整理，例如清理过期 PreCompact raw snapshot、归档临时 PreCompact notice。
- `codex-skill-evolution`：作为全局维护入口接入 SkillOpt-Sleep，离线把 Dong Skills backlog/outbox 中的反复失败转成可回放任务，生成 staged proposal，验证通过并经用户确认后才采纳；它操作真实 Dong Skills 源仓库，不优化业务项目代码。
- `codex-wayfinder`：用于目标明确但路线仍处于迷雾、需要跨多个 session 逐个解决 frontier 决策的问题；默认使用本地 Markdown，不依赖 issue tracker；吸收 Matt Pocock 的 prototype-as-primary-source、one-question ticket 和 frontier/fog 思路。
- `codex-agent-architecture-audit`：面向 agent/harness 自身的 wrapper、memory、tool、rendering、hidden repair 和 persistence 审查。
- `codex-loop-design-check`：检查 Goal、自动循环和 SkillOpt 流程的可判定目标、边界、重试上限、独立 judge 与人工最终判断。
- `codex-review-panel` / `codex-simplicity-review`：交付前审查和反过度工程。

### 上下文恢复

压缩后或新 session 恢复时，优先读取：

1. `.codex-context/handoff-summary.md`
2. `.codex-context/workflow-state.yaml`
3. `.codex-context/current-state.md`

随后只加载 `next_skill` 和当前 phase 所需的 `spec`、plan、Wayfinder 或 working notes。只有 Git/worktree 身份不清时才读 `worktree-state.md`；其余状态、solution、strategy 与 raw/archive 资产均按需读取，不作为默认恢复链。

`.codex-context/working-notes.md` 用于记录可外部化的探索状态：已检查事实、被排除路径、当前假设/结论、开放调查问题和下一步验证。不要把隐藏推理、完整聊天、原始日志、密钥或隐私内容写进去。

`.codex-context/workflow-state.yaml` 是机器可读的阶段索引。`workflow-state status`、hooks 和 `health-check` 会检查它与 `spec.md`、`plan-progress.md` 是否矛盾；如果出现矛盾，先修状态，不要继续实现。

状态文件在有新的持久事实或 phase 边界时更新。普通读取、诊断和每一次工具调用都不制造状态刷新债。

### 常用命令

从目标项目运行：

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
node .codex/hooks/project-ops.mjs workflow-state recover
node .codex/hooks/project-ops.mjs workflow-state status
node .codex/hooks/project-ops.mjs health-check
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs asset-governance --apply
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs skill-evolution status
node .codex/hooks/project-ops.mjs skill-evolution collect-candidates --output .codex-context/raw/skill-evolution-tasks.json
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
```

从 Dong Skills 源仓库运行：

```powershell
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/run-domain-tests.mjs
node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json --backend <executable> --backend-arg <arg>
node scripts/release-check.mjs "."
```

`skill-forward-eval.mjs` 将 prompt 与 skill 正文交给外部执行器，但不会把 required/forbidden 判定条件发送给执行器。每个 case 的原始输出先写入独立文件，再由本地 judge 检查；也可用 `--read-output-dir` 对其他执行器产生的现有输出重新判定。场景必须经过人工确认，并同时包含 train 与 held-out cases。

### 隐私与发布安全

发布包不应包含：

- 本机个人路径或私有目录结构。
- credentials、keys、cookies、headers、private query strings。
- raw observations、日志、临时文件、备份文件。
- `.skillopt-sleep/` staging、未脱敏 task drafts、原始 transcript 或 session-derived 私有内容。
- 客户资料、未脱敏 URL、私有项目代码。

发布前运行：

```powershell
node scripts/run-domain-tests.mjs
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

- Global user skills contain entry skills only: `codex-codebase-onboarding`, `using-superpowers`, and `codex-skill-evolution`.
- Full workflow skills are installed per project into `.agents/skills/`.
- Project hooks are installed per project into `.codex/hooks.json` and `.codex/hooks/`.
- The installer manages only names listed in `dong-skills.manifest.json`.
- Non-Dong local skills are preserved.
- Same-name directories that cannot be identified as Dong-managed are not silently overwritten or deleted.

This prevents uninitialized projects from accidentally invoking heavy Dong workflow skills while still allowing global Dong Skills maintenance.

### Installation

From the Dong Skills source checkout:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

When running from the target repository, omit the target path:

```powershell
.\scripts\install-windows.ps1
```

Preview the complete install plan without changing target files:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo" -Preview
```

The installer:

- installs global entry skills to `%USERPROFILE%\.agents\skills`: onboarding, the router, and Dong Skills maintenance
- writes `%USERPROFILE%\.agents\skills\.dong-skills-source.json`
- removes old global heavy Dong skills only when they are identifiable as Dong-managed
- preserves non-Dong local skills
- installs full project-level Dong Skills into the target repo `.agents/skills/`
- writes `.agents/skills/.dong-skills-project.json`
- installs `.codex-context/`, project hooks, helper scripts, runtime `.gitignore` rules, and the managed `AGENTS.md` block
- holds bounded project/global resource locks so two installers cannot write the same target concurrently
- snapshots the complete managed install surface and rolls the collection back if a later step fails
- reports add/replace/runtime/state/receipt actions in `-Preview` mode and prints `No files were written.`

After installation, restart Codex or start a new thread. If Codex asks to trust hooks, open `/hooks` and trust the project hooks.

### Starting A New Project

After Dong Skills has been installed once, start Codex from the target repository and ask:

```text
Use codex-codebase-onboarding to start this project.
```

The onboarding skill bootstraps missing project-level workflow skills, hooks, context files, and guidance, then maps the repository.

A healthy project install has `.agents/skills/.dong-skills-project.json`. Run this from the target project to check:

```powershell
node .codex/hooks/project-ops.mjs health-check
```

### Core Workflow

- `codex-project-governance` is the main lifecycle skill.
- Truth hierarchy: latest user instruction; verified behavior from code, tests, commands, product evidence, or live repo inspection; approved spec and plan; current state and handoff; older chat/raw notes/stale specs.
- Work lanes keep ceremony proportional: Lane 0 mechanical edit, Lane 1 small bounded change, Lane 2 multi-file or behavior-changing work, Lane 3 high-risk core logic/migration/security/money/permissions/release work.
- A real Lane 0 direct edit uses `work-lane-0` then `mechanical-exception`. An explicit user instruction to skip brainstorming uses `workflow-state decision spec-skipped` followed by the task-bound `spec-skipped` transition; neither shortcut silently grants broader execution approval.
- `spec.md` is a current-task intent and acceptance record, not a permanent system truth. Durable knowledge belongs in `CONCEPTS.md`, `STRATEGY.md`, `docs/solutions/`, or curated instincts.
- `context-budget` reports hot recovery path, warm on-demand path, and cold runtime/bootstrap path separately. Use the hot path as the main budget signal; the total scanned number is for maintenance awareness.
- Non-trivial work has explicit phase gates: brainstorming produces a written spec, planning produces a verifiable plan with an execution mode, and execution waits for approval.
- Reopening brainstorming/spec or restarting planning invalidates downstream plan/execution approval, verification, review, and checkpoint evidence instead of inheriting stale completion state.
- Execution approval binds to a normalized plan contract: substantive `plan-progress.md` content plus any linked detailed plan. Task checkbox state, `Current Step`, and the dedicated `Checkpoints` section remain mutable progress metadata; changing task text, scope, constraints, verification commands, or linked-plan substance still requires fresh approval.
- `.codex-context/workflow-state.yaml` stores task identity, phase, next skill, pending decision, spec/plan/execution status, verification result, review status, checkpoint status, `verification_evidence_hash`, `review_evidence_hash`, blocked-resume source, execution-debug return source, and context hash. A distinct task after completion uses `workflow-state transition new-task`; blocked work resumes from its recorded phase/skill. An unexpected execution failure uses `debugging-start` / `debugging-resolved` so compaction recovery stays in root-cause work and then returns to the same plan. `workflow-state status`, hooks, and `health-check` audit it against `spec.md` and `plan-progress.md`.
- `.codex-context/working-notes.md` stores compact externalized investigation state. It is not for hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning.
- The minimal project hook kernel contains only `SessionStart`, `PreToolUse`, `PreCompact`, and `Stop`. It is a guardrail over explicit current-project writes, not a complete shell, network, browser, or security sandbox.
- `PreToolUse` denies deterministic current-project writes when workflow approval is missing or invalid. Reads, diagnostics, network/browser tools, unknown external tools, and verified external work fail open; hooks do not infer approval or scope from natural-language wording.
- After an explicit user choice, `workflow-state decision <listed-transition>` writes canonical task/hash-bound evidence to the correct context file without advancing the workflow; the matching `workflow-state transition` consumes it. Scope, requirement, goal, acceptance, or priority changes still require assistant-led `brainstorming-start` and fresh approval; bare continuation, pure status questions, and learning-only future preferences stay non-blocking.
- Before execution approval, hooks still permit canonical governance artifacts in `.codex-context/`, `STRATEGY.md`, `docs/codex/specs/`, `docs/codex/plans/`, and `docs/codex/wayfinder/`; product-code edits remain blocked for Lane 2/3.
- `PreCompact` never rewrites handoff. It atomically overwrites one ignored, redacted `.codex-context/raw/precompact-latest.md` snapshot capped at 64 KiB.
- `Stop` is advisory-only. It never returns a blocking decision, creates continuation receipts, or forces repetitive state prose.
- Subagent scope and result quality are owned by the invoking workflow or review skill, not by always-on project hooks.
- `health-check` reports static hook configuration, root/bootstrap parity, and recent liveness for routinely expected `SessionStart` / `PreToolUse` / `Stop` events. `PreCompact` records liveness when it occurs but is not required in every session. Missing or runtime-mismatched liveness is a warning rather than proof that host trust is disabled.
- `codex-asset-governance` audits accumulated docs, state files, raw snapshots, archives, solution docs, improvement backlog, scripts, hooks, tests, generated evidence, and code assets. It separates Safe-Auto cleanup from Confirm-First assets that require human judgment.
- `codex-skill-evolution` is also installed as a global maintenance entry and integrates SkillOpt-Sleep as an offline evolution layer for Dong Skills itself. It uses backlog/outbox issues as candidates, creates reviewed replay tasks, runs SkillOpt-Sleep dry-run/run, inspects staged proposals, and adopts only after user review. It is not a hook, not project memory, and not a business-code optimizer.
- Use `codex-wayfinder` before ordinary brainstorming when the destination is known but the route is still too uncertain for a credible spec. It maps frontier decisions, defaults to one frontier decision per session, and allows bounded parallel exploration only when related tickets share one decision boundary and are reconciled into the map before stopping. Prototype work is treated as a primary source for the decision it answers, with local ticket files under `docs/codex/wayfinder/tickets/` and prototype artifacts under `docs/codex/wayfinder/prototypes/`.
- `codex-architecture-governance` adapts Matt Pocock's deep-module guidance for Codex: package-style TypeScript/JavaScript work should identify public entry points and private internals, avoid unauthorized deep imports, and avoid barrel files that hide ownership or create cycles.
- Accepted review/verification fixes may be applied within approved scope. After a real fix, explicitly return through execution/debugging and run fresh verification and review before delivery; do not reuse stale evidence.
- `verification-pass` and verification-gap transitions hash the accepted `.codex-context/verification.md`; `review-complete`/`review-skipped` require a later `Review Evidence` section and hash the reviewed document. Delivery fails if evidence is missing, reused from an earlier cycle, or modified after review closure.
- `codex-agent-architecture-audit` reviews agent wrappers, memory, tool discipline, hidden repair loops, rendering, and persistence boundaries.
- `codex-loop-design-check` reviews Goal mode, autonomous loops, and SkillOpt-style optimization for decidable goals, boundaries, retry caps, independent judges, and human final judgment.

### Commands

From the target project:

```powershell
node .codex/hooks/project-ops.mjs workflow-state next
node .codex/hooks/project-ops.mjs workflow-state recover
node .codex/hooks/project-ops.mjs workflow-state status
node .codex/hooks/project-ops.mjs health-check
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs asset-governance
node .codex/hooks/project-ops.mjs asset-governance --apply
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs skill-evolution status
node .codex/hooks/project-ops.mjs skill-evolution collect-candidates --output .codex-context/raw/skill-evolution-tasks.json
node .codex/hooks/project-ops.mjs solution-status --update-index
node .codex/hooks/project-ops.mjs state-prune --keep 8 --dry-run
```

From this kit:

```powershell
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/run-domain-tests.mjs
node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json --backend <executable> --backend-arg <arg>
node scripts/release-check.mjs "."
```

`skill-forward-eval.mjs` sends prompts and skill text to an external executor without sending required/forbidden assertions. It stores each raw case output before local judging, and `--read-output-dir` can re-judge outputs produced by another executor. Reviewed scenarios must contain both train and held-out cases.

### Privacy And Safety

Do not publish private runtime data with this kit. A clean release should not include personal local paths, credentials, cookies, private headers, raw observations, logs, backups, customer data, or private project files.

Keep memory stores distinct: reusable project behavior belongs in `codex-learning-memory`, verified project solutions belong in `docs/solutions/`, current progress belongs in `.codex-context/`, and Dong Skills optimization ideas belong in the Dong Skills repo `docs/improvements/backlog.md`. If that repo is unavailable, use `.codex-context/dong-skills-outbox.md` and migrate it later.

SkillOpt-Sleep artifacts are runtime/private by default. Keep `.skillopt-sleep/`, unsanitized task files, and transcript-derived material out of commits. Adopted SkillOpt proposals must still pass Dong Skills tests and `scripts/release-check.mjs`.

Before release:

```powershell
node scripts/run-domain-tests.mjs
node scripts/release-check.mjs "."
```

### Sources And Licenses

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- Planning, vertical-slice, expand-contract, independent-test-oracle, prototype-as-primary-source, deep-module boundary, and local-ticket/frontier ideas are adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- Compound Engineering workflow ideas are adapted from [everyinc/compound-engineering-plugin](https://github.com/everyinc/compound-engineering-plugin).
- Workflow-state ideas are adapted from [rpamis/comet](https://github.com/rpamis/comet).
- Simplicity review ideas are adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail).
- Skill self-evolution ideas and the offline sleep-cycle integration are adapted from [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt).
- License files are included under `licenses/`.
