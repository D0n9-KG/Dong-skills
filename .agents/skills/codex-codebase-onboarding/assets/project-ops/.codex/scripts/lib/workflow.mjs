import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readText } from "./core.mjs";
import { meaningful, sectionContent } from "./markdown.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export const WORKFLOW_FILE = "workflow-state.yaml";

const FIELD_ORDER = [
  "workflow",
  "phase",
  "next_skill",
  "auto_next",
  "decision_required",
  "spec_status",
  "plan_status",
  "execution_mode",
  "execution_approval",
  "verify_result",
  "review_status",
  "checkpoint_status",
  "handoff_hash",
  "updated_at",
  "note"
];

const ALLOWED = {
  workflow: ["standard", "hotfix", "tweak"],
  phase: [
    "discovery",
    "brainstorming",
    "spec",
    "planning",
    "execution",
    "debugging",
    "verification",
    "review",
    "delivery",
    "handoff",
    "blocked",
    "complete"
  ],
  next_skill: [
    "using-superpowers",
    "codex-codebase-onboarding",
    "brainstorming",
    "writing-plans",
    "executing-plans",
    "codex-worktree-governance",
    "systematic-debugging",
    "codex-architecture-governance",
    "codex-verification-loop",
    "codex-evidence-capture",
    "verification-before-completion",
    "requesting-code-review",
    "receiving-code-review",
    "codex-simplicity-review",
    "codex-review-panel",
    "codex-git-checkpoint",
    "codex-learning-memory",
    "codex-solution-memory",
    "codex-session-history",
    "codex-strategy-anchor",
    "codex-docs-stewardship",
    "codex-context-budget",
    "codex-asset-governance",
    "none"
  ],
  auto_next: ["true", "false"],
  decision_required: [
    "none",
    "clarify-scope",
    "written-spec-approval",
    "execution-approval",
    "verification-failure-choice",
    "branch-handling-choice",
    "archive-confirmation",
    "user-choice"
  ],
  spec_status: [
    "not-started",
    "living-draft",
    "pending-approval",
    "approved",
    "skipped",
    "mechanical-exception"
  ],
  plan_status: ["not-started", "drafting", "drafted", "approved"],
  execution_mode: ["pending", "traditional", "codex-goal"],
  execution_approval: ["pending", "approved-traditional", "approved-goal", "plan-then-execute-traditional"],
  verify_result: ["pending", "pass", "fail", "gap-recorded"],
  review_status: ["pending", "done", "skipped"],
  checkpoint_status: ["pending", "done", "deferred"]
};

export function defaultWorkflowState() {
  return {
    workflow: "standard",
    phase: "discovery",
    next_skill: "codex-codebase-onboarding",
    auto_next: "true",
    decision_required: "none",
    spec_status: "not-started",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending",
    verify_result: "pending",
    review_status: "pending",
    checkpoint_status: "pending",
    handoff_hash: "null",
    updated_at: new Date().toISOString(),
    note: "initialized"
  };
}

export function workflowPath(ctx) {
  return path.join(ctx, WORKFLOW_FILE);
}

function ctxFor(root, ctx) {
  return ctx || path.join(root, ".codex-context");
}

function stripQuotes(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

export function parseWorkflowYaml(text) {
  const state = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    state[match[1]] = stripQuotes(match[2]);
  }
  return state;
}

function serializeValue(value) {
  const text = String(value ?? "");
  if (/[\r\n]/.test(text)) return text.replace(/[\r\n]+/g, " ").trim();
  return text || "null";
}

