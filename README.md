# Dong Skills

Dong Skills is a Codex project-operations skill kit for long-running software work.

It combines a curated subset of [Superpowers](https://github.com/obra/superpowers), learning and onboarding ideas adapted from [ECC](https://github.com/affaan-m/ECC), and context-governance patterns inspired by [agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering). The goal is simple: keep Codex aligned with the project, preserve important context across compaction or new sessions, and turn verified work experience into useful project memory instead of messy notes.

## 中文

### 这个项目解决什么

Codex 做完整项目时，真正难点通常不是单次写代码，而是这些问题：

- 多轮对话后，目标、边界、计划、验证证据逐渐散在聊天记录里。
- 自动压缩或新 session 后，重要上下文丢失，Codex 需要重新猜。
- 需求没澄清就开始改，越做越偏。
- 修改了文件但没有同步状态，交接时不知道哪些文件为什么变了。
- 用户纠正、项目约定、验证过的经验没有沉淀，下一次又踩同样的坑。

Dong Skills 把这些信息移出聊天窗口，放进项目内的 `.codex-context/` 文件，并用 skills 与 Codex hooks 推动 Codex 按阶段更新它们。

### 核心机制

- **主流程治理**：`codex-project-governance` 负责发现、澄清、计划、执行、调试、验证、评审、学习、交接。
- **上下文恢复**：`SessionStart` 和 `PostCompact` hooks 会提示 Codex 按固定顺序恢复记忆。
- **压缩前检查**：`PreCompact` hook 会检查 handoff、核心状态文件和学习评审是否新鲜。它可以尝试阻断压缩，但不能保证在所有极限上下文场景中完全阻止 Codex 自动压缩。
- **文件变更追踪**：`PostToolUse` hook 会在非上下文文件变化后要求刷新 `artifact-index.md`。
- **完成前闸门**：`Stop` hook 会要求状态、产物索引、验证记录、交接摘要和学习评审保持最新。
- **Git 存档纪律**：`PreCompact` 和 `Stop` 会检查未提交变更、未推送提交和 Git Checkpoint 记录，提醒 Codex 使用 `codex-git-checkpoint` 提交/推送，或写明为什么暂不提交。
- **学习沉淀**：`UserPromptSubmit` hook 只捕获明确学习信号、用户纠正和长期偏好，写入短摘录、指纹和脱敏后的 raw observation。真正的 active memory 必须由 `codex-learning-memory` 决定 Save、Improve then Save、Absorb into Existing 或 Drop。
- **上下文预算**：`codex-context-budget` 用来检查 AGENTS、skills、hooks、state files 是否正在膨胀。
- **运行时隐私保护**：安装和 bootstrap 会确保 `.codex-context/raw/` 被 `.gitignore` 忽略，只保留 `.gitkeep` 可追踪。
- **健康检查与发布检查**：`health-check` 审计项目安装状态，`release-check` 跑语法、测试、隐私和运行时产物检查。

### 包含的 skills

| Skill | 用途 |
| --- | --- |
| `using-superpowers` | 进入项目工作时选择合适流程 skill。 |
| `brainstorming` | 在需求模糊、创意型、多文件或行为变更任务前形成可恢复 spec。 |
| `writing-plans` | 把明确需求转成可验证、可交接的执行计划。 |
| `executing-plans` | 按计划逐项执行，并维护进度和检查点。 |
| `systematic-debugging` | 遇到 bug、测试失败或异常行为时先定位根因。 |
| `verification-before-completion` | 宣称完成、修复或通过前必须有验证证据。 |
| `codex-git-checkpoint` | 在阶段边界、长暂停、压缩、交付或 GitHub 存档前检查 diff、提交信息、commit 和 push 纪律。 |
| `requesting-code-review` | 对实际 diff、spec、plan 和验证证据做聚焦评审。 |
| `receiving-code-review` | 处理 review 反馈时先判断有效性和风险。 |
| `codex-codebase-onboarding` | 新项目启动时建立项目地图、命令、入口、约定和未知项。 |
| `codex-learning-memory` | 把用户纠正、验证过的项目经验和复用规则沉淀成 instincts。 |
| `codex-project-governance` | 非平凡项目工作的主循环。 |
| `codex-verification-loop` | 选择并记录 build、typecheck、lint、test、security、diff 等验证。 |
| `codex-context-budget` | 审查上下文成本和治理文件膨胀。 |

### 安装到一个项目

Windows PowerShell:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

如果已经在目标项目目录里运行，可以省略 `-TargetProjectRoot`：

```powershell
.\scripts\install-windows.ps1
```

安装器会做这些事：

- 把 bundled skills 安装到用户的 `.agents\skills` 目录。
- 在目标项目创建或补齐 `.codex-context/` 模板，并给已有模板补缺失章节。
- 安装 `.codex/hooks/project-ops.mjs` 并合并 `.codex/hooks.json`。
- 合并 `.gitignore` 运行时保护规则，避免误提交 `.codex-context/raw/observations.jsonl`。
- 把受 marker 管理的项目说明片段合并进 `AGENTS.md`。

重跑安装器会升级已管理的 hook group 和 `AGENTS.md` marker 块，不会重复追加同一组 hooks。替换已有 marker 块时，会在目标项目旁生成一个 `.codex-project-ops.bak` 备份。

安装后，重启 Codex 或开启新 thread。如果 Codex 提示信任 hooks，打开 `/hooks` 并信任项目 hooks。

Dong Skills 使用项目级 hooks，不安装全局 hooks。这样每个项目可以独立选择是否启用治理规则。

### 新项目如何启动

首次安装 Dong Skills 后，后续新项目不需要手动运行安装脚本。进入目标项目，开一个 Codex thread，然后说：

```text
使用 codex-codebase-onboarding 启动这个项目。
```

`codex-codebase-onboarding` 会先检查项目是否已有 Dong Skills 配置；如果没有，会运行它自带的 bootstrap 脚本，写入 `.codex-context/`、`.codex/hooks/`、`.codex/hooks.json` 和 `AGENTS.md` marker block，然后继续建立 `project-map.md`。

如果刚刚 bootstrap 了项目级 hooks，重启 Codex 或从该项目重新开一个 thread，再用 `/hooks` 信任项目 hooks。

### 常用命令

从目标项目运行：

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs instinct-promotion-candidates
node .codex/hooks/project-ops.mjs health-check
```

从本 kit 目录运行：

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/instincts.mjs validate "C:\path\to\repo"
node scripts/instincts.mjs prune "C:\path\to\repo" --dry-run
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### 隐私与发布安全

发布包不应包含：

- 个人用户名、本机绝对路径、私有目录结构。
- API keys、tokens、cookies、session IDs、authorization headers。
- raw chat、raw observations、测试 session、临时日志、备份文件。
- 项目私有代码、客户资料或未脱敏 URL query。

本 kit 的学习 hook 只保存短摘录、prompt fingerprint 和脱敏标记。`.codex-context/raw/` 是运行时目录，发布时应保持为空，不应带出 `observations.jsonl`。

建议每次发布前运行：

```powershell
node scripts/release-check.mjs "."
rg -n -i -uuu "C:\\\\Users|Users\\\\|AppData|session_id|ghp_|github_pat_|sk-[A-Za-z0-9_-]{10,}|bearer\s+|password|passwd|secret|token=|api[_-]?key|cookie|authorization" .
Get-ChildItem -Recurse -Force . | Where-Object { $_.Name -match '\.(bak|tmp|log)$|observations\.jsonl$|test-session' }
```

### 来源与归因

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- License files are included under `licenses/`.

## English

### What This Project Is For

Dong Skills is designed for full Codex project work, not one-off prompting. It keeps durable project truth in files that Codex can re-read after compaction, thread restarts, or long pauses.

It helps with:

- preventing drift before implementation starts
- preserving handoff state across context compaction
- tracking changed files and why they matter
- requiring verification before completion claims
- curating reusable learning from user corrections and verified work
- auditing whether the governance layer itself is becoming too large

### Core Workflow

- `codex-project-governance` is the main lifecycle skill.
- `.codex-context/` stores recoverable project state.
- `SessionStart` and `PostCompact` hooks inject the recovery order.
- `PreCompact` checks whether handoff, state, and learning review are ready before compaction. It can request blocking, but it should not be treated as an absolute guarantee against every automatic compaction case.
- `PostToolUse` asks Codex to refresh `artifact-index.md` after non-context file changes.
- `Stop` checks state, artifacts, verification, Git checkpoint notes, handoff, and learning review before a session ends.
- `PreCompact` and `Stop` remind Codex to use `codex-git-checkpoint` when work has uncommitted changes, unpushed commits, or missing checkpoint notes.
- `codex-learning-memory` turns raw observations into scoped instincts only after review.
- `codex-context-budget` audits token pressure from AGENTS, skills, hooks, and state files.
- installers and bootstraps add `.gitignore` rules so `.codex-context/raw/` runtime data is not committed accidentally.
- `health-check` audits project installation state, and `release-check` runs syntax, test, privacy, and runtime-artifact checks.

### Included Skills

| Skill | Purpose |
| --- | --- |
| `using-superpowers` | Choose the right workflow skill at the start of work. |
| `brainstorming` | Convert ambiguous or behavior-changing requests into a recoverable spec. |
| `writing-plans` | Write executable plans after requirements are clear. |
| `executing-plans` | Execute written plans task by task with checkpoints. |
| `systematic-debugging` | Find root cause before patching bugs or failures. |
| `verification-before-completion` | Require evidence before completion claims. |
| `codex-git-checkpoint` | Enforce diff review, commit-message quality, checkpoint commit, and optional GitHub push discipline before pauses, compaction, delivery, or archive. |
| `requesting-code-review` | Review actual diffs against spec, plan, and verification. |
| `receiving-code-review` | Evaluate review feedback before applying it. |
| `codex-codebase-onboarding` | Map a new repo's architecture, commands, entry points, tests, and conventions. |
| `codex-learning-memory` | Curate project instincts from corrections, repeated discoveries, and verified outcomes. |
| `codex-project-governance` | Orchestrate the full project lifecycle. |
| `codex-verification-loop` | Select and record build, typecheck, lint, test, security, and diff checks. |
| `codex-context-budget` | Audit context cost and bloat. |

### Installation

Windows PowerShell:

```powershell
.\scripts\install-windows.ps1 -TargetProjectRoot "C:\path\to\repo"
```

When running from the target repository, omit the target path:

```powershell
.\scripts\install-windows.ps1
```

The installer:

- copies bundled skills into the user's `.agents\skills` directory
- creates missing `.codex-context/` templates in the target project and patches missing template sections during upgrades
- installs `.codex/hooks/project-ops.mjs`
- merges managed hook groups into `.codex/hooks.json`
- merges `.gitignore` runtime protections for `.codex-context/raw/`
- merges the managed project-ops marker block into `AGENTS.md`

After installation, restart Codex or start a new thread. If Codex asks to trust hooks, open `/hooks` and trust the project hooks.

Dong Skills uses project-level hooks only. It does not install global hooks, so each repository can opt into project governance independently.

### Starting A New Project

After Dong Skills has been installed once, a new project does not need a manual installer run. Start Codex from the target repository and ask:

```text
Use codex-codebase-onboarding to start this project.
```

`codex-codebase-onboarding` checks whether Dong Skills project configuration exists. If it is missing, the skill runs its bundled bootstrap script to install `.codex-context/`, `.codex/hooks/`, `.codex/hooks.json`, and the managed `AGENTS.md` block, then continues onboarding and updates `project-map.md`.

After a fresh bootstrap, restart Codex or open a new thread from that repository, then use `/hooks` to trust the project hooks.

### Commands

From the target project:

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs instinct-promotion-candidates
node .codex/hooks/project-ops.mjs health-check
```

From this kit:

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/instincts.mjs validate "C:\path\to\repo"
node scripts/instincts.mjs prune "C:\path\to\repo" --dry-run
node scripts/project-ops-health.mjs "C:\path\to\repo"
node scripts/release-check.mjs "."
```

### Privacy And Safety

Do not publish private runtime data with this kit. A clean release should not include personal local paths, credentials, tokens, cookies, session IDs, raw observations, logs, backups, customer data, or private project files.

The learning hook stores only a short redacted excerpt, a prompt fingerprint, and metadata. Raw observations are not active memory. Active instincts are created only after review by `codex-learning-memory`.

Before release, run a secret and privacy scan such as:

```powershell
node scripts/release-check.mjs "."
rg -n -i -uuu "C:\\\\Users|Users\\\\|AppData|session_id|ghp_|github_pat_|sk-[A-Za-z0-9_-]{10,}|bearer\s+|password|passwd|secret|token=|api[_-]?key|cookie|authorization" .
Get-ChildItem -Recurse -Force . | Where-Object { $_.Name -match '\.(bak|tmp|log)$|observations\.jsonl$|test-session' }
```

### Attribution

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- License files are included under `licenses/`.
