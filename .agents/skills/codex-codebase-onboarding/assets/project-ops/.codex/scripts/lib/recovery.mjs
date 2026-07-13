import path from "node:path";
import { assetGovernanceStatus } from "./assets.mjs";
import { readText } from "./core.mjs";
import { sectionContent, meaningful } from "./markdown.mjs";
import { gitCheckpointStatus } from "./git.mjs";
import { learningStatus } from "./learning.mjs";
import { activeWayfinderSummary } from "./recovery-eval.mjs";
import { REQUIRED_FILES } from "./templates.mjs";
import { detectWorktree, worktreeSummary } from "./worktree.mjs";
import { recoverWorkflowContext, workflowStatus } from "./workflow.mjs";

const RECOVERY_ORDER = [
  "Recovery order:",
  "1. .codex-context/handoff-summary.md",
  "2. .codex-context/worktree-state.md",
  "3. .codex-context/workflow-state.yaml",
  "4. .codex-context/current-state.md",
  "5. .codex-context/project-map.md",
  "6. .codex-context/spec.md",
  "7. .codex-context/decisions.md",
  "8. .codex-context/open-questions.md",
  "9. .codex-context/working-notes.md",
  "10. .codex-context/plan-progress.md",
  "11. .codex-context/artifact-index.md",
  "12. .codex-context/solution-index.md",
  "13. .codex-context/learned-instincts.md",
  "14. .codex-context/dong-skills-outbox.md only when discussing Dong Skills improvements",
  "15. STRATEGY.md, CONCEPTS.md, or relevant docs/solutions entries only when the task needs them",
  "16. latest user instruction"
].join("\n");

function excerpt(ctx, name, max) {
  const text = readText(path.join(ctx, name)).trim();
  return text ? text.slice(0, max) : "";
}

function sectionExcerpt(markdown, heading, max) {
  const body = sectionContent(markdown, heading);
  if (!meaningful(body)) return "";
  const clipped = body.length > max ? `${body.slice(0, max - 3)}...` : body;
  return `## ${heading}\n${clipped}`;
}

function handoffRecoveryExcerpt(ctx) {
  const markdown = readText(path.join(ctx, REQUIRED_FILES.handoff));
  const sections = [
    ["Objective", 280],
    ["Latest User Instruction", 360],
    ["Next Action", 320],
    ["Plan Status", 360],
    ["Git Checkpoint", 520],
    ["Files To Re-read First", 420],
    ["Open Questions And Assumptions", 360],
    ["Verification Evidence", 420],
    ["PreCompact Emergency Notice", 520],
    ["PreCompact Issues", 420]
  ];
  const selected = sections
    .map(([heading, max]) => sectionExcerpt(markdown, heading, max))
    .filter(Boolean);
  if (selected.length) return selected.join("\n\n");
  return excerpt(ctx, REQUIRED_FILES.handoff, 1800);
}

function hookStatus(root, ctx, eventName) {
  const workflow = workflowStatus(root, ctx);
  const learning = learningStatus(ctx);
  const assets = assetGovernanceStatus(root, ctx);
  const checkpoint = gitCheckpointStatus(root, ctx, 0);
  const state = workflow.state || {};

  return [
    "Hook status:",
    `- Event: ${eventName || "unknown"}`,
    `- Actual Git root: ${root}`,
    `- Workflow: phase=${state.phase || "missing"} next_skill=${state.next_skill || "missing"} decision_required=${state.decision_required || "missing"} issues=${workflow.issues.length}`,
    `- Learning: ${learning.ok ? "ok" : "pending-review"} issues=${learning.issues.length}`,
    `- Assets: ${assets.ok ? "ok" : "review-required"} issues=${assets.issues.length} advisories=${assets.advisories.length}`,
    `- Checkpoint: ${checkpoint.ok ? "ok" : "review-required"}`
  ].join("\n");
}

export function sessionRecoveryContext(root, ctx, eventName) {
  const learning = learningStatus(ctx);
  const learningSummary = learning.ok
    ? "No pending learning review."
    : `Learning advisory: ${learning.issues.join("; ")}. Review it at a meaningful milestone; it does not block recovery.`;
  const checkpointSummary = gitCheckpointStatus(root, ctx, 0).summary;
  const workspaceSummary = worktreeSummary(detectWorktree(root));
  const wayfinderSummary = activeWayfinderSummary(root, ctx);

  const parts = [
    "Codex Project Ops hooks are active.",
    hookStatus(root, ctx, eventName),
    RECOVERY_ORDER,
    "Before editing, keep artifact-index.md current. Before completion, update verification.md, Git Checkpoint, and handoff-summary.md.",
    workspaceSummary,
    learningSummary,
    checkpointSummary,
    "",
    "Handoff excerpt:",
    handoffRecoveryExcerpt(ctx),
    "",
    wayfinderSummary,
    "",
    "Workflow recovery:",
    recoverWorkflowContext(root, ctx),
    "",
    "Current state excerpt:",
    excerpt(ctx, REQUIRED_FILES.current, 1000)
  ].filter((part) => part !== "");

  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: parts.join("\n")
    }
  };
}