export function serializeWorkflowState(state) {
  const keys = [...FIELD_ORDER, ...Object.keys(state).filter((key) => !FIELD_ORDER.includes(key)).sort()];
  const seen = new Set();
  const lines = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${key}: ${serializeValue(state[key])}`);
  }
  return `${lines.join("\n")}\n`;
}

export function ensureWorkflowState(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  fs.mkdirSync(contextDir, { recursive: true });
  const file = workflowPath(contextDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, serializeWorkflowState(defaultWorkflowState()), "utf8");
  }
  return file;
}

export function loadWorkflowState(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  const file = workflowPath(contextDir);
  if (!fs.existsSync(file)) {
    throw new Error(`${WORKFLOW_FILE} is missing; run workflow-state init only if initializing this project state is intentional.`);
  }
  return parseWorkflowYaml(fs.readFileSync(file, "utf8"));
}

export function saveWorkflowState(root, ctx, state) {
  const contextDir = ctxFor(root, ctx);
  const file = ensureWorkflowState(root, contextDir);
  fs.writeFileSync(file, serializeWorkflowState({
    ...defaultWorkflowState(),
    ...state,
    updated_at: new Date().toISOString()
  }), "utf8");
  return file;
}

function validateEnum(state, issues, field) {
  const value = state[field];
  if (!value) issues.push(`${WORKFLOW_FILE} missing field: ${field}`);
  else if (ALLOWED[field] && !ALLOWED[field].includes(value)) {
    issues.push(`${WORKFLOW_FILE} invalid ${field}: ${value}`);
  }
}

export function validateWorkflowState(state) {
  const issues = [];
  for (const field of FIELD_ORDER) {
    if (field === "updated_at" || field === "note" || field === "handoff_hash") continue;
    validateEnum(state, issues, field);
  }
  if (state.phase === "execution" && state.execution_mode === "pending") {
    issues.push(`${WORKFLOW_FILE} phase=execution requires execution_mode`);
  }
  if (state.phase === "planning" && state.spec_status === "not-started") {
    issues.push(`${WORKFLOW_FILE} phase=planning requires spec_status`);
  }
  return { ok: issues.length === 0, issues };
}

const EXECUTION_OR_LATER_PHASES = new Set([
  "execution",
  "debugging",
  "verification",
  "review",
  "delivery",
  "handoff",
  "complete"
]);

function lower(text) {
  return String(text || "").toLowerCase();
}

function nonTemplateStatusText(text) {
  const value = lower(text);
  if (!meaningful(value)) return "";
  if (/可选值|example|examples|例如|do not infer|不要.*推断|等待用户选择|未选择|not selected/.test(value)) {
    return "";
  }
  return value;
}

function specApprovalFromMarkdown(markdown) {
  const approval = nonTemplateStatusText(sectionContent(markdown, "Approval Status"));
  if (!approval) return "unknown";
  if (/approved by user|用户.*批准|已批准/.test(approval) && !/not approved|未批准/.test(approval)) return "approved";
  if (/living draft|not approved|未批准|草稿/.test(approval)) return "living-draft";
  if (/pending written-spec approval|pending approval|待.*审批|等待.*审批/.test(approval)) return "pending-approval";
  if (/skipped|跳过/.test(approval)) return "skipped";
  if (/mechanical exception|机械例外/.test(approval)) return "mechanical-exception";
  return "unknown";
}

function planApprovalFromMarkdown(markdown) {
  const approval = nonTemplateStatusText(sectionContent(markdown, "Execution Approval"));
  if (!approval) return "unknown";
  if (/pending|not approved|尚未批准|未批准|待.*批准|等待.*批准/.test(approval)) return "pending";
  if (/approved by user.*codex goal|approved.*goal|approved-goal|codex goal.*批准/.test(approval)) return "approved-goal";
  if (/approved by user.*traditional|approved.*traditional|approved-traditional|traditional.*批准|逐项执行.*批准/.test(approval)) return "approved-traditional";
  if (/plan-then-execute|先计划.*执行|计划后执行/.test(approval)) return "plan-then-execute-traditional";
  return "unknown";
}

function planModeFromMarkdown(markdown) {
  const mode = nonTemplateStatusText(sectionContent(markdown, "Execution Mode"));
  if (!mode) return "unknown";
  if (/pending|待定|未定|尚未/.test(mode)) return "pending";
  if (/codex goal|goal mode/.test(mode)) return "codex-goal";
  if (/traditional|task-by-task|逐项|传统/.test(mode)) return "traditional";
  return "unknown";
}

function phaseAtOrAfterExecution(phase) {
  return EXECUTION_OR_LATER_PHASES.has(phase);
}

export function workflowConsistencyStatus(root, ctx, state = null) {
  const contextDir = ctxFor(root, ctx);
  const current = state || {};
  const issues = [];
  const specMarkdown = readText(path.join(contextDir, REQUIRED_FILES.spec));
  const planMarkdown = readText(path.join(contextDir, REQUIRED_FILES.plan));
  const specDoc = specApprovalFromMarkdown(specMarkdown);
  const planApproval = planApprovalFromMarkdown(planMarkdown);
  const planMode = planModeFromMarkdown(planMarkdown);

  if (specDoc === "approved" && ["not-started", "living-draft", "pending-approval"].includes(current.spec_status)) {
    issues.push(`state mismatch: spec.md says approved, but workflow-state.yaml spec_status=${current.spec_status}`);
  }
  if (["living-draft", "pending-approval"].includes(specDoc) && current.spec_status === "approved") {
    issues.push(`state mismatch: workflow-state.yaml spec_status=approved, but spec.md approval status is ${specDoc}`);
  }
  if (phaseAtOrAfterExecution(current.phase) && !["approved", "skipped", "mechanical-exception"].includes(current.spec_status)) {
    issues.push(`state mismatch: phase=${current.phase} requires approved/skipped/mechanical spec_status, got ${current.spec_status}`);
  }

  if (planApproval === "pending" && ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(current.execution_approval)) {
    issues.push(`state mismatch: workflow-state.yaml execution_approval=${current.execution_approval}, but plan-progress.md execution approval is pending`);
  }
  if (["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(planApproval) && current.execution_approval === "pending") {
    issues.push(`state mismatch: plan-progress.md has execution approval, but workflow-state.yaml execution_approval=pending`);
  }
  if (phaseAtOrAfterExecution(current.phase) && !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(current.execution_approval)) {
    issues.push(`state mismatch: phase=${current.phase} requires execution approval, got ${current.execution_approval}`);
  }
  if (current.plan_status === "approved" && planApproval === "pending") {
    issues.push("state mismatch: workflow-state.yaml plan_status=approved, but plan-progress.md says execution is not approved");
  }
  if (["traditional", "codex-goal"].includes(planMode) && current.execution_mode !== "pending" && planMode !== current.execution_mode) {
    issues.push(`state mismatch: plan-progress.md execution mode=${planMode}, but workflow-state.yaml execution_mode=${current.execution_mode}`);
  }

  if (current.phase === "complete" && current.next_skill !== "none") {
    issues.push(`state mismatch: phase=complete requires next_skill=none, got ${current.next_skill}`);
  }
  if (["delivery", "handoff", "complete"].includes(current.phase) && !["pass", "gap-recorded"].includes(current.verify_result)) {
    issues.push(`state mismatch: phase=${current.phase} requires verify_result pass or gap-recorded, got ${current.verify_result}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    specDoc,
    planApproval,
    planMode
  };
}

