# Risks

## Context Risks
- Hooks discovered after a fresh bootstrap may not appear in the current Codex thread until Codex is restarted or a new thread is opened from the project.
- Git checkpoint reminders can become noisy if every unfinished diff is treated as commit-ready; the design allows documenting a deferred checkpoint in handoff.
- Session recovery is section-aware, but very large individual handoff sections can still be clipped; keep handoff sections concise.
- `.codex-context/archive/` must stay on-demand; do not add it to recovery order.
- Full `docs/solutions/` bodies and session histories must stay on-demand; active recovery should use `solution-index.md` and targeted reads.
- Automatic recovery now injects a compact `solution-index.md` excerpt; keep that file short enough to remain useful after compaction.

## Technical Risks
- Project-level hook trust is still per repository; users may need to approve hooks through `/hooks`.
- `PreCompact` can request blocking and refresh state, but it should not be treated as a hard guarantee against every automatic compaction edge case.
- Hook Git status checks must not require a GitHub remote for non-GitHub or local-only repositories.
- Installer/bootstrap now copy split hook libraries; asset parity must stay fresh.
- Bootstrap asset parity drift is now release-blocking through `project-ops-health.mjs`; future helper/script changes must sync root and asset copies together.
- Scan scripts are heuristic only and must not drive automatic refactors without review.
- `solutions.mjs` validates a compact frontmatter contract, not semantic truth; stale or misleading solution docs still require human/agent review against current code.
- `session-history.mjs` searches local agent history metadata and keyword counts only; it does not guarantee complete recovery of prior work.

## Architecture Risks
- Adding governance skills can bloat routing docs if their long rules stay in always-read files; keep details in skill-specific references.
- Split hook modules reduce file concentration but add asset-sync risk.
- State archive can grow over time; budget excludes it, so docs stewardship should review archive size separately.
- Adding CE-inspired skills increases the global skill set; routing docs must stay concise and skill details should remain on demand.

## Documentation Risks
- README, AGENTS snippet, project-map, and skill routing can diverge after future changes.
- Generated context archives may preserve outdated command evidence; keep main `verification.md` current.
- `docs/solutions/` can accumulate overlapping or stale entries unless `codex-solution-memory` refresh/consolidation is used.

## Safety / Destructive Risks
- Installer and bootstrap modify `AGENTS.md`; marker replacement creates a backup when replacing an existing managed block.
- Installer and bootstrap modify `.gitignore` to protect `.codex-context/raw/`; incomplete managed marker blocks intentionally stop installation.
- Release scans must exclude `.git` and verify no raw observations, logs, backups, local paths, or secrets are published.
- Checkpoint commits must not stage unrelated user changes, secrets, raw observations, logs, backups, or local private paths.
