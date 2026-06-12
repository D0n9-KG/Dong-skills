---
id: precompact-auto-writes-emergency-handoff
title: Let automatic PreCompact write emergency handoff instead of hard-blocking
scope: project
domain: tooling
status: active
confidence: 0.7
created: 2026-06-10
last_checked: 2026-06-12
source: user-reported-hook-behavior
---

# Let Automatic PreCompact Write Emergency Handoff Instead Of Hard-Blocking

## Trigger
When changing `PreCompact` hook behavior for automatic compaction.

## Action
Do not hard-block automatic compaction. Prepend an emergency notice to `.codex-context/handoff-summary.md`, preserve meaningful existing handoff sections below that notice, write a raw `.codex-context/raw/precompact-auto-*.md` backup, and return `continue: true`. Keep strict blocking for explicit manual compaction.

## Evidence
- 2026-06-10: User reported automatic compaction stopping without visible hook feedback.
- 2026-06-10: Regression test `PreCompact writes emergency handoff and allows automatic compaction` verifies the auto path writes recovery state and returns `continue: true`.
- 2026-06-12: Regression test `PreCompact preserves existing handoff below emergency notice` verifies the main handoff preserves useful prior content.

## Contraindications
- Manual compaction should still block stale state so the user can refresh the handoff deliberately.