export function workflowStatus(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  const file = workflowPath(contextDir);
  if (!fs.existsSync(file)) {
    const issue = `${WORKFLOW_FILE} is missing; run workflow-state init only if initializing this project state is intentional.`;
    return {
      ok: false,
      file,
      state: {},
      issues: [issue],
      summary: `Workflow state needs review: ${issue}`
    };
  }
  const state = parseWorkflowYaml(readText(file));
  const validation = validateWorkflowState(state);
  const consistency = validation.ok
    ? workflowConsistencyStatus(root, contextDir, state)
    : { ok: true, issues: [] };
  const issues = [...validation.issues, ...consistency.issues];
  return {
    ok: issues.length === 0,
    file,
    state,
    issues,
    validation,
    consistency,
    summary: issues.length === 0
      ? `Workflow state ok: phase=${state.phase}, next_skill=${state.next_skill}, decision_required=${state.decision_required}.`
      : `Workflow state needs review: ${issues.join("; ")}.`
  };
}

function requirePhase(state, event, allowed) {
  if (!allowed.includes(state.phase)) {
    throw new Error(`Cannot transition ${event}: expected phase ${allowed.join("|")}, got ${state.phase || "missing"}`);
  }
}

function requireSpecReady(state, event) {
  if (!["approved", "skipped", "mechanical-exception"].includes(state.spec_status)) {
    throw new Error(`Cannot transition ${event}: spec_status must be approved, skipped, or mechanical-exception`);
  }
}

