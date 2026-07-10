---
name: writing-plans
description: MUST use after an approved spec or clear requirements exist, before touching code for any multi-step implementation, refactor, migration, workflow, API, UX, or architecture change. Creates a verifiable written plan, updates `.codex-context/plan-progress.md`, and asks for execution approval unless the user explicitly requested plan-then-execute.
---

# Writing Plans

Create a plan that a future Codex session can execute without relying on chat memory. This is the bridge between approved intent and implementation.

## Hard Gate

Do not implement while writing the plan.

Before planning, confirm one of these is true:

- `.codex-context/spec.md` has `审批状态: Approved by user` or `Approval Status: Approved by user` for the current task.
- The current chat contains explicit approval of the written spec file or inline written spec.
- The user gave clear requirements and explicitly asked to skip brainstorming.
- The work is a tiny mechanical edit that does not need a multi-step plan.

If the task is behavior-changing or multi-file and no approved spec exists, return to `brainstorming`.

When workflow state is available, run this before drafting the plan:

```powershell
node .codex/hooks/project-ops.mjs workflow-state transition plan-start
```

## Output Location

Always update `.codex-context/plan-progress.md`.

If the plan is larger than a compact checklist, also write it to `docs/codex/plans/YYYY-MM-DD-<topic>.md` and link it from `.codex-context/plan-progress.md`.

Write user-facing plan documents in Chinese by default. Keep file paths, commands, status enum values, skill names, `Traditional task-by-task execution`, and `Codex Goal mode` unchanged when precision matters.

## Artifact Readiness And Contract Mapping

Treat the approved spec and plan as two views of one delivery contract without forcing them into one file:

- `requirements-only`: the Product Contract exists, but implementation choices, verification, or done criteria are incomplete. This artifact may be enriched, reviewed, or discussed, but must not be executed.
- `implementation-ready`: Product Contract, Planning Contract, task units, Verification Contract, and Definition of Done are complete enough to start.

Record `Artifact Readiness` in `.codex-context/plan-progress.md` or the linked detailed plan. A plan becomes `implementation-ready` only when it has zero launch-blocking open questions.

Keep the mapping explicit:

- **Product Contract:** approved behavior, actors, boundaries, acceptance examples, non-goals, and stable requirement IDs from `spec.md`.
- **Planning Contract:** technical decisions, assumptions, dependencies, sequencing, rollout, and rollback.
- **Verification Contract:** repository-specific commands and product evidence that prove each requirement.
- **Definition of Done:** global completion criteria plus per-task completion criteria.

Planning enriches the approved Product Contract; it does not silently rewrite product scope. If planning discovers a substantive product conflict, return to `brainstorming` and user approval.

## Scope Check

Before writing tasks, check whether the approved spec covers multiple independent subsystems or loosely related goals. If it does, split it into separate plans or stop and ask the user to choose the first slice. A plan should produce working, testable software on its own.

Do not hide decomposition problems inside a long checklist. If the plan depends on unapproved architecture, data model, UX, or API decisions, return to `brainstorming`.

## Work Class / Risk Lane

Record one lane before task breakdown:

- `Lane 0`: tiny mechanical edit. No full plan unless the user asks; record the acceptance criterion and verify the edit.
- `Lane 1`: small bounded change. Use a compact checklist, one approval point, targeted verification, and a lightweight checkpoint decision.
- `Lane 2`: multi-file or behavior-changing work. Use approved spec, acceptance mapping, test discovery, verification, review when meaningful, and checkpointing.
- `Lane 3`: high-risk core logic, migration, security, money, permissions, release, or production-sensitive work. Use characterization/test-first work, stronger evidence, review, rollback notes, and checkpointing.

The lane controls plan depth, test depth, state update cadence, and checkpoint cadence. Use the lowest lane that still protects the user.

## File Structure

Before defining tasks, map files and responsibilities:

- Files to create, modify, test, document, and explicitly leave alone.
- Ownership boundaries and interfaces between modules.
- Existing patterns to follow.
- Any large-file or flat-directory risk that should be addressed in the plan.

Prefer focused files with clear responsibilities. In an existing codebase, do not restructure unrelated areas just because the upstream Superpowers plan style prefers smaller files; include a split only when it reduces real risk for the approved change.

## Test-First Default

For bug fixes, behavior changes, API changes, migrations, and user-visible workflow changes, the plan defaults to test-first or characterization-first work:

- First capture the current failing behavior or current contract with a unit/e2e/CLI/API test when practical.
- If a failing automated test is impractical, write the exact manual reproduction and the verification gap.
- Do not plan implementation-only behavior changes without either test coverage or a recorded reason.
- Expected values must come from an independent source of truth such as a literal worked example, the approved spec, an external standard, or known-good product behavior. Do not recompute the expected value with the same logic the implementation uses.

