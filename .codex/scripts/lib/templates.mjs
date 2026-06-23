import fs from "node:fs";
import path from "node:path";

export const REQUIRED_FILES = {
  current: "current-state.md",
  projectMap: "project-map.md",
  spec: "spec.md",
  plan: "plan-progress.md",
  artifacts: "artifact-index.md",
  decisions: "decisions.md",
  questions: "open-questions.md",
  risks: "risks.md",
  verification: "verification.md",
  workingNotes: "working-notes.md",
  instincts: "learned-instincts.md",
  dongSkillsOutbox: "dong-skills-outbox.md",
  solutions: "solution-index.md",
  worktree: "worktree-state.md",
  workflow: "workflow-state.yaml",
  handoff: "handoff-summary.md"
};

export const TEMPLATES = {
  "current-state.md": `# Current State

## Objective
[One sentence.]

## Latest User Instruction
[Most recent instruction that changes scope or priority.]

## Current Phase
[discovery | brainstorming | spec | planning | implementation | debugging | verification | review | delivery | blocked | handoff]

## Active Assumptions
- [Assumption and why it is acceptable.]

## Blockers
- None.

## Next Action
[Exactly one next action.]

## Last Updated
[YYYY-MM-DD HH:mm local time.]
`,
  "project-map.md": `# Project Map

## Purpose
[What this project does, or "Unknown".]

## Stack
- [Language/framework/package manager.]

## Architecture
- [Key components and how they connect.]

## Important Paths
- \`path\`: [purpose]

## Entry Points
- \`path\`: [runtime or command entry point]

## Commands
- Dev: \`[command or unknown]\`
- Build: \`[command or unknown]\`
- Typecheck: \`[command or unknown]\`
- Lint: \`[command or unknown]\`
- Test: \`[command or unknown]\`

## Conventions
- [Evidence-backed convention.]

## Where To Change Things
- [Task type]: \`path\`

## Architecture Watchpoints
- [Large files, flat directories, coupling, or unclear ownership to revisit.]

## Unknowns
- [Unknown and how to verify.]
`,
  "spec.md": `# Spec

## Problem
[What user wants solved.]

## Goals
- [Goal.]

## Approval Status
Living Draft / Not Approved. Use Pending written-spec approval after final discussion approval, and Approved by user on [date/time] only after written-spec approval.

## Truth Hierarchy
- Latest user instruction.
- Verified behavior from code, tests, commands, product evidence, or live repo inspection.
- Approved written spec and approved plan for this task.
- Current state files and handoff.
- Older chat, raw notes, stale specs, or unreviewed observations.

## Work Class / Risk Lane
- Lane 0 / Lane 1 / Lane 2 / Lane 3, with reason.

## Non-Goals
- [Explicitly out of scope.]

## Approved Scope
- [What has been approved.]

## User Decisions
- [Decision and date.]

## Candidate Options
- None yet.

## Design
- Not drafted yet.

## Acceptance Criteria
- [Observable outcome.]

## Open Questions
- [Question or "None".]

## Next Step
[brainstorming | writing-plans | executing-plans | direct tiny edit | pause]
`,
  "plan-progress.md": `# Plan Progress

## Active Plan
[Path to detailed plan/spec, or "No formal plan yet".]

## Spec Approval
[Approved by user / skipped by user / mechanical exception / pending.]

## Execution Approval
Not approved yet. Record "Approved by user for Traditional task-by-task execution on [date/time]", "Approved by user for Codex Goal mode on [date/time]", or "plan-then-execute requested; Traditional task-by-task execution" before implementation.

## Execution Mode
Pending user choice. Allowed values: Traditional task-by-task execution; Codex Goal mode. Do not infer Codex Goal mode from "continue", "execute", or plan-then-execute.

## Work Class / Risk Lane
Pending. Record Lane 0, Lane 1, Lane 2, or Lane 3 and why that lane is sufficient. The lane controls plan depth, verification depth, state update cadence, review, rollback, and checkpoint cadence.

## Goal Mode Objective
Not selected. If Codex Goal mode is explicitly selected, include the goal mechanism available in the current Codex session, objective, spec path, plan path, approved scope, non-goals, current step, verification commands, checkpoint cadence, required state updates, and stop conditions. Goal mode is unavailable when the current session does not expose an actual goal mechanism.

## Runtime Constraints
- Follow the approved plan tasks in order unless a blocker requires replanning.
- Keep \`plan-progress.md\`, \`artifact-index.md\`, \`verification.md\`, \`current-state.md\`, and \`handoff-summary.md\` current.
- Stop on ambiguity, repeated verification failure, scope change, destructive action, missing credentials, missing user decisions, architecture conflict, or state contradiction.
- Do not silently expand scope beyond the approved spec.

## Checkpoint Cadence
- Checkpoint after each meaningful verified task or milestone, or record why checkpointing is deferred.

## Tasks
- [ ] Task 1: [status and evidence]

## Current Step
[Exactly one active step, or "None".]

## Verification
- [Command/check and expected signal.]

## Out Of Scope
- [Explicit non-goals.]
`,
  "artifact-index.md": `# Artifact Index

## Created
- None yet.

## Modified
- None yet.

## Read / Inspected
- None yet.

## Raw Outputs
- None yet.
`,
  "decisions.md": `# Decisions

## Accepted
- None yet.

## Rejected
- None yet.
`,
  "open-questions.md": `# Open Questions

- None.
`,
  "risks.md": `# Risks

## Context Risks
- None known.

## Technical Risks
- None known.

## Architecture Risks
- None known.

## Documentation Risks
- None known.

## Safety / Destructive Risks
- None known.
`,
  "verification.md": `# Verification

## Commands Run
- None yet.

## Product Evidence
- None yet.

## Not Yet Verified
- None yet.
`,
  "working-notes.md": `# Working Notes

## Purpose
Capture compact, externalized investigation state that should survive compaction. Do not store hidden chain-of-thought, full transcripts, raw logs, secrets, or private reasoning here.

## Current Findings
- None yet.

## Current Hypothesis
- None yet.

## Rejected Paths
- None yet.

## Open Investigation Questions
- None yet.

## Next Verification Step
- None yet.

## Promotion Notes
- Promote durable conclusions into spec.md, decisions.md, current-state.md, handoff-summary.md, or docs/solutions/ at phase boundaries.
`,
  "learned-instincts.md": `# Learned Instincts

## Summary
Keep this file as a compact index. Store individual instincts under \`.codex-context/instincts/\`.

## Raw Observation Review
- Last reviewed raw observations: None yet.
- Review rule: convert useful events into instincts, absorb duplicates into existing docs, or record a deliberate drop.

## Active Project Instincts
- None yet.

## Candidate Instincts
- None yet.

## Retired / Contradicted / Superseded
- None yet.

## Promotion Candidates
- None yet.

## Maintenance Log
- None yet.
`,
  "dong-skills-outbox.md": `# Dong Skills Improvement Outbox

## Purpose
This file is a fallback queue for Dong Skills improvement ideas when the real Dong Skills source repository cannot be found or written.

Do not treat entries here as project instincts, project rules, or solution memory. Migrate useful entries to the Dong Skills repository at \`docs/improvements/backlog.md\`.

## Target
- Preferred location: Dong Skills repo \`docs/improvements/backlog.md\`
- Discovery order: \`DONG_SKILLS_REPO\`, \`DONG_SKILLS_HOME\`, global source marker, current repo if it is Dong Skills, then this outbox

## Pending Improvements
- None.

## Migrated
- None.
`,
  "solution-index.md": `# Solution Index

## Knowledge Store
- docs/solutions present: no
- CONCEPTS.md present: no
- Solution docs: 0

## Categories
- None yet.

## Validation
- No validation issues found.

## Refresh Signals
- No refresh candidates found.

## Last Updated
- None yet.
`,
  "worktree-state.md": `# Worktree State

## Current Workspace
- Role: unknown
- Path: not detected yet
- Detection date: not detected yet

## Primary Checkout
- Path: not detected yet
- Relationship: not detected yet

## Branch State
- Branch: not detected yet
- Detached HEAD: not detected yet
- Base branch: not detected yet

## Ownership And Cleanup
- Cleanup owner: unknown
- Cleanup rule: do not remove any worktree unless it is explicitly recorded as \`dong-managed-worktree\` and cleanup is user-approved.

## Hook Root Notes
- Hook source root: not detected yet
- Actual Git root: not detected yet
- Notes: update this if Codex UI shows hooks from a different checkout than the current Git root.

## Resume Instructions
- Re-run \`git rev-parse --show-toplevel\`, \`git rev-parse --git-dir\`, \`git rev-parse --git-common-dir\`, and \`git branch --show-current\` before branch completion or cleanup.
- If this session resumes from a Codex App worktree, update this file before editing project files.
`,
  "workflow-state.yaml": `workflow: standard
phase: discovery
next_skill: codex-codebase-onboarding
auto_next: true
decision_required: none
spec_status: not-started
plan_status: not-started
execution_mode: pending
execution_approval: pending
verify_result: pending
review_status: pending
checkpoint_status: pending
handoff_hash: null
updated_at: not-started
note: initialized
`,
  "handoff-summary.md": `# Handoff Summary

## Objective

## Latest User Instruction

## Approved Scope / Spec

## Plan Status

## Files Modified

## Files Read But Not Changed

## Decisions Made

## Open Questions And Assumptions

## Risks

## Verification Evidence

## Git Checkpoint
- Latest commit:
- Push state:
- Files included:
- Files intentionally left uncommitted:
- Deferred reason:
- Next checkpoint:

## Learned Instincts To Preserve

## Next Action

## Files To Re-read First
`
};

function ensureGitkeep(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "", "utf8");
}

export function ensureContext(root) {
  const ctx = path.join(root, ".codex-context");
  fs.mkdirSync(path.join(ctx, "raw"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "archive"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "project"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "retired"), { recursive: true });
  ensureGitkeep(path.join(ctx, "raw", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "archive", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "project", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "candidates", ".gitkeep"));
  ensureGitkeep(path.join(ctx, "instincts", "retired", ".gitkeep"));
  for (const [name, body] of Object.entries(TEMPLATES)) {
    const file = path.join(ctx, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, body, "utf8");
  }
  return ctx;
}