function withBase(state, patch, note) {
  return {
    ...state,
    ...patch,
    note
  };
}

export function transitionWorkflowState(root, ctx, event) {
  const state = loadWorkflowState(root, ctx);
  let next;

  switch (event) {
    case "discovery-start":
      next = withBase(state, {
        phase: "discovery",
        next_skill: "codex-codebase-onboarding",
        decision_required: "none"
      }, "Discovery started");
      break;
    case "brainstorming-start":
      next = withBase(state, {
        phase: "brainstorming",
        next_skill: "brainstorming",
        spec_status: state.spec_status === "not-started" ? "living-draft" : state.spec_status,
        decision_required: "none"
      }, "Brainstorming started");
      break;
    case "spec-living":
      requirePhase(state, event, ["brainstorming", "spec"]);
      next = withBase(state, {
        phase: "brainstorming",
        next_skill: "brainstorming",
        spec_status: "living-draft",
        decision_required: "none"
      }, "Living spec updated");
      break;
    case "spec-ready":
      requirePhase(state, event, ["brainstorming", "spec"]);
      next = withBase(state, {
        phase: "spec",
        next_skill: "brainstorming",
        spec_status: "pending-approval",
        decision_required: "written-spec-approval"
      }, "Written spec is ready for user approval");
      break;
    case "spec-approved":
      requirePhase(state, event, ["brainstorming", "spec", "planning"]);
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        spec_status: "approved",
        decision_required: "none"
      }, "Written spec approved");
      break;
    case "spec-skipped":
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        spec_status: "skipped",
        decision_required: "none"
      }, "Brainstorming explicitly skipped");
      break;
    case "mechanical-exception":
      next = withBase(state, {
        phase: "execution",
        next_skill: "executing-plans",
        spec_status: "mechanical-exception",
        plan_status: "approved",
        execution_mode: "traditional",
        execution_approval: "approved-traditional",
        decision_required: "none"
      }, "Tiny mechanical exception");
      break;
    case "plan-start":
      requireSpecReady(state, event);
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        plan_status: "drafting",
        decision_required: "none"
      }, "Planning started");
      break;
    case "plan-ready":
      requirePhase(state, event, ["planning"]);
      requireSpecReady(state, event);
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        plan_status: "drafted",
        decision_required: "execution-approval"
      }, "Plan is ready for execution approval");
      break;
    case "execution-approved-traditional":
      requirePhase(state, event, ["planning", "execution"]);
      requireSpecReady(state, event);
      next = withBase(state, {
        phase: "execution",
        next_skill: "executing-plans",
        plan_status: "approved",
        execution_mode: "traditional",
        execution_approval: "approved-traditional",
        decision_required: "none"
      }, "Traditional execution approved");
      break;
    case "execution-approved-goal":
      requirePhase(state, event, ["planning", "execution"]);
      requireSpecReady(state, event);
      next = withBase(state, {
        phase: "execution",
        next_skill: "executing-plans",
        plan_status: "approved",
        execution_mode: "codex-goal",
        execution_approval: "approved-goal",
        decision_required: "none"
      }, "Codex Goal mode approved");
      break;
    case "execution-complete":
      requirePhase(state, event, ["execution", "debugging"]);
      next = withBase(state, {
        phase: "verification",
        next_skill: "codex-verification-loop",
        verify_result: "pending",
        decision_required: "none"
      }, "Execution complete; verification required");
      break;
    case "verification-pass":
      requirePhase(state, event, ["verification"]);
      next = withBase(state, {
        phase: "review",
        next_skill: "codex-review-panel",
        verify_result: "pass",
        review_status: "pending",
        decision_required: "none"
      }, "Verification passed; review gate next");
      break;
    case "verification-gap-recorded":
      requirePhase(state, event, ["verification"]);
      next = withBase(state, {
        phase: "review",
        next_skill: "codex-review-panel",
        verify_result: "gap-recorded",
        review_status: "pending",
        decision_required: "none"
      }, "Verification gap recorded; review gate next");
      break;
    case "verification-fail":
      requirePhase(state, event, ["verification"]);
      next = withBase(state, {
        phase: "debugging",
        next_skill: "systematic-debugging",
        verify_result: "fail",
        decision_required: "verification-failure-choice"
      }, "Verification failed; choose fix path");
      break;
    case "review-complete":
      requirePhase(state, event, ["review"]);
      next = withBase(state, {
        phase: "delivery",
        next_skill: "verification-before-completion",
        review_status: "done",
        decision_required: "none"
      }, "Review complete; delivery gate next");
      break;
    case "review-skipped":
      requirePhase(state, event, ["review"]);
      next = withBase(state, {
        phase: "delivery",
        next_skill: "verification-before-completion",
        review_status: "skipped",
        decision_required: "none"
      }, "Review skipped with recorded reason");
      break;
    case "checkpoint-ready":
      next = withBase(state, {
        phase: "handoff",
        next_skill: "codex-git-checkpoint",
        checkpoint_status: "pending",
        decision_required: "none"
      }, "Checkpoint required");
      break;
    case "checkpoint-done":
      next = withBase(state, {
        checkpoint_status: "done",
        decision_required: "none"
      }, "Checkpoint complete");
      break;
    case "checkpoint-deferred":
      next = withBase(state, {
        checkpoint_status: "deferred",
        decision_required: "none"
      }, "Checkpoint deferred with recorded reason");
      break;
    case "delivery-complete":
      requirePhase(state, event, ["delivery", "handoff"]);
      next = withBase(state, {
        phase: "complete",
        next_skill: "none",
        decision_required: "none"
      }, "Delivery complete");
      break;
    case "blocked":
      next = withBase(state, {
        phase: "blocked",
        next_skill: "using-superpowers",
        decision_required: state.decision_required === "none" ? "user-choice" : state.decision_required
      }, "Workflow blocked");
      break;
    case "resume":
      next = withBase(state, {
        phase: state.spec_status === "approved" ? "planning" : "discovery",
        next_skill: state.spec_status === "approved" ? "writing-plans" : "using-superpowers",
        decision_required: "none"
      }, "Workflow resumed");
      break;
    default:
      throw new Error(`Unknown workflow transition: ${event}`);
  }

  saveWorkflowState(root, ctx, next);
  return next;
}

