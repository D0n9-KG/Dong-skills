# Risks

## Context Risks
- Hooks discovered after a fresh bootstrap may not appear in the current Codex thread until Codex is restarted or a new thread is opened from the project.
- Git checkpoint reminders can become noisy if every unfinished diff is treated as commit-ready; the design allows documenting a deferred checkpoint in handoff.

## Technical Risks
- Project-level hook trust is still per repository; users may need to approve hooks through `/hooks`.
- `PreCompact` can request blocking and refresh state, but it should not be treated as a hard guarantee against every automatic compaction edge case.
- Hook Git status checks must not require a GitHub remote for non-GitHub or local-only repositories.

## Safety / Destructive Risks
- Installer and bootstrap modify `AGENTS.md`; marker replacement creates a backup when replacing an existing managed block.
- Release scans must exclude `.git` and verify no raw observations, logs, backups, local paths, or secrets are published.
- Checkpoint commits must not stage unrelated user changes, secrets, raw observations, logs, backups, or local private paths.
