# Risks

## Context Risks
- If existing projects are not re-bootstrapped or refreshed through `codex-codebase-onboarding`, their project-local AGENTS/state templates may not show the new phase gates even though global skills are updated.
- Skill gates rely on Codex using the relevant skills; broad pre-edit enforcement is intentionally not added, so clear user prompting and project `AGENTS.md` still matter.
- Hooks discovered after a fresh bootstrap may not appear in the current Codex thread until Codex is restarted or a new thread is opened from the project.
- Git checkpoint reminders can become noisy if every unfinished diff is treated as commit-ready; the design allows documenting a deferred checkpoint in handoff.
- Session recovery is section-aware, but very large individual handoff sections can still be clipped; keep handoff sections concise.
- `.codex-context/archive/` must stay on-demand; do not add it to recovery order.
- Full `docs/solutions/` bodies and session histories must stay on-demand; active recovery should use `solution-index.md` and targeted reads.
- Automatic recovery now injects a compact `solution-index.md` excerpt; keep that file short enough to remain useful after compaction.
- Automatic PreCompact emergency handoff is a fallback, not a substitute for deliberate phase-boundary handoffs; after recovery, state files still need review.
- Asset governance can become noisy if thresholds are too low; only severe active state bloat and unsafe tracked raw/runtime artifacts should block hooks.
- Raw snapshot pruning is intentionally narrow; `observations.jsonl` remains governed by learning review, not generic raw cleanup.
- Dong Skills improvement outbox entries can become stale if the real source repo remains unavailable; migrate them after source discovery works.
- Living Spec mode is a skill instruction rather than a technical lock; sessions that skip or fail to load `brainstorming` can still drift.
- Written-spec approval and execution-mode approval are skill/state gates rather than universal technical locks; sessions that skip the curated skills can still violate the intended flow.
- Codex Goal mode is powerful for full-plan execution but can amplify drift if the Goal objective omits approved scope, non-goals, checkpoint cadence, state update requirements, or stop conditions.
- Topic-based learning dedupe is heuristic; real usage may show topics that need splitting or merging.
- Shell/Bash/PowerShell-style Codex tool writes now trigger `PostToolUse`; file changes made by external processes outside Codex hook visibility can still bypass the immediate block. Stop and PreCompact still catch stale state before stopping or compacting.
- Workflow-state routing improves recovery, but it still depends on agents using `using-superpowers` or project governance before substantive work.
- Simplicity Gate is a skill/process constraint, not a technical lock; sessions that ignore `writing-plans`, `executing-plans`, or `codex-review-panel` can still overbuild.
- `dong-debt:` markers can rot if milestone reviews skip `codex-simplicity-review` or asset-governance output.
- `working-notes.md` can become noisy if agents write every thought instead of compact externalized findings; phase-boundary promotion/pruning remains required.
- `discussion-state.json` is only a freshness marker. If the agent ignores the Stop/PreCompact prompt and does not update state, the marker alone is not durable project memory.