export function nextWorkflowStep(root, ctx) {
  const { state, issues } = workflowStatus(root, ctx);
  if (issues.length) {
    return {
      next: "manual",
      skill: "using-superpowers",
      hint: `workflow-state.yaml needs repair: ${issues.join("; ")}`
    };
  }
  if (state.phase === "complete" || state.next_skill === "none") {
    return { next: "done", skill: "none", hint: "workflow complete" };
  }
  if (state.decision_required && state.decision_required !== "none") {
    return {
      next: "manual",
      skill: state.next_skill,
      hint: `decision required: ${state.decision_required}`
    };
  }
  if (state.auto_next === "false") {
    return {
      next: "manual",
      skill: state.next_skill,
      hint: `phase is ${state.phase}; run ${state.next_skill} manually to continue`
    };
  }
  return {
    next: "auto",
    skill: state.next_skill,
    hint: `phase is ${state.phase}`
  };
}

function sectionPresent(ctx, fileName, heading) {
  const body = sectionContent(readText(path.join(ctx, fileName)), heading);
  return meaningful(body);
}

export function checkWorkflowEntry(root, ctx, phase) {
  const contextDir = ctxFor(root, ctx);
  const status = workflowStatus(root, contextDir);
  const state = status.state;
  const issues = [...status.issues];

  if (phase && state.phase !== phase) issues.push(`${WORKFLOW_FILE} phase=${state.phase}; expected ${phase}`);
  if (!sectionPresent(contextDir, REQUIRED_FILES.spec, "Approval Status")) issues.push("spec.md missing Approval Status");
  if (!sectionPresent(contextDir, REQUIRED_FILES.plan, "Execution Approval")) issues.push("plan-progress.md missing Execution Approval");

  if (phase === "planning" && !["approved", "skipped", "mechanical-exception"].includes(state.spec_status)) {
    issues.push("planning requires spec_status approved, skipped, or mechanical-exception");
  }
  if (phase === "execution" && !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(state.execution_approval)) {
    issues.push("execution requires explicit execution approval");
  }
  if (phase === "delivery" && !["pass", "gap-recorded"].includes(state.verify_result)) {
    issues.push("delivery requires verification pass or recorded gap");
  }

  return {
    ok: issues.length === 0,
    issues,
    state,
    text: [
      `Workflow entry check: ${phase || state.phase}`,
      `phase: ${state.phase}`,
      `next_skill: ${state.next_skill}`,
      `decision_required: ${state.decision_required}`,
      issues.length ? "Issues:" : "Issues: none",
      ...issues.map((issue) => `- ${issue}`),
      "",
      issues.length ? "Result: fail" : "Result: pass"
    ].join("\n")
  };
}

