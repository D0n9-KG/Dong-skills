# Learned Instincts

## Summary
Keep this file as a compact index. Store individual instincts under `.codex-context/instincts/`.

## Raw Observation Review
- Last reviewed raw observations: None yet.
- Review rule: convert useful events into instincts, absorb duplicates into existing docs, or record a deliberate drop.

## Active Project Instincts
- `windows-hooks-use-encoded-command`: use `-EncodedCommand` for Windows hook wrappers and verify through an outer PowerShell invocation before release.
- `precompact-auto-writes-emergency-handoff`: automatic PreCompact must preserve the main handoff with an emergency notice, keep raw backup, and allow automatic compaction instead of hard-blocking silently.

## Candidate Instincts
- None yet.

## Retired / Contradicted / Superseded
- None yet.

## Promotion Candidates
- None yet.

## Maintenance Log
- 2026-06-09: Learning status checked after governance optimization; no raw observations or candidate instincts were pending.
- 2026-06-10: Observed that `state-prune` keeps later `Commands Run` entries as newer; absorbed the rule into `codex-verification-loop` and `codex-docs-stewardship` instead of creating a separate instinct.
- 2026-06-10: Saved verified project instinct for Windows hook command quoting after `/hooks` surfaced PowerShell parser failures.
- 2026-06-10: Saved verified project instinct for automatic PreCompact fallback after user reported silent stopping without hook feedback.
- 2026-06-12: Updated PreCompact instinct wording after implementation changed from replacing handoff content to preserving it below an emergency notice.
- 2026-06-13: Reviewed brainstorming continuation feedback; routed it to Dong Skills improvement backlog instead of project instincts because it changes skill behavior, not a project-specific rule.

## 摘要
这个文件只作为紧凑索引。单条 instinct 存放在 `.codex-context/instincts/`。


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
