import fs from "node:fs";
import path from "node:path";
import { fileFresh, latestChangedMtime, readText, shortList, writeJson } from "./core.mjs";
import { gitChangedFiles, gitCheckpointStatus, gitStatusFiles } from "./git.mjs";
import { handoffStatus, markdownStatus, verificationStatus } from "./markdown.mjs";
import {
  appendLearningObservation,
  classifyLearningCue,
  extractPromptText,
  learningStatus
} from "./learning.mjs";
import { sessionRecoveryContext } from "./recovery.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export function sessionStart(root, ctx) {
  writeJson(sessionRecoveryContext(root, ctx, "SessionStart"));
}

export function postCompact() {
  writeJson({ continue: true });
}

export function userPromptSubmit(input, root, ctx) {
  const prompt = extractPromptText(input);
  const cue = classifyLearningCue(prompt);
  if (!cue) return;

  const saved = appendLearningObservation(root, ctx, input, cue, prompt);
  if (!saved) return;

  const message = [
    "Codex Project Ops captured a raw learning observation.",
    "Do not treat it as active memory yet.",
    "Before compaction or stopping, evaluate it with codex-learning-memory and refresh learned-instincts.md."
  ].join(" ");

  writeJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: message
    }
  });
}

export function postToolUse(root, ctx) {
  const changed = gitChangedFiles(root);
  if (changed.length === 0) return;

  const latest = latestChangedMtime(root, changed);
  if (fileFresh(ctx, REQUIRED_FILES.artifacts, latest)) return;

  const reason = [
    "Codex Project Ops: non-context files changed, but .codex-context/artifact-index.md is not fresh.",
    `Changed files: ${shortList(changed)}.`,
    "Update artifact-index.md with created/modified/read files and why they matter before continuing.",
    "Also update current-state.md if phase, assumption, or next action changed."
  ].join("\n");

  writeJson({
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: reason
    }
  });
}

function compactTrigger(input) {
  const candidates = [
    input?.trigger,
    input?.compaction_trigger,
    input?.compactionTrigger,
    input?.compact_trigger,
    input?.compactTrigger,
    input?.matcher,
    input?.source,
    input?.reason,
    input?.event?.trigger,
    input?.event?.compaction_trigger,
    input?.event?.compactionTrigger
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").toLowerCase();
    if (normalized === "manual" || normalized.includes("manual")) return "manual";
    if (normalized === "auto" || normalized.includes("automatic")) return "auto";
  }

  return "auto";
}

function markdownList(items, fallback = "- None reported.") {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join("\n");
}

function writeEmergencyPreCompactHandoff(root, ctx, changed, statusFiles, issues, trigger) {
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const handoffFile = path.join(ctx, REQUIRED_FILES.handoff);
  const rawDir = path.join(ctx, "raw");
  const rawFile = path.join(rawDir, `precompact-auto-${safeTimestamp}.md`);
  const previousHandoff = readText(handoffFile).trim();
  fs.mkdirSync(rawDir, { recursive: true });

  fs.writeFileSync(rawFile, [
    "# PreCompact Auto Emergency Snapshot",
    "",
    `Created: ${timestamp}`,
    `Trigger: ${trigger}`,
    "",
    "## Changed Project Files",
    markdownList(changed),
    "",
    "## Git Status Files",
    markdownList(statusFiles),
    "",
    "## Issues",
    markdownList(issues),
    "",
    "## Previous Handoff",
    previousHandoff || "No previous handoff content."
  ].join("\n"), "utf8");

  const reread = [
    ".codex-context/handoff-summary.md",
    ".codex-context/current-state.md",
    ".codex-context/project-map.md",
    ".codex-context/spec.md",
    ".codex-context/plan-progress.md",
    ".codex-context/artifact-index.md",
    ".codex-context/learned-instincts.md",
    ...statusFiles.slice(0, 8)
  ];
  const uniqueReread = [...new Set(reread)].filter(Boolean);
  const rawRel = path.relative(root, rawFile).replace(/\\/g, "/");

  fs.writeFileSync(handoffFile, `# Handoff Summary

## Objective
Emergency recovery snapshot before automatic compaction.

## Latest User Instruction
Automatic compaction was about to run while Codex Project Ops state had unresolved freshness issues.

## Approved Scope / Spec
Allow automatic compaction after writing this emergency handoff. On recovery, inspect the listed files and refresh normal project state before continuing substantive work.

## Plan Status
Emergency PreCompact fallback. This is not a normal milestone handoff.

## Files Modified
${markdownList(statusFiles)}

## Files Read But Not Changed
- Previous handoff snapshot was copied to \`${rawRel}\`.

## Decisions Made
- Automatic compaction was allowed to avoid a silent hard stop at context pressure.
- Manual compaction should still refresh project state before compacting.

## Open Questions And Assumptions
- Assumption: preserving a recoverable handoff is safer than blocking automatic compaction without reliable chat feedback.
- Open question: after recovery, verify whether any project-specific state files need richer updates.

## Risks
- This emergency handoff may be less complete than a deliberate handoff.
- Some state files listed in the issues below may still be stale after compaction.

## Verification Evidence
- Not verified in this emergency PreCompact path. Review \`.codex-context/verification.md\` after recovery.

## Git Checkpoint
- Latest commit: not checked during automatic PreCompact
- Push state: not checked during automatic PreCompact
- Files included: none during automatic PreCompact
- Files intentionally left uncommitted: ${statusFiles.length ? shortList(statusFiles, 20) : "none reported"}
- Deferred reason: automatic compaction was allowed after emergency handoff to avoid a silent block
- Next checkpoint: run codex-git-checkpoint after recovery if work should be archived

## Learned Instincts To Preserve
- Review \`.codex-context/learned-instincts.md\` and pending raw observations after recovery.

## Next Action
After compaction, re-read this handoff, inspect the unresolved issues, then refresh current-state.md, plan-progress.md, artifact-index.md, verification.md, learned-instincts.md, and Git Checkpoint as applicable.

## Files To Re-read First
${markdownList(uniqueReread)}

## PreCompact Issues
${markdownList(issues)}
`, "utf8");

  return rawRel;
}