## Task Slicing

Default to vertical slices: each task should make one end-to-end user-visible behavior work and leave the project in a verifiable state. Do not split ordinary feature work into horizontal layers such as "all models", then "all services", then "all tests".

- Each task declares its blocking edges: the earlier tasks, decisions, migrations, or external inputs that must be complete before it can start.
- Prefer a tracer bullet that crosses the real interface, persistence, and delivery path over broad scaffolding with no observable outcome.
- Keep test-first execution inside each slice: one failing behavior, the minimal implementation, then verification before the next slice.

Wide mechanical refactors are the exception. When one symbol, schema, or shared type has a blast radius too large for any vertical slice to stay green, use expand-contract: add the new form beside the old, migrate callers in bounded batches, then remove the old form only after every caller has moved. If batches cannot be independently green, make that integration constraint explicit and add a final integrate-and-verify task.

## Simplicity Gate

Before choosing an implementation path, run this gate and record the result in the plan's `Runtime Constraints`, `Execution Note`, or task notes:

1. **Can this be avoided?** If the approved outcome can be reached by deleting, configuring, documenting, or doing nothing, plan that instead of new code.
2. **Does this already exist in the codebase?** Reuse an existing helper, type, workflow, validator, or established pattern instead of creating a parallel implementation.
3. **Does the standard library already do it?** Prefer language/runtime standard library behavior over custom code.
4. **Does the native platform already do it?** Prefer browser, OS, database, framework, shell, or built-in service features over dependencies or custom abstractions.

The gate is a constraint, not a research project. If a higher rung clearly works, use it and move on. Do not add the Ponytail one-line/minimum-implementation rungs to the mandatory Dong Skills gate unless the user explicitly asks for them.

## Plan Requirements

1. Re-read the approved spec or clear requirements.
2. Map files to inspect, create, modify, and leave alone.
3. Identify module boundaries and decomposition before tasks.
4. Apply the Simplicity Gate: avoid building, standard library, native platform.
5. Record `Work Class / Risk Lane` and why that lane is sufficient.
6. Map every acceptance criterion to at least one task and one verification step. Prefer executable proof: unit/e2e/CLI/API command, product evidence, screenshot, rendered artifact, or explicit manual verification.
7. Break work into bite-sized tasks. Prefer 2-5 minute steps for Lane 2/3 risky code changes: write/adjust test, run expected failure, implement minimal change, run expected pass, update docs/state, checkpoint.
8. Include exact commands and expected success signals where known.
9. For every feature-bearing task, include every applicable scenario category: happy path, edge cases, error paths, and integration. Add regression and non-goal preservation scenarios where relevant; do not pad leaf-node changes with artificial categories.
10. Include an `Execution Mode` section with two choices: `Traditional task-by-task execution` and `Codex Goal mode`.
11. Include a `Loop Review` section. Traditional mode records `not-required`; Goal mode remains `pending` until `codex-loop-design-check` approves the machine-decidable goal, boundaries, retry cap, independent judge, and human stop points.
12. Include a `Goal Mode Objective Draft` even when Goal mode is not selected yet. It must be safe to copy into Codex Goal mode only after explicit user selection.
13. State that Codex Goal mode requires a real goal mechanism in the current Codex session, such as available `create_goal` and `update_goal` tools. If that mechanism is absent, Goal mode is not selectable.
14. Include `Runtime Constraints` and `Checkpoint Cadence` so long-running execution cannot drift away from the spec.
15. Include an `Execution Note` for implementers: files that must be read first, constraints that must not be violated, test commands to prefer, rollback notes, and the Simplicity Gate decision.
16. Record risks, assumptions, rollback notes, and open questions.
17. Update `.codex-context/artifact-index.md` with files that matter.
18. Review the plan for gaps before offering execution.
19. When the plan is ready but execution is not yet approved, run `node .codex/hooks/project-ops.mjs workflow-state transition plan-ready`.

## Plan Header

```markdown
# [功能] 实施计划

**目标:** [一句话。]
**规格:** [已批准规格路径或 inline requirement。]
**规格审批:** [Approved by user / skipped by user / mechanical exception。]
**Artifact Readiness:** requirements-only / implementation-ready。
**工作类别 / 风险等级:** Lane 0 / Lane 1 / Lane 2 / Lane 3，并说明理由。
**执行模式:** 等待用户选择。
**当前步骤:** 尚未开始。
**验证:** [证明成功的命令或检查。]
**执行审批:** 等待用户选择和执行模式。
```

Include these sections in the plan when the work is not tiny:

