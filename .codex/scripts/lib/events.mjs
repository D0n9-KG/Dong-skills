import { fileFresh, latestChangedMtime, shortList, writeJson } from "./core.mjs";
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

export function postCompact(root, ctx) {
  writeJson(sessionRecoveryContext(root, ctx, "PostCompact"));
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

export function preCompact(root, ctx) {
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