export function preCompact(input, root, ctx) {
  const changed = gitChangedFiles(root);
  const statusFiles = gitStatusFiles(root);
  const latest = latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
  const issues = [];

  for (const [key, label] of [
    [REQUIRED_FILES.current, "current-state.md"],
    [REQUIRED_FILES.plan, "plan-progress.md"],
    [REQUIRED_FILES.artifacts, "artifact-index.md"]
  ]) {
    const status = markdownStatus(ctx, key, latest, label);
    if (!status.ok) issues.push(status.issue);
  }

  const handoff = handoffStatus(ctx, latest);
  if (!handoff.ok) {
    if (handoff.stale) issues.push("handoff-summary.md is older than changed project files");
    if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
  }

  const learning = learningStatus(ctx);
  issues.push(...learning.issues);

  const checkpoint = gitCheckpointStatus(root, ctx, latest);
  if (!checkpoint.ok) issues.push(checkpoint.summary);

  if (issues.length === 0) return;

  const trigger = compactTrigger(input);
  if (trigger === "auto") {
    const rawRel = writeEmergencyPreCompactHandoff(root, ctx, changed, statusFiles, issues, trigger);
    const message = [
      "Codex Project Ops allowed automatic compaction after writing an emergency handoff.",
      "Recovery file: .codex-context/handoff-summary.md.",
      `Previous handoff snapshot: ${rawRel}.`,
      `Issues captured: ${issues.join("; ")}.`
    ].join("\n");

    writeJson({
      continue: true,
      systemMessage: message
    });
    return;
  }

  writeJson({
    continue: false,
    stopReason: "codex-project-ops-handoff-not-ready",
    systemMessage: [
      "Codex Project Ops blocked compaction.",
      `Issues: ${issues.join("; ")}.`,
      "Refresh current-state.md, plan-progress.md, artifact-index.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. Then compact again."
    ].join("\n")
  });
}

export function stop(input, root, ctx) {
  if (input.stop_hook_active) {
    writeJson({ continue: true });
    return;
  }

  const changed = gitChangedFiles(root);
  const learning = learningStatus(ctx);
  const statusFiles = gitStatusFiles(root);
  const latest = latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
  const checkpoint = gitCheckpointStatus(root, ctx, latest);

  if (changed.length === 0 && learning.ok && checkpoint.ok) {
    writeJson({ continue: true });
    return;
  }

  const issues = [];

  if (changed.length > 0) {
    for (const [key, label] of [
      [REQUIRED_FILES.current, "current-state.md"],
      [REQUIRED_FILES.artifacts, "artifact-index.md"]
    ]) {
      const status = markdownStatus(ctx, key, latest, label);
      if (!status.ok) issues.push(status.issue);
    }

    const verification = verificationStatus(ctx, latest);
    if (verification.stale) issues.push("verification.md is older than changed files");
    if (!verification.hasEvidence) issues.push("verification.md has neither command evidence nor explicit unverified gaps");

    const handoff = handoffStatus(ctx, latest);
    if (!handoff.ok) {
      if (handoff.stale) issues.push("handoff-summary.md is older than changed files");
      if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
    }
  }

  issues.push(...learning.issues);
  if (!checkpoint.ok) issues.push(checkpoint.summary);

  if (issues.length === 0) {
    writeJson({ continue: true });
    return;
  }

  writeJson({
    decision: "block",
    reason: [
      "Before stopping, refresh Codex Project Ops state.",
      changed.length ? `Changed files: ${shortList(changed)}.` : "No non-context files changed.",
      `Issues: ${issues.join("; ")}.`,
      "Update artifact-index.md, current-state.md, verification.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. If verification was not run, record the explicit gap instead of claiming success."
    ].join("\n")
  });
}
