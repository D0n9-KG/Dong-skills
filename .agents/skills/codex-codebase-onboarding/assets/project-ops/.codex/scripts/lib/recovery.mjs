import path from "node:path";
import { readText } from "./core.mjs";
import { sectionContent, meaningful } from "./markdown.mjs";
import { gitCheckpointStatus } from "./git.mjs";
import { learningStatus } from "./learning.mjs";
import { REQUIRED_FILES } from "./templates.mjs";
import { detectWorktree, worktreeSummary } from "./worktree.mjs";
import { recoverWorkflowContext } from "./workflow.mjs";

const RECOVERY_ORDER = [
  "Recovery order:",
  "1. .codex-context/handoff-summary.md",
  "2. .codex-context/worktree-state.md",
  "3. .codex-context/workflow-state.yaml",
  "4. .codex-context/current-state.md",
  "5. .codex-context/project-map.md",
  "6. .codex-context/spec.md",
  "7. .codex-context/plan-progress.md",
  "8. .codex-context/artifact-index.md",
  "9. .codex-context/solution-index.md",
  "10. .codex-context/learned-instincts.md",
  "11. .codex-context/dong-skills-outbox.md only when discussing Dong Skills improvements",
  "12. STRATEGY.md, CONCEPTS.md, or relevant docs/solutions entries only when the task needs them",
  "13. latest user instruction"
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
    ["PreCompact Emergency Notice", 520],
    ["PreCompact Issues", 420],
    ["Objective", 280],
    ["Latest User Instruction", 360],
    ["Plan Status", 360],
    ["Git Checkpoint", 520],
    ["Next Action", 320],
    ["Files To Re-read First", 420],
    ["Open Questions And Assumptions", 360],
    ["Verification Evidence", 420]
  ];
  const selected = sections
    .map(([heading, max]) => sectionExcerpt(markdown, heading, max))
    .filter(Boolean);
  if (selected.length) return selected.join("\n\n");
  return excerpt(ctx, REQUIRED_FILES.handoff, 1800);
}

export function sessionRecoveryContext(root, ctx, eventName) {
  const learning = learningStatus(ctx);
  const learningSummary = learning.ok
    ? "No pending learning review."
    : `Pending learning review: ${learning.issues.join("; ")}.`;
  const checkpointSummary = gitCheckpointStatus(root, ctx, 0).summary;
  const workspaceSummary = worktreeSummary(detectWorktree(root));

  const parts = [
    "Codex Project Ops hooks are active.",
    RECOVERY_ORDER,
    "Before editing, keep artifact-index.md current. Before completion, update verification.md, Git Checkpoint, and handoff-summary.md.",
    workspaceSummary,
    learningSummary,
    checkpointSummary,
    "",
    "Handoff excerpt:",
    handoffRecoveryExcerpt(ctx),
    "",
    "Workflow recovery:",
    recoverWorkflowContext(root, ctx),
    "",
    "Current state excerpt:",
    excerpt(ctx, REQUIRED_FILES.current, 1000),
    "",
    "Worktree state excerpt:",
    excerpt(ctx, REQUIRED_FILES.worktree, 800),
    "",
    "Plan excerpt:",
    excerpt(ctx, REQUIRED_FILES.plan, 700),
    "",
    "Solution index excerpt:",
    excerpt(ctx, REQUIRED_FILES.solutions, 700),
    "",
    "Learned instincts excerpt:",
    excerpt(ctx, REQUIRED_FILES.instincts, 900)
  ].filter((part) => part !== "");

  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: parts.join("\n")
    }
  };
}
