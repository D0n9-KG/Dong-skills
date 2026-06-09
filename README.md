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
- **学习沉淀**：`UserPromptSubmit` hook 只捕获明确学习信号、用户纠正和长期偏好，写入短摘录、指纹和脱敏后的 raw observation。真正的 active memory 必须由 `codex-learning-memory` 决定 Save、Improve then Save、Absorb into Existing 或 Drop。
- **上下文预算**：`codex-context-budget` 用来检查 AGENTS、skills、hooks、state files 是否正在膨胀。

### 包含的 skills

| Skill | 用途 |
| --- | --- |
| `using-superpowers` | 进入项目工作时选择合适流程 skill。 |
| `brainstorming` | 在需求模糊、创意型、多文件或行为变更任务前形成可恢复 spec。 |
| `writing-plans` | 把明确需求转成可验证、可交接的执行计划。 |
| `executing-plans` | 按计划逐项执行，并维护进度和检查点。 |
| `systematic-debugging` | 遇到 bug、测试失败或异常行为时先定位根因。 |
| `verification-before-completion` | 宣称完成、修复或通过前必须有验证证据。 |
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

安装器会做四件事：

- 把 bundled skills 安装到用户的 `.agents\skills` 目录。
- 在目标项目创建或补齐 `.codex-context/` 模板。
- 安装 `.codex/hooks/project-ops.mjs` 并合并 `.codex/hooks.json`。
- 把受 marker 管理的项目说明片段合并进 `AGENTS.md`。

重跑安装器会升级已管理的 hook group 和 `AGENTS.md` marker 块，不会重复追加同一组 hooks。替换已有 marker 块时，会在目标项目旁生成一个 `.codex-project-ops.bak` 备份。

安装后，重启 Codex 或开启新 thread。如果 Codex 提示信任 hooks，打开 `/hooks` 并信任项目 hooks。

### 新项目如何启动

1. 运行安装脚本。
2. 开一个新 Codex thread。
3. 对 Codex 说：`使用 codex-project-governance 启动这个项目，先做 codebase onboarding。`
4. 让 Codex 更新 `.codex-context/project-map.md`、`current-state.md` 和 `spec.md`。
5. 需求不清时先用 `brainstorming`，不要直接实现。
6. 多步骤任务先用 `writing-plans`，再用 `executing-plans`。
7. 每次阶段结束前刷新 `verification.md` 和 `handoff-summary.md`。

### 常用命令

从目标项目运行：

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs instinct-promotion-candidates
```

从本 kit 目录运行：

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/instincts.mjs validate "C:\path\to\repo"
node scripts/instincts.mjs prune "C:\path\to\repo" --dry-run
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
- `Stop` checks state, artifacts, verification, handoff, and learning review before a session ends.
- `codex-learning-memory` turns raw observations into scoped instincts only after review.
- `codex-context-budget` audits token pressure from AGENTS, skills, hooks, and state files.

### Included Skills

| Skill | Purpose |
| --- | --- |
| `using-superpowers` | Choose the right workflow skill at the start of work. |
| `brainstorming` | Convert ambiguous or behavior-changing requests into a recoverable spec. |
| `writing-plans` | Write executable plans after requirements are clear. |
| `executing-plans` | Execute written plans task by task with checkpoints. |
| `systematic-debugging` | Find root cause before patching bugs or failures. |
| `verification-before-completion` | Require evidence before completion claims. |
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
- creates missing `.codex-context/` templates in the target project
- installs `.codex/hooks/project-ops.mjs`
- merges managed hook groups into `.codex/hooks.json`
- merges the managed project-ops marker block into `AGENTS.md`

After installation, restart Codex or start a new thread. If Codex asks to trust hooks, open `/hooks` and trust the project hooks.

### Starting A New Project

1. Install the kit into the target repository.
2. Start a fresh Codex thread.
3. Ask Codex: `Use codex-project-governance to start this project and run codebase onboarding first.`
4. Let Codex update `.codex-context/project-map.md`, `current-state.md`, and `spec.md`.
5. Use `brainstorming` when scope is unclear.
6. Use `writing-plans` before multi-step implementation.
7. Use `executing-plans` to work through the plan.
8. Refresh `verification.md` and `handoff-summary.md` before delivery, compaction, or a long pause.

### Commands

From the target project:

```powershell
node .codex/hooks/project-ops.mjs context-budget
node .codex/hooks/project-ops.mjs learning-status
node .codex/hooks/project-ops.mjs instinct-status
node .codex/hooks/project-ops.mjs instinct-validate
node .codex/hooks/project-ops.mjs instinct-prune --dry-run
node .codex/hooks/project-ops.mjs instinct-promotion-candidates
```

From this kit:

```powershell
node scripts/context-budget.mjs "C:\path\to\repo"
node scripts/instincts.mjs status "C:\path\to\repo"
node scripts/instincts.mjs validate "C:\path\to\repo"
node scripts/instincts.mjs prune "C:\path\to\repo" --dry-run
```

### Privacy And Safety

Do not publish private runtime data with this kit. A clean release should not include personal local paths, credentials, tokens, cookies, session IDs, raw observations, logs, backups, customer data, or private project files.

The learning hook stores only a short redacted excerpt, a prompt fingerprint, and metadata. Raw observations are not active memory. Active instincts are created only after review by `codex-learning-memory`.

Before release, run a secret and privacy scan such as:

```powershell
rg -n -i -uuu "C:\\\\Users|Users\\\\|AppData|session_id|ghp_|github_pat_|sk-[A-Za-z0-9_-]{10,}|bearer\s+|password|passwd|secret|token=|api[_-]?key|cookie|authorization" .
Get-ChildItem -Recurse -Force . | Where-Object { $_.Name -match '\.(bak|tmp|log)$|observations\.jsonl$|test-session' }
```

### Attribution

- Superpowers components are adapted from [obra/superpowers](https://github.com/obra/superpowers).
- ECC onboarding and continuous-learning concepts are adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC).
- Context governance ideas are adapted from [muratcankoylan/agent-skills-for-context-engineering](https://github.com/muratcankoylan/agent-skills-for-context-engineering).
- License files are included under `licenses/`.
