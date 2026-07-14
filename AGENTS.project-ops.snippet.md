# Codex Project Ops

Use Chinese by default unless the user or project requires another language. Keep commands, paths, identifiers, workflow enums, `spec`, `handoff`, `checkpoint`, and `Goal mode` in English when useful. Treat Chinese Markdown as UTF-8; on Windows prefer `pwsh`, Node UTF-8 reads, and `apply_patch` for manual edits.

## Operating Principle

Dong Skills assists the model; it must not replace model judgment or turn ordinary work into process work. Use progressive disclosure: inspect skill metadata for routing, load only the one skill needed for the current phase, and do not preload unrelated skills or repeat their bodies in project guidance.

Use the lightest process that preserves the real risk boundary. Prefer advisory guidance unless a deterministic project mutation, approval, privacy, destructive-operation, or delivery invariant requires enforcement.

Truth order: latest user instruction; fresh evidence from files, commands, tests, or product behavior; approved `spec` and plan; active state files; older notes or chat.

## Route And Approval

For non-trivial work, run `node .codex/hooks/project-ops.mjs workflow-state next` and follow its `next_skill`. Use:

- `codex-wayfinder` when the destination is known but research or prototype work is still too uncertain for a credible `spec`.
- `brainstorming` when a bounded design discussion can produce a credible written `spec`.
- `writing-plans` after scope approval and before multi-step implementation.
- `systematic-debugging` for unexpected failures; return through the recorded debug path.
- verification and review skills only at the depth justified by the change risk.

Do not implement a non-trivial behavior change until the written `spec` and execution mode are explicitly approved. A latest user instruction that changes scope is authoritative, but record it in the canonical state before continuing. Tiny mechanical work may use the documented Lane 0 exception.

Use `workflow-state decision <transition>` and `workflow-state transition <event>` for canonical approvals and phase changes. Do not hand-edit `.codex-context/workflow-state.yaml`.

## Active State

Keep the hot recovery path small and semantic. Normally recover from:

1. `.codex-context/handoff-summary.md`
2. `.codex-context/workflow-state.yaml`
3. `.codex-context/current-state.md`
4. the current `spec` / plan or active Wayfinder pointer only when needed

`handoff-summary.md` starts with the current business task and next action. `current-state.md` states one current conclusion. `working-notes.md` holds only active investigation. Move raw logs to `.codex-context/raw/` and old evidence to `.codex-context/archive/`; never store secrets, hidden reasoning, or chat transcripts.

Keep `artifact-index.md`, `verification.md`, and other state files current at meaningful phase boundaries, not after ordinary reads or every tool call.

## Minimal Hooks

The project hook kernel has four events:

- `SessionStart`: injects a short recovery pointer.
- `PreToolUse`: gates only explicit current-project writes when workflow approval is missing or invalid; reads, diagnostics, network/browser tools, unknown external tools, and verified external work fail open.
- `PreCompact`: preserves the handoff and overwrites one bounded raw recovery snapshot.
- `Stop`: advisory only; it must not create continuation loops or force repetitive state prose.

Hooks are guardrails, not a security sandbox and not a natural-language policy engine. If a hook becomes noisy, narrow or remove the trigger instead of teaching it more prompt phrases.

## Safety And Ownership

Do not overwrite non-Dong local skills, user business changes, or existing context facts. Never commit secrets, private paths, raw logs, or `.codex-context/raw/` contents.

Maintain Dong Skills only in its real source repository. Installed copies under `%USERPROFILE%\.agents\skills` and project `.agents/skills` are distribution artifacts, not source.

## Completion

Before claiming completion, run fresh verification proportional to risk and record concrete evidence or an explicit gap in `.codex-context/verification.md`. Capture product evidence for observable behavior when useful. Use independent review for meaningful or high-risk changes, then checkpoint or record why it is deferred.

For installation or release hygiene, run `node .codex/hooks/project-ops.mjs health-check`, relevant focused tests, and `git diff --check`.