## Technical Risks
- Installer/bootstrap now use collection-level snapshots and bounded locks. Residual risk: snapshotting `.codex` and `.codex-context` can use noticeable temporary disk space in unusually large projects.
- Process termination and ordinary late failures release file locks and are covered by rollback tests; forced power loss during the restore operation itself is not simulated.
- Cross-volume temporary backup copy behavior is not stress-tested. Managed skill staging remains inside its destination root, while collection backups use the system temp directory.
- `project-ops-health.mjs` loads the workflow runtime parser/schema dynamically. Future runtime relocation must preserve one of the documented source/installed resolution paths.
- Domain sharding reduces the full suite from roughly 125 seconds to about 61 seconds on this machine. The bootstrap-runtime shard remains the longest path and should be split only when tests gain clearer independent fixtures.
- The lightweight gate design reduces drift but does not make unapproved edits technically impossible in every harness; future hook telemetry or pre-tool checks may be considered if drift persists.
- Project-level hook trust is still per repository; users may need to approve hooks through `/hooks`.
- `PreCompact` manual blocking is still useful, but automatic compaction is allowed after emergency handoff because blocking under context pressure can stall without reliable visible feedback.
- Existing repositories with stale `.codex/hooks.json` may still show `hook exited with code 1` until `codex-codebase-onboarding` reruns bootstrap or the project hooks file is replaced.
- Existing repositories with the older PreCompact runtime may still hard-block automatic compaction until onboarding/bootstrap updates `.codex/hooks/project-ops.mjs` and `.codex/scripts/lib/events.mjs`.
- Existing repositories with the older PostCompact runtime may show `invalid PostCompact hook JSON output` until `.codex/scripts/lib/events.mjs` is refreshed.
- Event-specific hook output fields are not portable across all hook events; future hook changes should prefer common fields unless the official docs explicitly list event-specific support.
- Windows hook commands must continue to be tested through an outer PowerShell invocation; direct `node .codex/hooks/project-ops.mjs` tests do not cover the quoting failure shown in Codex `/hooks`.
- Hook Git status checks must not require a GitHub remote for non-GitHub or local-only repositories.
- Installer/bootstrap now copy split hook libraries; asset parity must stay fresh.
- Bootstrap asset parity drift is now release-blocking through `project-ops-health.mjs`; future helper/script changes must sync root and asset copies together.
- Scan scripts are heuristic only and must not drive automatic refactors without review.
- `solutions.mjs` validates a compact frontmatter contract, not semantic truth; stale or misleading solution docs still require human/agent review against current code.
- `session-history.mjs` searches local agent history metadata and keyword counts only; it does not guarantee complete recovery of prior work.
- `asset-governance.mjs` is a lifecycle signal source, not semantic proof that every doc is correct.
- The generated Dong Skills source marker can become stale if the source checkout moves; reinstall or set `DONG_SKILLS_REPO` / `DONG_SKILLS_HOME`.
- Existing projects need a runtime refresh before they get the improved Stop diagnostics, grouped learning status, and new state-prune behavior.
- Text readability scanning is heuristic. It may need narrow allow comments for legitimate rare Unicode sequences, but disabling the scan would re-open the mojibake publication risk.
- Release phone-number scanning is intentionally conservative to avoid treating verification timestamps as PII; token, key, local-path, email, and learning-memory redaction checks remain stricter.
- No dedicated hook currently enforces Goal mode cadence at runtime; the first safeguard is the written Goal objective plus Stop/PreCompact/state checks.
- Existing projects with older hook runtimes may still hit deleted-file freshness false positives until their `.codex/scripts/lib/core.mjs` is updated.
- Existing projects with older `project-ops.mjs` may still fail `session-history <root> ...` until hooks are refreshed.
- Hook status output must stay lightweight on PostToolUse. Reintroducing full asset-governance or checkpoint scans there would slow every edit.
- `dong-debt:` scanning is heuristic and intentionally skips docs/tests to avoid counting examples; real simplification debt should be marked in active code comments.
- If a future release wants Claude Code support, it should be a deliberate adapter layer, not a partial rename of the Codex-specific layout.
- Transition event names are now part of the internal workflow contract; future changes should preserve compatibility or include migration guidance for existing projects.
- PostToolUse exploration detection is heuristic. It now covers read/search/web/browser/codegraph and common shell inspection commands, but unusual MCP tools or custom shell scripts may still need matcher updates.
- Wider PostToolUse matching can create extra working-notes refresh prompts during heavy exploration. If this becomes noisy, narrow with evidence-backed tests rather than disabling the guard.
- Real Codex UI hook display behavior can differ from CLI simulation; after refreshing an old project, verify `/hooks` status and a small Stop/PreCompact path in that project.

## Architecture Risks
- Adding governance skills can bloat routing docs if their long rules stay in always-read files; keep details in skill-specific references.
- Split hook modules reduce file concentration but add asset-sync risk.
- State archive can grow over time; budget excludes it, so docs stewardship should review archive size separately.
- PreCompact raw snapshots can grow over time; asset governance should prune old generated snapshots by count or age.
- Adding CE-inspired skills increases the global skill set; routing docs must stay concise and skill details should remain on demand.
- Adding `codex-simplicity-review` increases the curated skill set; router docs must keep it focused so it does not become another broad review ritual.

## Documentation Risks
- README, skill docs, AGENTS snippets, and bootstrap templates now all describe phase gates; future changes must keep these aligned or agents may receive conflicting workflow instructions.
- README, AGENTS snippets, workflow skills, `workflow-state.yaml`, and `workflow-state.mjs` must stay aligned when phases or transition names change.
- README now declares Codex-only scope; future Claude adapter documentation must not imply the existing `.codex`/`.agents` layout is Claude-native.
- README, AGENTS snippet, project-map, and skill routing can diverge after future changes.
- README, AGENTS snippets, workflow skills, review-panel guidance, and asset-governance docs must stay aligned on the four Simplicity Gate rungs.
- Generated context archives may preserve outdated command evidence; keep main `verification.md` current.
- `docs/solutions/` can accumulate overlapping or stale entries unless `codex-solution-memory` refresh/consolidation is used.

## Safety / Destructive Risks
- Installer and bootstrap modify `AGENTS.md`; marker replacement creates a backup when replacing an existing managed block.
- Installer and bootstrap modify `.gitignore` to protect `.codex-context/raw/`; incomplete managed marker blocks intentionally stop installation.
- Release scans must exclude `.git` and verify no raw observations, logs, backups, local paths, or secrets are published.
- Checkpoint commits must not stage unrelated user changes, secrets, raw observations, logs, backups, or local private paths.
- Do not commit generated `%USERPROFILE%\.agents\skills\.dong-skills-source.json`; it intentionally contains a local source path.

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