function fileHash(file) {
  return createHash("sha256").update(readText(file), "utf8").digest("hex");
}

export function workflowContextHash(root, ctx, write = false) {
  const contextDir = ctxFor(root, ctx);
  const files = [
    REQUIRED_FILES.current,
    REQUIRED_FILES.spec,
    REQUIRED_FILES.plan,
    REQUIRED_FILES.artifacts,
    REQUIRED_FILES.verification,
    REQUIRED_FILES.handoff
  ];
  const entries = files.map((name) => {
    const file = path.join(contextDir, name);
    return {
      name,
      exists: fs.existsSync(file),
      hash: fs.existsSync(file) ? fileHash(file) : "missing"
    };
  });
  const combined = createHash("sha256")
    .update(entries.map((entry) => `${entry.name}:${entry.hash}`).join("\n"), "utf8")
    .digest("hex");

  if (write) {
    const state = loadWorkflowState(root, contextDir);
    saveWorkflowState(root, contextDir, { ...state, handoff_hash: combined, note: "Context hash refreshed" });
  }

  return { combined, entries };
}

function excerpt(ctx, name, heading, max) {
  const body = sectionContent(readText(path.join(ctx, name)), heading);
  if (!meaningful(body)) return "";
  const clipped = body.length > max ? `${body.slice(0, max - 3)}...` : body;
  return `## ${heading}\n${clipped}`;
}

export function recoverWorkflowContext(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  const status = workflowStatus(root, contextDir);
  const state = status.state;
  const next = status.ok
    ? nextWorkflowStep(root, contextDir)
    : {
        next: "manual",
        skill: "using-superpowers",
        hint: `workflow-state.yaml needs repair: ${status.issues.join("; ")}`
      };
  const hash = workflowContextHash(root, contextDir, false);
  const sections = [
    `Workflow recovery`,
    `phase: ${state.phase || "missing"}`,
    `workflow: ${state.workflow || "missing"}`,
    `next_skill: ${next.skill}`,
    `next: ${next.next}`,
    `decision_required: ${state.decision_required || "missing"}`,
    `spec_status: ${state.spec_status || "missing"}`,
    `plan_status: ${state.plan_status || "missing"}`,
    `execution_mode: ${state.execution_mode || "missing"}`,
    `execution_approval: ${state.execution_approval || "missing"}`,
    `verify_result: ${state.verify_result || "missing"}`,
    `review_status: ${state.review_status || "missing"}`,
    `context_hash: ${hash.combined}`,
    status.issues.length ? `issues: ${status.issues.join("; ")}` : "",
    "",
    "Recovery action:",
    next.next === "manual"
      ? `- Stop for ${(state.decision_required || "none") === "none" ? next.skill : state.decision_required}.`
      : next.next === "done"
        ? "- Workflow is complete; verify final handoff/checkpoint if needed."
        : `- Load ${next.skill} and continue from phase ${state.phase}.`,
    "",
    "State excerpts:",
    excerpt(contextDir, REQUIRED_FILES.spec, "Approval Status", 240),
    excerpt(contextDir, REQUIRED_FILES.plan, "Execution Approval", 240),
    excerpt(contextDir, REQUIRED_FILES.plan, "Current Step", 240),
    excerpt(contextDir, REQUIRED_FILES.handoff, "Next Action", 320)
  ].filter(Boolean);

  return sections.join("\n");
}
