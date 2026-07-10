import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readText } from "./core.mjs";
import { meaningful, sectionContent } from "./markdown.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export const WORKFLOW_FILE = "workflow-state.yaml";

const FIELD_ORDER = [
  "workflow",
  "task_id",
  "task_generation",
  "phase",
  "next_skill",
  "auto_next",
  "decision_required",
  "spec_status",
  "plan_status",
  "execution_mode",
  "execution_approval",
  "loop_review_status",
  "verify_result",
  "review_status",
  "checkpoint_status",
  "resume_phase",
  "resume_skill",
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
    "codex-wayfinder",
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
    "codex-agent-architecture-audit",
    "codex-loop-design-check",
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
  loop_review_status: ["pending", "approved", "not-required"],
  verify_result: ["pending", "pass", "fail", "gap-recorded"],
  review_status: ["pending", "done", "skipped"],
  checkpoint_status: ["pending", "done", "deferred"]
};

ALLOWED.resume_phase = ["none", ...ALLOWED.phase];
ALLOWED.resume_skill = ["none", ...ALLOWED.next_skill.filter((skill) => skill !== "none")];

export { ALLOWED as WORKFLOW_ALLOWED };

export function defaultWorkflowState() {
  return {
    workflow: "standard",
    task_id: "task-1",
    task_generation: "1",
    phase: "discovery",
    next_skill: "codex-codebase-onboarding",
    auto_next: "true",
    decision_required: "none",
    spec_status: "not-started",
    plan_status: "not-started",
    execution_mode: "pending",
    execution_approval: "pending",
    loop_review_status: "pending",
    verify_result: "pending",
    review_status: "pending",
    checkpoint_status: "pending",
    resume_phase: "none",
    resume_skill: "none",
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

export function normalizeWorkflowState(input) {
  const state = { ...(input || {}) };
  if (!state.loop_review_status) {
    const goalMode = state.execution_mode === "codex-goal" ||
      state.execution_approval === "approved-goal";
    const traditionalMode = state.execution_mode === "traditional" ||
      ["approved-traditional", "plan-then-execute-traditional"].includes(state.execution_approval);
    state.loop_review_status = goalMode
      ? "pending"
      : (traditionalMode ? "not-required" : "pending");
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
  const parsed = normalizeWorkflowState(parseWorkflowYaml(fs.readFileSync(file, "utf8")));
  return {
    ...defaultWorkflowState(),
    ...parsed
  };
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

export function validateWorkflowState(input) {
  const state = normalizeWorkflowState(input);
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
  if (state.phase === "blocked" && ["", "none"].includes(state.resume_phase || "none")) {
    issues.push(`${WORKFLOW_FILE} phase=blocked requires resume_phase`);
  }
  return { ok: issues.length === 0, issues, state };
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

export function planArtifactReadinessFromMarkdown(markdown) {
  const readiness = nonTemplateStatusText(sectionContent(markdown, "Artifact Readiness"));
  if (!readiness) return "unknown";
  if (/requirements-only|requirements only|仅需求|需求阶段|not\s+implementation[- ]ready|not\s+ready|不可实施|不可执行|尚未.{0,12}(?:可实施|可执行)|未.{0,12}(?:达到|具备).{0,8}(?:可实施|可执行)/.test(readiness)) {
    return "requirements-only";
  }
  if (/implementation-ready|implementation ready|可实施|可执行/.test(readiness)) return "implementation-ready";
  return "unknown";
}

export function planLoopReviewFromMarkdown(markdown) {
  const review = nonTemplateStatusText(sectionContent(markdown, "Loop Review"));
  if (!review) return "unknown";
  if (/not-required|not required|无需|不需要/.test(review)) return "not-required";
  if (/not\s+(?:approved|complete|completed)|incomplete|未(?:通过|完成|批准|审查)|不(?:通过|批准)|尚未.{0,8}(?:通过|完成|批准|审查)/.test(review)) {
    return "pending";
  }
  if (/approved|complete|completed|通过|已审查|已批准/.test(review)) return "approved";
  if (/pending|not reviewed|未审查|待审查|等待/.test(review)) return "pending";
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
  const planReadiness = planArtifactReadinessFromMarkdown(planMarkdown);
  const planLoopReview = planLoopReviewFromMarkdown(planMarkdown);

  if (phaseAtOrAfterExecution(current.phase) && current.spec_status === "approved" && specDoc === "unknown") {
    issues.push("state mismatch: workflow-state.yaml spec_status=approved, but spec.md has no parseable approval status");
  }

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
  if (phaseAtOrAfterExecution(current.phase) &&
      ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(current.execution_approval) &&
      planApproval === "unknown") {
    issues.push("state mismatch: workflow-state.yaml has execution approval, but plan-progress.md has no parseable execution approval");
  }
  if (current.plan_status === "approved" && planApproval === "pending") {
    issues.push("state mismatch: workflow-state.yaml plan_status=approved, but plan-progress.md says execution is not approved");
  }
  if (["traditional", "codex-goal"].includes(planMode) && current.execution_mode !== "pending" && planMode !== current.execution_mode) {
    issues.push(`state mismatch: plan-progress.md execution mode=${planMode}, but workflow-state.yaml execution_mode=${current.execution_mode}`);
  }
  if (phaseAtOrAfterExecution(current.phase) && current.execution_mode !== "pending" && planMode === "unknown") {
    issues.push("state mismatch: workflow-state.yaml has execution mode, but plan-progress.md has no parseable execution mode");
  }
  if (phaseAtOrAfterExecution(current.phase) &&
      current.spec_status !== "mechanical-exception" &&
      planReadiness !== "implementation-ready") {
    issues.push(`state mismatch: phase=${current.phase} requires Artifact Readiness implementation-ready, got ${planReadiness}`);
  }
  if (phaseAtOrAfterExecution(current.phase) &&
      (current.execution_mode === "codex-goal" || current.execution_approval === "approved-goal") &&
      current.loop_review_status !== "approved") {
    issues.push(`state mismatch: Codex Goal mode requires loop_review_status approved, got ${current.loop_review_status || "missing"}`);
  }
  if (phaseAtOrAfterExecution(current.phase) &&
      (current.execution_mode === "codex-goal" || current.execution_approval === "approved-goal") &&
      planLoopReview !== "approved") {
    issues.push(`state mismatch: Codex Goal mode requires plan Loop Review approved, got ${planLoopReview}`);
  }

  if (current.phase === "complete" && current.next_skill !== "none") {
    issues.push(`state mismatch: phase=complete requires next_skill=none, got ${current.next_skill}`);
  }
  if (["delivery", "handoff", "complete"].includes(current.phase) && !["pass", "gap-recorded"].includes(current.verify_result)) {
    issues.push(`state mismatch: phase=${current.phase} requires verify_result pass or gap-recorded, got ${current.verify_result}`);
  }
  if (current.handoff_hash && current.handoff_hash !== "null") {
    const currentHash = workflowContextHash(root, contextDir, false).combined;
    if (currentHash !== current.handoff_hash) {
      issues.push("state mismatch: saved handoff_hash does not match current workflow context");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    specDoc,
    planApproval,
    planMode,
    planReadiness,
    planLoopReview
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
  const parsed = normalizeWorkflowState(parseWorkflowYaml(readText(file)));
  const state = {
    ...defaultWorkflowState(),
    ...parsed
  };
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

function requirePlanImplementationReady(root, ctx, state, event) {
  if (state.spec_status === "mechanical-exception") return;
  const contextDir = ctxFor(root, ctx);
  const readiness = planArtifactReadinessFromMarkdown(readText(path.join(contextDir, REQUIRED_FILES.plan)));
  if (readiness !== "implementation-ready") {
    throw new Error(`Cannot transition ${event}: Artifact Readiness must be implementation-ready, got ${readiness}`);
  }
}

function requireGoalLoopReview(root, ctx, state, event) {
  if (state.loop_review_status !== "approved") {
    throw new Error(`Cannot transition ${event}: loop_review_status must be approved`);
  }
  const contextDir = ctxFor(root, ctx);
  const planReview = planLoopReviewFromMarkdown(readText(path.join(contextDir, REQUIRED_FILES.plan)));
  if (planReview !== "approved") {
    throw new Error(`Cannot transition ${event}: plan Loop Review must be approved, got ${planReview}`);
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
    case "new-task": {
      const generation = (Number.parseInt(state.task_generation || "0", 10) || 0) + 1;
      next = withBase(state, {
        task_id: `task-${generation}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        task_generation: String(generation),
        phase: "discovery",
        next_skill: "using-superpowers",
        auto_next: "true",
        decision_required: "none",
        spec_status: "not-started",
        plan_status: "not-started",
        execution_mode: "pending",
        execution_approval: "pending",
        loop_review_status: "pending",
        verify_result: "pending",
        review_status: "pending",
        checkpoint_status: "pending",
        resume_phase: "none",
        resume_skill: "none",
        handoff_hash: "null"
      }, "New task started");
      break;
    }
    case "discovery-start":
      if (state.phase === "complete") {
        throw new Error("Cannot transition discovery-start from complete; run workflow-state transition new-task");
      }
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
        loop_review_status: "not-required",
        decision_required: "none"
      }, "Tiny mechanical exception");
      break;
    case "plan-start":
      requireSpecReady(state, event);
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        plan_status: "drafting",
        loop_review_status: "pending",
        decision_required: "none"
      }, "Planning started");
      break;
    case "plan-ready":
      requirePhase(state, event, ["planning"]);
      requireSpecReady(state, event);
      requirePlanImplementationReady(root, ctx, state, event);
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
      requirePlanImplementationReady(root, ctx, state, event);
      next = withBase(state, {
        phase: "execution",
        next_skill: "executing-plans",
        plan_status: "approved",
        execution_mode: "traditional",
        execution_approval: "approved-traditional",
        loop_review_status: "not-required",
        decision_required: "none"
      }, "Traditional execution approved");
      break;
    case "loop-review-approved": {
      requirePhase(state, event, ["planning"]);
      const contextDir = ctxFor(root, ctx);
      const planReview = planLoopReviewFromMarkdown(readText(path.join(contextDir, REQUIRED_FILES.plan)));
      if (planReview !== "approved") {
        throw new Error(`Cannot transition ${event}: plan Loop Review must be approved, got ${planReview}`);
      }
      next = withBase(state, {
        phase: "planning",
        next_skill: "writing-plans",
        loop_review_status: "approved",
        decision_required: "none"
      }, "Goal loop design review approved");
      break;
    }
    case "execution-approved-goal":
      requirePhase(state, event, ["planning", "execution"]);
      requireSpecReady(state, event);
      requirePlanImplementationReady(root, ctx, state, event);
      requireGoalLoopReview(root, ctx, state, event);
      next = withBase(state, {
        phase: "execution",
        next_skill: "executing-plans",
        plan_status: "approved",
        execution_mode: "codex-goal",
        execution_approval: "approved-goal",
        loop_review_status: "approved",
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
      if (!["done", "deferred"].includes(state.checkpoint_status)) {
        throw new Error("Cannot transition delivery-complete: checkpoint_status must be done or deferred");
      }
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
        resume_phase: state.phase,
        resume_skill: state.next_skill,
        decision_required: state.decision_required === "none" ? "user-choice" : state.decision_required
      }, "Workflow blocked");
      break;
    case "resume":
      requirePhase(state, event, ["blocked"]);
      if (!state.resume_phase || state.resume_phase === "none") {
        throw new Error("Cannot transition resume: blocked state has no resume_phase");
      }
      next = withBase(state, {
        phase: state.resume_phase,
        next_skill: state.resume_skill && state.resume_skill !== "none" ? state.resume_skill : "using-superpowers",
        resume_phase: "none",
        resume_skill: "none",
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
  if (phase === "execution" && state.spec_status !== "mechanical-exception") {
    const readiness = planArtifactReadinessFromMarkdown(readText(path.join(contextDir, REQUIRED_FILES.plan)));
    if (readiness !== "implementation-ready") {
      issues.push(`execution requires Artifact Readiness implementation-ready, got ${readiness}`);
    }
  }
  if (phase === "execution" &&
      (state.execution_mode === "codex-goal" || state.execution_approval === "approved-goal") &&
      state.loop_review_status !== "approved") {
    issues.push(`Codex Goal execution requires loop_review_status approved, got ${state.loop_review_status || "missing"}`);
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