```markdown
## 执行模式
- 等待用户选择。
- 选项 A：Traditional task-by-task execution。
- 选项 B：Codex Goal mode。
- 不要从模糊的“继续”、“执行”或 plan-then-execute 推断为 Codex Goal mode。

## Goal 模式目标草案
仅在用户明确选择 Codex Goal mode 后使用。
- 当前 session 可用的 goal 机制:
- 目标:
- 规格路径:
- 计划路径:
- 已批准范围:
- 非目标:
- 当前步骤:
- 验证命令:
- 存档节奏:
- 必须更新的状态文件:
- 停止条件:

Goal mode is unavailable if the current Codex session does not expose an actual goal mechanism. Do not treat this draft as permission to simulate Goal mode manually.

## Loop Review
- 当前状态: pending / not-required / Approved after codex-loop-design-check。
- Traditional task-by-task execution: record `not-required`.
- Codex Goal mode: run `codex-loop-design-check`, update this section with the approved goal/boundaries/judge/retry outcome, then run `workflow-state transition loop-review-approved`.

## 运行约束
- 除非阻塞项要求重新规划，否则按已批准计划顺序执行。
- 保持 `.codex-context/plan-progress.md`、`artifact-index.md`、`verification.md`、`current-state.md` 和 `handoff-summary.md` 更新。
- 遇到需求模糊、验证循环失败、范围变化、破坏性操作、缺少凭据、缺少用户决策或架构冲突时停止。
- 不要静默扩大已批准规格之外的范围。
- 添加代码、依赖、抽象、脚本、文档或状态文件前应用 Simplicity Gate：can avoid building；standard library；native platform。
- 在里程碑重读 spec 和 plan，对照验收标准检查进度。

## 存档节奏
- 每个有意义且已验证的任务或里程碑后做 checkpoint。
- 如果暂缓 checkpoint，在 `handoff-summary.md` 记录原因和下次 checkpoint。

## 验收映射
- [标准] -> 任务 N -> 验证命令 / 动作。

## 测试场景
- Happy path:
- Regression path:
- Error/edge path:
- Non-goal preservation:

## 执行备注
- 优先读取:
- 不要触碰:
- Simplicity Gate:
- Test-first / characterization-first 要求:
- 优先验证:
- 回滚:
```

## Task Shape

Use checkbox tasks so progress survives compaction:

```markdown
## 任务

- [ ] Task 1: [specific outcome]
  - Files: `path/to/file`
  - Steps: [small concrete actions, preferably test -> expected fail -> implementation -> expected pass]
  - Verify: `[command]` or [manual check]
  - Checkpoint: commit/checkpoint after verification, or record why deferred
  - Evidence: [fill in after running]
```

## No Placeholder Plans

Do not leave vague plan items such as:

- "Handle edge cases"
- "Add tests"
- "Implement validation"
- "Clean up later"
- "Similar to previous task"
- `TODO`, `TBD`, or missing file paths

Replace them with concrete checks, files, commands, or a recorded blocker.

## Self-Review

Before offering execution:

- Every acceptance criterion maps to at least one task.
- Artifact Readiness is `implementation-ready`, with zero launch-blocking open questions.
- Product Contract, Planning Contract, Verification Contract, and Definition of Done are present or explicitly mapped to their source sections.
- Every behavior-changing task has test-first/characterization-first coverage or a recorded reason.
- The plan includes `Test Scenarios` and `Execution Note` when the work is not tiny.
- No placeholders remain.
- File paths are concrete enough to start.
- Verification is realistic for the local project.
- Risks and open questions are captured in `.codex-context/risks.md` and `.codex-context/open-questions.md`.
- `.codex-context/plan-progress.md` names exactly one `Current Step`.
- `.codex-context/plan-progress.md` records `Execution Mode`, `Goal Mode Objective`, `Runtime Constraints`, and `Checkpoint Cadence`.
- Goal mode plans record an approved `Loop Review`; Traditional mode records `not-required`.
- The Simplicity Gate result is recorded for any new code, dependency, abstraction, script, doc, or state asset.
- Codex Goal mode is presented as an explicit user choice, not the default.

## Execution Handoff

After saving the plan, ask for execution approval unless the user already explicitly said to plan and then execute without waiting.

Use this shape:

```text
Plan written to <path>.

Execution choices:
1. Execute now with `executing-plans` in Traditional task-by-task execution mode.
2. Execute now with `executing-plans` in Codex Goal mode.
3. Revise the plan first.
4. Pause here.

Which do you want?
```

Only proceed to `executing-plans` after user approval or an explicit earlier instruction to plan-then-execute. If the user previously asked to plan-then-execute but did not explicitly choose Codex Goal mode, record `Execution Mode: Traditional task-by-task execution`.

After the user chooses execution mode, update workflow state before executing:

- Traditional task-by-task execution: `node .codex/hooks/project-ops.mjs workflow-state transition execution-approved-traditional`
- Codex Goal mode: `node .codex/hooks/project-ops.mjs workflow-state transition execution-approved-goal`
