# Risks

## Context Risks
- Hooks discovered after a fresh bootstrap may not appear in the current Codex thread until Codex is restarted or a new thread is opened from the project.
- Git checkpoint reminders can become noisy if every unfinished diff is treated as commit-ready; the design allows documenting a deferred checkpoint in handoff.
- Session recovery is now section-aware, but very large individual handoff sections can still be clipped; keep handoff sections concise.

## Technical Risks
- Project-level hook trust is still per repository; users may need to approve hooks through `/hooks`.
- `PreCompact` can request blocking and refresh state, but it should not be treated as a hard guarantee against every automatic compaction edge case.
- Hook Git status checks must not require a GitHub remote for non-GitHub or local-only repositories.
- Installer/bootstrap now patch missing markdown sections; this should preserve existing content but can append new template sections to older projects.

## Safety / Destructive Risks
- Installer and bootstrap modify `AGENTS.md`; marker replacement creates a backup when replacing an existing managed block.
- Installer and bootstrap modify `.gitignore` to protect `.codex-context/raw/`; incomplete managed marker blocks intentionally stop installation.
- Release scans must exclude `.git` and verify no raw observations, logs, backups, local paths, or secrets are published.
- Checkpoint commits must not stage unrelated user changes, secrets, raw observations, logs, backups, or local private paths.
