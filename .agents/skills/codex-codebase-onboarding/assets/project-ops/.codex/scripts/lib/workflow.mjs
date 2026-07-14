import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readText, writeTextAtomic } from "./core.mjs";
import { meaningful, replaceSection, sectionContent, sectionFields, withoutSection } from "./markdown.mjs";
import { stableFingerprint, withRuntimeLock } from "./runtime.mjs";
import { REQUIRED_FILES, TEMPLATES } from "./templates.mjs";

export const WORKFLOW_FILE = "workflow-state.yaml";

export const DECISION_TRANSITIONS = Object.freeze({
  "written-spec-approval": ["spec-approved", "spec-skipped"],
  "execution-approval": ["execution-approved-traditional", "execution-approved-goal"],
  "verification-gap-acceptance": ["verification-gap-accepted", "verification-retry"],
  "verification-failure-choice": ["verification-retry", "verification-gap-accepted"],
  "user-choice": ["resume"]
});

const DECISION_EVIDENCE_FILES = Object.freeze({
  "written-spec-approval": {
    evidenceFile: REQUIRED_FILES.spec,
    targetFiles: [REQUIRED_FILES.spec]
  },
  "execution-approval": {
    evidenceFile: REQUIRED_FILES.plan,
    targetFiles: [REQUIRED_FILES.plan]
  },
  "verification-gap-acceptance": {
    evidenceFile: REQUIRED_FILES.verification,
    targetFiles: [REQUIRED_FILES.verification]
  },
  "verification-failure-choice": {
    evidenceFile: REQUIRED_FILES.verification,
    targetFiles: [REQUIRED_FILES.verification]
  },
  "user-choice": {
    evidenceFile: REQUIRED_FILES.handoff,
    targetFiles: [REQUIRED_FILES.current, REQUIRED_FILES.handoff]
  }
});

function canonicalDecisionTargetFiles(root, contextDir, decision, contentOverrides = new Map()) {
  const config = DECISION_EVIDENCE_FILES[decision];
  const files = config.targetFiles.map((name) => ({
    name,
    content: contentOverrides.has(name)
      ? contentOverrides.get(name)
      : withoutSection(readText(path.join(contextDir, name)), "Workflow Decision")
  }));
  if (decision !== "execution-approval") return files;
  const planEntry = files.find((entry) => entry.name === REQUIRED_FILES.plan);
  const reference = planReferenceFromMarkdown(planEntry?.content || "");
  if (!reference) return files;
  const absolute = path.isAbsolute(reference) ? path.resolve(reference) : path.resolve(root, reference);
  if (!pathIsInside(root, absolute)) {
    files.push({ name: reference, content: "[outside-project]" });
    return files;
  }
  files.push({
    name: path.relative(root, absolute).replace(/\\/g, "/"),
    content: fs.existsSync(absolute)
      ? withoutSection(readText(absolute), "Workflow Decision")
      : "[missing]"
  });
  return files;
}

export function canonicalDecisionEvidenceStatus(root, ctx, state, decision, event) {
  const config = DECISION_EVIDENCE_FILES[decision];
  if (!config || !(DECISION_TRANSITIONS[decision] || []).includes(event)) {
    return { ok: false, reason: `unsupported decision transition: ${decision}/${event}` };
  }
  const contextDir = ctxFor(root, ctx);
  const evidenceMarkdown = readText(path.join(contextDir, config.evidenceFile));
  const parsed = sectionFields(evidenceMarkdown, "Workflow Decision");
  if (parsed.duplicates.length) {
    return { ok: false, reason: `Workflow Decision has duplicate field(s): ${parsed.duplicates.join(", ")}` };
  }
  if (parsed.invalid.length) {
    return { ok: false, reason: "Workflow Decision must contain only exact '- key: value' fields" };
  }
  const fields = parsed.fields;
  for (const name of ["schema", "decision", "transition", "task_id", "task_generation", "target_hash"]) {
    if (!fields[name]) return { ok: false, reason: `Workflow Decision missing field: ${name}` };
  }
  if (fields.schema !== "dong-skills.workflow-decision.v1") {
    return { ok: false, reason: `Workflow Decision schema mismatch: ${fields.schema}` };
  }
  if (fields.decision !== decision) {
    return { ok: false, reason: `Workflow Decision decision mismatch: ${fields.decision}` };
  }
  if (fields.transition !== event) {
    return { ok: false, reason: `Workflow Decision transition mismatch: ${fields.transition}` };
  }
  if (fields.task_id !== state.task_id || String(fields.task_generation) !== String(state.task_generation)) {
    return { ok: false, reason: "Workflow Decision task identity mismatch" };
  }
  const files = canonicalDecisionTargetFiles(root, contextDir, decision);
  const targetHash = stableFingerprint({
    task_id: state.task_id,
    task_generation: String(state.task_generation),
    decision,
    files
  });
  if (fields.target_hash !== targetHash) {
    return { ok: false, reason: "Workflow Decision target_hash does not match the current decision target" };
  }
  return { ok: true, reason: "canonical Workflow Decision evidence matches" };
}

const DECISION_EVENTS = new Set(Object.values(DECISION_TRANSITIONS).flat());

function decisionForEvidenceWrite(state, event) {
  const pending = String(state.decision_required || "none");
  if (pending !== "none") {
    if ((DECISION_TRANSITIONS[pending] || []).includes(event)) return pending;
    throw new Error(`Cannot record decision for ${event}: pending decision ${pending} allows only ${(DECISION_TRANSITIONS[pending] || []).join(", ") || "no registered transition"}`);
  }
  const candidates = Object.entries(DECISION_TRANSITIONS)
    .filter(([, events]) => events.includes(event))
    .map(([decision]) => decision);
  if (candidates.length !== 1) {
    throw new Error(`Cannot record decision for ${event}: no unambiguous pending decision is recorded`);
  }
  return candidates[0];
}

export function writeCanonicalDecisionEvidence(root, ctx, event) {
  return withWorkflowStateLock(root, ctx, () => {
    const state = loadWorkflowState(root, ctx);
    const decision = decisionForEvidenceWrite(state, event);
    const config = DECISION_EVIDENCE_FILES[decision];
    const contextDir = ctxFor(root, ctx);
    const evidenceFile = path.join(contextDir, config.evidenceFile);
    const original = readText(evidenceFile);
    const base = withoutSection(original, "Workflow Decision");
    const files = canonicalDecisionTargetFiles(
      root,
      contextDir,
      decision,
      new Map([[config.evidenceFile, base]])
    );
    const targetHash = stableFingerprint({
      task_id: state.task_id,
      task_generation: String(state.task_generation),
      decision,
      files
    });
    const markdown = replaceSection(base, "Workflow Decision", [
      "- schema: dong-skills.workflow-decision.v1",
      `- decision: ${decision}`,
      `- transition: ${event}`,
      `- task_id: ${state.task_id}`,
      `- task_generation: ${state.task_generation}`,
      `- target_hash: ${targetHash}`
    ].join("\n"));

    try {
      writeTextAtomic(evidenceFile, markdown);
      const status = canonicalDecisionEvidenceStatus(root, contextDir, state, decision, event);
      if (!status.ok) throw new Error(status.reason);
    } catch (error) {
      writeTextAtomic(evidenceFile, original);
      throw error;
    }

    return {
      decision,
      event,
      evidenceFile,
      targetHash
    };
  });
}

function decisionForTransition(state, event) {
  if ((DECISION_TRANSITIONS[state.decision_required] || []).includes(event)) {
    return state.decision_required;
  }
  const candidates = Object.entries(DECISION_TRANSITIONS)
    .filter(([, events]) => events.includes(event))
    .map(([decision]) => decision);
  return candidates.length === 1 ? candidates[0] : "";
}

function applyDecisionDocumentResolution(root, ctx, state, event) {
  const contextDir = ctxFor(root, ctx);
  const changes = [];
  const updateFile = (name, update) => {
    const file = path.join(contextDir, name);
    const before = readText(file);
    const after = update(before);
    if (after === before) return;
    writeTextAtomic(file, after);
    changes.push({ file, before });
  };
  if (DECISION_EVENTS.has(event)) {
    const decision = decisionForTransition(state, event);
    const evidenceFile = DECISION_EVIDENCE_FILES[decision]?.evidenceFile;
    if (evidenceFile) {
      updateFile(evidenceFile, (markdown) => withoutSection(markdown, "Workflow Decision"));
    }
  }
  if (event === "spec-approved" || event === "spec-skipped") {
    const status = event === "spec-approved" ? "approved" : "skipped";
    updateFile(REQUIRED_FILES.spec, (markdown) => replaceSection(markdown, "Approval Status", [
      `- status: ${status}`,
      "- approved_by: user"
    ].join("\n")));
  } else if (event === "execution-approved-traditional" || event === "execution-approved-goal") {
    const mode = event === "execution-approved-goal" ? "codex-goal" : "traditional";
    updateFile(REQUIRED_FILES.plan, (markdown) => replaceSection(
      replaceSection(markdown, "Execution Approval", [
        "- status: approved",
        "- approved_by: user",
        `- mode: ${mode}`
      ].join("\n")),
      "Execution Mode",
      `- mode: ${mode}`
    ));
  } else if (["brainstorming-start", "spec-living"].includes(event)) {
    updateFile(REQUIRED_FILES.spec, (markdown) => replaceSection(
      withoutSection(markdown, "Workflow Decision"),
      "Approval Status",
      "- status: living-draft"
    ));
    updateFile(REQUIRED_FILES.plan, (markdown) => replaceSection(
      replaceSection(withoutSection(markdown, "Workflow Decision"), "Execution Approval", "- status: pending"),
      "Execution Mode",
      "- mode: pending"
    ));
  } else if (event === "plan-start") {
    updateFile(REQUIRED_FILES.plan, (markdown) => replaceSection(
      replaceSection(withoutSection(markdown, "Workflow Decision"), "Execution Approval", "- status: pending"),
      "Execution Mode",
      "- mode: pending"
    ));
  }
  if (!changes.length) return null;
  return () => {
    for (const { file, before } of changes.reverse()) writeTextAtomic(file, before);
  };
}

const FIELD_ORDER = [
  "workflow",
  "work_lane",
  "task_id",
  "task_generation",
  "document_hash_mode",
  "phase",
  "next_skill",
  "auto_next",
  "decision_required",
  "spec_status",
  "plan_status",
  "approved_spec_hash",
  "approved_plan_hash",
  "execution_mode",
  "execution_approval",
  "loop_review_status",
  "verify_result",
  "verification_gap_status",
  "review_status",
  "checkpoint_status",
  "verification_evidence_hash",
  "review_evidence_hash",
  "resume_phase",
  "resume_skill",
  "debug_return_phase",
  "debug_return_skill",
  "handoff_hash",
  "handoff_task_id",
  "handoff_task_generation",
  "updated_at",
  "note"
];

const ALLOWED = {
  workflow: ["standard", "hotfix", "tweak"],
  work_lane: ["lane-0", "lane-1", "lane-2", "lane-3"],
  document_hash_mode: ["legacy-v0", "normalized-v1", "approval-contract-v2"],
  phase: [
    "discovery",
    "wayfinding",
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
    "verification-gap-acceptance",
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
  verification_gap_status: ["not-required", "pending", "accepted"],
  review_status: ["pending", "done", "skipped"],
  checkpoint_status: ["pending", "done", "deferred"]
};

ALLOWED.resume_phase = ["none", ...ALLOWED.phase];
ALLOWED.resume_skill = ["none", ...ALLOWED.next_skill.filter((skill) => skill !== "none")];
ALLOWED.debug_return_phase = ["none", "execution"];
ALLOWED.debug_return_skill = ["none", "executing-plans"];

export { ALLOWED as WORKFLOW_ALLOWED };

export function defaultWorkflowState() {
  return {
    workflow: "standard",
    work_lane: "lane-1",
    task_id: "task-1",
    task_generation: "1",
    document_hash_mode: "approval-contract-v2",
    phase: "discovery",
    next_skill: "codex-codebase-onboarding",
    auto_next: "true",
    decision_required: "none",
    spec_status: "not-started",
    plan_status: "not-started",
    approved_spec_hash: "none",
    approved_plan_hash: "none",
    execution_mode: "pending",
    execution_approval: "pending",
    loop_review_status: "pending",
    verify_result: "pending",
    verification_gap_status: "not-required",
    review_status: "pending",
    checkpoint_status: "pending",
    verification_evidence_hash: "none",
    review_evidence_hash: "none",
    resume_phase: "none",
    resume_skill: "none",
    debug_return_phase: "none",
    debug_return_skill: "none",
    handoff_hash: "null",
    handoff_task_id: "none",
    handoff_task_generation: "none",
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
  if (!state.document_hash_mode) state.document_hash_mode = "legacy-v0";
  if (!state.work_lane) state.work_lane = "lane-1";
  if (!state.verification_gap_status) {
    state.verification_gap_status = state.verify_result === "gap-recorded" ? "pending" : "not-required";
  }
  if (!state.loop_review_status) {
    const goalMode = state.execution_mode === "codex-goal" ||
      state.execution_approval === "approved-goal";
    const traditionalMode = state.execution_mode === "traditional" ||
      ["approved-traditional", "plan-then-execute-traditional"].includes(state.execution_approval);
    state.loop_review_status = goalMode
      ? "pending"
      : (traditionalMode ? "not-required" : "pending");
  }
  if (!state.verification_evidence_hash) state.verification_evidence_hash = "none";
  if (!state.review_evidence_hash) state.review_evidence_hash = "none";
  if (!state.approved_spec_hash) state.approved_spec_hash = "none";
  if (!state.approved_plan_hash) state.approved_plan_hash = "none";
  if (!state.debug_return_phase) state.debug_return_phase = "none";
  if (!state.debug_return_skill) state.debug_return_skill = "none";
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
    writeTextAtomic(file, serializeWorkflowState(defaultWorkflowState()));
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

function saveWorkflowStateUnlocked(root, ctx, state) {
  const contextDir = ctxFor(root, ctx);
  const file = ensureWorkflowState(root, contextDir);
  writeTextAtomic(file, serializeWorkflowState({
    ...defaultWorkflowState(),
    ...state,
    updated_at: new Date().toISOString()
  }));
  return file;
}

function withWorkflowStateLock(root, ctx, operation) {
  const contextDir = ctxFor(root, ctx);
  return withRuntimeLock(contextDir, "workflow-state", operation);
}

export function saveWorkflowState(root, ctx, state) {
  return withWorkflowStateLock(root, ctx, () => saveWorkflowStateUnlocked(root, ctx, state));
}

export function setWorkflowStateField(root, ctx, field, value) {
  return withWorkflowStateLock(root, ctx, () => {
    const state = loadWorkflowState(root, ctx);
    const next = { ...state, [field]: value, note: `Manually set ${field}` };
    const validation = validateWorkflowState(next);
    if (!validation.ok) throw new Error(validation.issues.join("; "));
    saveWorkflowStateUnlocked(root, ctx, next);
    return next;
  });
}

export function migrateWorkflowState(root, ctx) {
  return withWorkflowStateLock(root, ctx, () => {
    const contextDir = ctxFor(root, ctx);
    const file = workflowPath(contextDir);
    if (!fs.existsSync(file)) {
      throw new Error(`${WORKFLOW_FILE} is missing; migration only upgrades an existing state file.`);
    }
    const parsed = parseWorkflowYaml(fs.readFileSync(file, "utf8"));
    const migrated = {
      ...defaultWorkflowState(),
      ...normalizeWorkflowState(parsed),
      updated_at: parsed.updated_at || new Date().toISOString(),
      note: parsed.note || "Workflow schema migrated"
    };
    const evidence = workflowEvidenceStatus(root, contextDir);
    if (!parsed.verification_evidence_hash &&
        ["pass", "fail", "gap-recorded"].includes(migrated.verify_result) &&
        evidence.hasVerificationEvidence) {
      migrated.verification_evidence_hash = evidence.hash;
    }
    if (!parsed.review_evidence_hash &&
        ["done", "skipped"].includes(migrated.review_status) &&
        evidence.hasReviewEvidence) {
      migrated.review_evidence_hash = evidence.hash;
    }
    if (!parsed.approved_spec_hash && migrated.spec_status === "approved") {
      migrated.approved_spec_hash = documentHash(contextDir, REQUIRED_FILES.spec);
    }
    if (!parsed.approved_plan_hash &&
        migrated.plan_status === "approved" &&
        ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(migrated.execution_approval)) {
      migrated.approved_plan_hash = approvedDocumentHash(root, contextDir, REQUIRED_FILES.plan, migrated.document_hash_mode);
    }
    if (migrated.document_hash_mode === "legacy-v0") {
      const rebindCurrentHash = (field, name) => {
        const legacyStored = String(parsed[field] || "none");
        if (!/^[a-f0-9]{64}$/.test(legacyStored)) return;
        const stored = String(migrated[field] || "none");
        if (!/^[a-f0-9]{64}$/.test(stored)) return;
        const documentFile = path.join(contextDir, name);
        const raw = fs.existsSync(documentFile) ? rawFileHash(documentFile) : "none";
        const relative = path.relative(root, documentFile).replace(/\\/g, "/");
        const stateRelative = path.relative(root, file).replace(/\\/g, "/");
        let matchesRecordedRevision = false;
        try {
          const commits = execFileSync("git", [
            "log",
            "--format=%H",
            `-S${field}: ${legacyStored}`,
            "--",
            stateRelative
          ], {
            cwd: root,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"]
          }).trim().split(/\r?\n/).filter(Boolean);
          for (const commit of commits) {
            const recordedState = execFileSync("git", ["show", `${commit}:${stateRelative}`], {
              cwd: root,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "ignore"]
            });
            if (!new RegExp(`^${field}: ${legacyStored}$`, "m").test(recordedState)) continue;
            const recordedDocument = execFileSync("git", ["show", `${commit}:${relative}`], {
              cwd: root,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "ignore"]
            });
            if (normalizedTextHash(recordedDocument) === documentHash(contextDir, name)) {
              matchesRecordedRevision = true;
              break;
            }
          }
        } catch {}
        if (raw !== legacyStored && !matchesRecordedRevision) {
          throw new Error(`Cannot migrate ${field}: current ${name} does not match the legacy hash; repair or explicitly reapprove the document before migration`);
        }
        migrated[field] = documentHash(contextDir, name);
      };
      if (migrated.spec_status === "approved") {
        rebindCurrentHash("approved_spec_hash", REQUIRED_FILES.spec);
      }
      if (migrated.plan_status === "approved" &&
          ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(migrated.execution_approval)) {
        rebindCurrentHash("approved_plan_hash", REQUIRED_FILES.plan);
      }
      if (["pass", "fail", "gap-recorded"].includes(migrated.verify_result) &&
          migrated.review_status === "pending") {
        rebindCurrentHash("verification_evidence_hash", REQUIRED_FILES.verification);
      }
      if (["done", "skipped"].includes(migrated.review_status)) {
        rebindCurrentHash("review_evidence_hash", REQUIRED_FILES.verification);
      }
      migrated.document_hash_mode = "normalized-v1";
    }
    if (migrated.document_hash_mode === "normalized-v1") {
      if (migrated.plan_status === "approved" &&
          ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(migrated.execution_approval)) {
        const stored = String(migrated.approved_plan_hash || "none");
        if (/^[a-f0-9]{64}$/.test(stored)) {
          const progressFile = path.join(contextDir, REQUIRED_FILES.plan);
          const currentProgress = readText(progressFile);
          const currentContract = planContractHash(root, contextDir, currentProgress);
          let equivalent = normalizedTextHash(currentProgress) === stored;
          if (!equivalent) {
            const relative = path.relative(root, progressFile).replace(/\\/g, "/");
            const stateRelative = path.relative(root, file).replace(/\\/g, "/");
            try {
              const commits = execFileSync("git", [
                "log",
                "--format=%H",
                `-Sapproved_plan_hash: ${stored}`,
                "--",
                stateRelative
              ], {
                cwd: root,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"]
              }).trim().split(/\r?\n/).filter(Boolean);
              for (const commit of commits) {
                const recordedState = execFileSync("git", ["show", `${commit}:${stateRelative}`], {
                  cwd: root,
                  encoding: "utf8",
                  stdio: ["ignore", "pipe", "ignore"]
                });
                if (!new RegExp(`^approved_plan_hash: ${stored}$`, "m").test(recordedState)) continue;
                const recordedProgress = execFileSync("git", ["show", `${commit}:${relative}`], {
                  cwd: root,
                  encoding: "utf8",
                  stdio: ["ignore", "pipe", "ignore"]
                });
                if (normalizedTextHash(recordedProgress) !== stored) continue;
                const recordedContract = planContractHash(
                  root,
                  contextDir,
                  recordedProgress,
                  (linkedRelative) => {
                    try {
                      return execFileSync("git", ["show", `${commit}:${linkedRelative}`], {
                        cwd: root,
                        encoding: "utf8",
                        stdio: ["ignore", "pipe", "ignore"]
                      });
                    } catch {
                      return null;
                    }
                  }
                );
                if (recordedContract === currentContract) {
                  equivalent = true;
                  break;
                }
              }
            } catch {}
          }
          if (!equivalent) {
            throw new Error("Cannot migrate approved_plan_hash: current approved plan contract differs from the recorded approval; return to planning and obtain fresh approval");
          }
          migrated.approved_plan_hash = currentContract;
        }
      }
      migrated.document_hash_mode = "approval-contract-v2";
    }
    const validation = validateWorkflowState(migrated);
    if (!validation.ok) {
      throw new Error(`Cannot migrate ${WORKFLOW_FILE}: ${validation.issues.join("; ")}`);
    }
    const before = fs.readFileSync(file, "utf8");
    const after = serializeWorkflowState(migrated);
    if (before !== after) writeTextAtomic(file, after);
    return {
      changed: before !== after,
      addedFields: FIELD_ORDER.filter((field) => !Object.prototype.hasOwnProperty.call(parsed, field))
    };
  });
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
    if ([
      "updated_at",
      "note",
      "handoff_hash",
      "handoff_task_id",
      "handoff_task_generation",
      "approved_spec_hash",
      "approved_plan_hash",
      "verification_evidence_hash",
      "review_evidence_hash"
    ].includes(field)) continue;
    validateEnum(state, issues, field);
  }
  for (const field of [
    "approved_spec_hash",
    "approved_plan_hash",
    "verification_evidence_hash",
    "review_evidence_hash"
  ]) {
    if (!/^(?:none|[a-f0-9]{64})$/.test(String(state[field] || ""))) {
      issues.push(`${WORKFLOW_FILE} invalid ${field}: ${state[field] || "missing"}`);
    }
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
  const hasDebugReturnPhase = state.debug_return_phase !== "none";
  const hasDebugReturnSkill = state.debug_return_skill !== "none";
  if (hasDebugReturnPhase !== hasDebugReturnSkill) {
    issues.push(`${WORKFLOW_FILE} debug_return_phase and debug_return_skill must be set or cleared together`);
  }
  if (hasDebugReturnPhase && !["debugging", "blocked"].includes(state.phase)) {
    issues.push(`${WORKFLOW_FILE} debug return state is valid only while debugging or temporarily blocked`);
  }
  if (["review", "delivery", "handoff", "complete"].includes(state.phase) &&
      ["pass", "gap-recorded"].includes(state.verify_result) &&
      !/^[a-f0-9]{64}$/.test(String(state.verification_evidence_hash || ""))) {
    issues.push(`state mismatch: phase=${state.phase} requires verification_evidence_hash`);
  }
  if (["delivery", "handoff", "complete"].includes(state.phase) &&
      !/^[a-f0-9]{64}$/.test(String(state.review_evidence_hash || ""))) {
    issues.push(`state mismatch: phase=${state.phase} requires review_evidence_hash`);
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
  const structured = sectionFields(markdown, "Approval Status");
  if (!structured.duplicates.length && !structured.invalid.length && structured.fields.status) {
    if (["living-draft", "pending-approval", "approved", "skipped", "mechanical-exception"].includes(structured.fields.status)) {
      return structured.fields.status;
    }
    return "unknown";
  }
  const approval = nonTemplateStatusText(sectionContent(markdown, "Approval Status"));
  if (!approval) return "unknown";
  if (/living draft|not approved|未批准|草稿/.test(approval)) return "living-draft";
  if (/pending written-spec approval|pending approval|待.*审批|等待.*审批/.test(approval)) return "pending-approval";
  if (/approved by user|用户.*批准|已批准/.test(approval)) return "approved";
  if (/skipped|跳过/.test(approval)) return "skipped";
  if (/mechanical exception|机械例外/.test(approval)) return "mechanical-exception";
  return "unknown";
}

function planApprovalFromMarkdown(markdown) {
  const structured = sectionFields(markdown, "Execution Approval");
  if (!structured.duplicates.length && !structured.invalid.length && structured.fields.status) {
    if (structured.fields.status === "pending") return "pending";
    if (structured.fields.status === "approved" && structured.fields.mode === "traditional") return "approved-traditional";
    if (structured.fields.status === "approved" && structured.fields.mode === "codex-goal") return "approved-goal";
    return "unknown";
  }
  const approval = nonTemplateStatusText(sectionContent(markdown, "Execution Approval"));
  if (!approval) return "unknown";
  if (/pending|not approved|尚未批准|未批准|待.*批准|等待.*批准/.test(approval)) return "pending";
  if (/approved by user.*codex goal|approved.*goal|approved-goal|codex goal.*批准/.test(approval)) return "approved-goal";
  if (/approved by user.*traditional|approved.*traditional|approved-traditional|traditional.*批准|逐项执行.*批准/.test(approval)) return "approved-traditional";
  if (/plan-then-execute|先计划.*执行|计划后执行/.test(approval)) return "plan-then-execute-traditional";
  return "unknown";
}

function planModeFromMarkdown(markdown) {
  const structured = sectionFields(markdown, "Execution Mode");
  if (!structured.duplicates.length && !structured.invalid.length && structured.fields.mode) {
    if (["pending", "traditional", "codex-goal"].includes(structured.fields.mode)) return structured.fields.mode;
    return "unknown";
  }
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

function normalizeWayfinderReference(value) {
  let reference = String(value || "").trim();
  if (reference.startsWith("`") && reference.endsWith("`")) {
    reference = reference.slice(1, -1).trim();
  }
  if (/^(?:none|not active|inactive|closed|无|暂无|未启用|已完成)[。.]?$/i.test(reference)) {
    return "";
  }
  const markdownLink = reference.match(/^\[[^\]]+\]\(([^)]+)\)$/);
  return markdownLink ? markdownLink[1].trim() : reference;
}

function activeWayfinderReference(contextDir) {
  for (const name of [REQUIRED_FILES.current, REQUIRED_FILES.handoff]) {
    const source = readText(path.join(contextDir, name));
    const match = source.match(/(?:^|\n)\s*(?:[-*]\s*)?(?:Active Wayfinder|当前 Wayfinder)\s*:\s*`?([^`\r\n]+)`?/i);
    if (match) return normalizeWayfinderReference(match[1]);
  }
  return "";
}

function pathIsInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
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
  const wayfinderReference = activeWayfinderReference(contextDir);

  if (current.phase === "wayfinding" && current.next_skill !== "codex-wayfinder") {
    issues.push(`state mismatch: phase=wayfinding requires next_skill=codex-wayfinder, got ${current.next_skill}`);
  }
  if (current.phase === "wayfinding" && !wayfinderReference) {
    issues.push("state mismatch: phase=wayfinding requires an active Wayfinder marker");
  }
  if (wayfinderReference && current.phase !== "wayfinding") {
    issues.push(`state mismatch: active Wayfinder requires phase=wayfinding, got ${current.phase}`);
  }

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
  if (current.spec_status === "approved") {
    const currentSpecHash = documentHash(contextDir, REQUIRED_FILES.spec);
    if (!/^[a-f0-9]{64}$/.test(String(current.approved_spec_hash || ""))) {
      issues.push("state mismatch: approved spec is missing approved_spec_hash; migrate or reapprove the written spec");
    } else if (currentSpecHash !== current.approved_spec_hash) {
      issues.push("state mismatch: spec.md changed after written-spec approval; reopen scope and obtain fresh approval");
    }
  }

  if (planApproval === "pending" && ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(current.execution_approval)) {
    issues.push(`state mismatch: workflow-state.yaml execution_approval=${current.execution_approval}, but plan-progress.md execution approval is pending`);
  }
  const stagedPlanThenExecute = planApproval === "plan-then-execute-traditional" &&
    current.execution_approval === "pending" &&
    current.decision_required === "execution-approval" &&
    current.phase === "planning";
  if (["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(planApproval) &&
      current.execution_approval === "pending" &&
      !stagedPlanThenExecute) {
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
  if (current.plan_status === "approved" &&
      ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(current.execution_approval)) {
    const currentPlanHash = approvedDocumentHash(root, contextDir, REQUIRED_FILES.plan, current.document_hash_mode);
    if (!/^[a-f0-9]{64}$/.test(String(current.approved_plan_hash || ""))) {
      issues.push("state mismatch: approved plan is missing approved_plan_hash; migrate or obtain fresh execution approval");
    } else if (currentPlanHash !== current.approved_plan_hash) {
      issues.push("state mismatch: approved plan contract changed after execution approval; return to planning and obtain fresh approval");
    }
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
  if (["delivery", "handoff", "complete"].includes(current.phase) &&
      current.verify_result === "gap-recorded" &&
      current.verification_gap_status !== "accepted") {
    issues.push(`state mismatch: phase=${current.phase} requires accepted verification gap status, got ${current.verification_gap_status}`);
  }
  if (["delivery", "handoff", "complete"].includes(current.phase) &&
      !["done", "skipped"].includes(current.review_status)) {
    issues.push(`state mismatch: phase=${current.phase} requires review_status done or skipped, got ${current.review_status}`);
  }
  if (["delivery", "handoff", "complete"].includes(current.phase) &&
      ["lane-2", "lane-3"].includes(current.work_lane) &&
      current.review_status !== "done") {
    issues.push(`state mismatch: ${current.work_lane} delivery requires completed review`);
  }
  if (["delivery", "handoff", "complete"].includes(current.phase) &&
      /^[a-f0-9]{64}$/.test(String(current.review_evidence_hash || ""))) {
    const evidence = workflowEvidenceStatus(root, contextDir);
    if (evidence.hash !== current.review_evidence_hash) {
      issues.push("state mismatch: verification.md changed after review closure");
    }
  }
  if (current.handoff_hash && current.handoff_hash !== "null" &&
      (current.handoff_task_id !== current.task_id ||
       String(current.handoff_task_generation) !== String(current.task_generation))) {
    issues.push("state mismatch: saved handoff hash task identity does not match current workflow task identity");
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

const RESET_AFTER_SCOPE_CHANGE = Object.freeze({
  plan_status: "not-started",
  approved_spec_hash: "none",
  approved_plan_hash: "none",
  execution_mode: "pending",
  execution_approval: "pending",
  loop_review_status: "pending",
  verify_result: "pending",
  verification_gap_status: "not-required",
  review_status: "pending",
  checkpoint_status: "pending",
  verification_evidence_hash: "none",
  review_evidence_hash: "none",
  debug_return_phase: "none",
  debug_return_skill: "none"
});

const RESET_AFTER_PLAN_CHANGE = Object.freeze({
  approved_plan_hash: "none",
  execution_mode: "pending",
  execution_approval: "pending",
  loop_review_status: "pending",
  verify_result: "pending",
  verification_gap_status: "not-required",
  review_status: "pending",
  checkpoint_status: "pending",
  verification_evidence_hash: "none",
  review_evidence_hash: "none",
  debug_return_phase: "none",
  debug_return_skill: "none"
});

const PRE_EXECUTION_PHASES = Object.freeze([
  "discovery",
  "wayfinding",
  "brainstorming",
  "spec",
  "planning"
]);

function evidenceLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
}

function hasSubstantiveEvidence(text, placeholders) {
  return evidenceLines(text).some((line) => {
    const value = lower(line).replace(/[。.]$/, "").trim();
    if (!value) return false;
    return !placeholders.some((pattern) => pattern.test(value));
  });
}

function workflowEvidenceStatus(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  const file = path.join(contextDir, REQUIRED_FILES.verification);
  const markdown = readText(file);
  const hash = fs.existsSync(file) ? fileHash(file) : "missing";
  const emptyEvidence = [
    /^(?:none|n\/a|无|暂无)$/,
    /(?:not yet|not started|pending|unverified|尚未|未开始|未验证)/
  ];
  const emptyGap = [
    /^(?:none|n\/a|no gaps?|nothing|无|暂无|没有)$/,
    /^(?:all|全部).*(?:verified|通过|完成)$/
  ];
  const emptyReview = [
    /^(?:none|n\/a|无|暂无)$/,
    /(?:not reviewed|review pending|尚未审查|未审查|待审查)/
  ];
  const hasVerificationEvidence = [
    sectionContent(markdown, "Commands Run"),
    sectionContent(markdown, "Product Evidence"),
    sectionContent(markdown, "Verification Evidence")
  ].some((section) => hasSubstantiveEvidence(section, emptyEvidence));
  const hasVerificationGap = hasSubstantiveEvidence(
    sectionContent(markdown, "Not Yet Verified"),
    emptyGap
  );
  const hasReviewEvidence = hasSubstantiveEvidence(
    sectionContent(markdown, "Review Evidence"),
    emptyReview
  );
  return {
    file,
    hash,
    hasVerificationEvidence,
    hasVerificationGap,
    hasReviewEvidence
  };
}

function requireVerificationEvidence(root, ctx, event, mode) {
  const evidence = workflowEvidenceStatus(root, ctx);
  if (mode === "gap") {
    if (!evidence.hasVerificationGap) {
      throw new Error(`Cannot transition ${event}: verification.md must record a concrete unverified gap`);
    }
    return evidence.hash;
  }
  if (!evidence.hasVerificationEvidence) {
    throw new Error(`Cannot transition ${event}: verification.md must record fresh command, product, or verification evidence`);
  }
  if (mode === "pass" && evidence.hasVerificationGap) {
    throw new Error(`Cannot transition ${event}: verification.md still records an unaccepted verification gap`);
  }
  return evidence.hash;
}

function requireReviewEvidence(root, ctx, state, event) {
  const evidence = workflowEvidenceStatus(root, ctx);
  if (!/^[a-f0-9]{64}$/.test(String(state.verification_evidence_hash || ""))) {
    throw new Error(`Cannot transition ${event}: verification evidence hash is missing; rerun the verification transition with fresh evidence`);
  }
  if (!evidence.hasReviewEvidence) {
    throw new Error(`Cannot transition ${event}: verification.md must record review evidence`);
  }
  if (evidence.hash === state.verification_evidence_hash) {
    throw new Error(`Cannot transition ${event}: review evidence must be added after verification closure`);
  }
  return evidence.hash;
}

function requireDeliveryEvidence(root, ctx, state, event) {
  if (!["pass", "gap-recorded"].includes(state.verify_result)) {
    throw new Error(`Cannot transition ${event}: verify_result must be pass or gap-recorded`);
  }
  if (state.verify_result === "gap-recorded" && state.verification_gap_status !== "accepted") {
    throw new Error(`Cannot transition ${event}: recorded verification gap requires explicit user acceptance`);
  }
  if (!["done", "skipped"].includes(state.review_status)) {
    throw new Error(`Cannot transition ${event}: review_status must be done or skipped`);
  }
  if (["lane-2", "lane-3"].includes(state.work_lane) && state.review_status !== "done") {
    throw new Error(`Cannot transition ${event}: ${state.work_lane} requires completed review`);
  }
  const evidence = workflowEvidenceStatus(root, ctx);
  if (!/^[a-f0-9]{64}$/.test(String(state.verification_evidence_hash || ""))) {
    throw new Error(`Cannot transition ${event}: verification evidence hash is missing`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(state.review_evidence_hash || ""))) {
    throw new Error(`Cannot transition ${event}: review evidence hash is missing`);
  }
  if (evidence.hash !== state.review_evidence_hash) {
    throw new Error(`Cannot transition ${event}: verification.md changed after review closure`);
  }
}

const TASK_SCOPED_FILES = [
  REQUIRED_FILES.current,
  REQUIRED_FILES.spec,
  REQUIRED_FILES.plan,
  REQUIRED_FILES.artifacts,
  REQUIRED_FILES.decisions,
  REQUIRED_FILES.questions,
  REQUIRED_FILES.verification,
  REQUIRED_FILES.workingNotes,
  REQUIRED_FILES.handoff
];

function safeTaskArchiveName(state) {
  const taskId = String(state.task_id || "task").replace(/[^A-Za-z0-9._-]+/g, "-");
  const generation = String(state.task_generation || "0").replace(/[^0-9]+/g, "") || "0";
  return `${taskId}-g${generation}`;
}

function taskTemplate(name, state) {
  const template = TEMPLATES[name] || `# ${name}\n`;
  const identity = [
    "## Task Identity",
    `- task_id: ${state.task_id}`,
    `- task_generation: ${state.task_generation}`
  ].join("\n");
  const firstBreak = template.indexOf("\n");
  return firstBreak >= 0
    ? `${template.slice(0, firstBreak + 1)}\n${identity}\n${template.slice(firstBreak + 1)}`
    : `${template}\n\n${identity}\n`;
}

function resetTaskScopedContext(root, ctx, previous, next) {
  const contextDir = ctxFor(root, ctx);
  const archiveDir = path.join(contextDir, "archive", "tasks", safeTaskArchiveName(previous));
  if (fs.existsSync(archiveDir)) {
    throw new Error(`Cannot start new task: task archive already exists: ${archiveDir}`);
  }
  const originals = new Map();
  const discussionFile = path.join(contextDir, "discussion-state.json");
  for (const name of TASK_SCOPED_FILES) {
    const file = path.join(contextDir, name);
    originals.set(file, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
  }
  originals.set(discussionFile, fs.existsSync(discussionFile) ? fs.readFileSync(discussionFile, "utf8") : null);

  fs.mkdirSync(archiveDir, { recursive: true });
  try {
    for (const name of TASK_SCOPED_FILES) {
      const file = path.join(contextDir, name);
      const original = originals.get(file);
      if (original !== null) writeTextAtomic(path.join(archiveDir, name), original);
      writeTextAtomic(file, taskTemplate(name, next));
    }
    const discussion = originals.get(discussionFile);
    if (discussion !== null) {
      writeTextAtomic(path.join(archiveDir, "discussion-state.json"), discussion);
    }
    fs.rmSync(discussionFile, { force: true });
  } catch (error) {
    for (const [file, original] of originals) {
      if (original === null) fs.rmSync(file, { force: true });
      else writeTextAtomic(file, original);
    }
    fs.rmSync(archiveDir, { recursive: true, force: true });
    throw error;
  }

  return () => {
    for (const [file, original] of originals) {
      if (original === null) fs.rmSync(file, { force: true });
      else writeTextAtomic(file, original);
    }
    fs.rmSync(archiveDir, { recursive: true, force: true });
  };
}

function checkpointDeferralReason(root, ctx) {
  const contextDir = ctxFor(root, ctx);
  const handoff = readText(path.join(contextDir, REQUIRED_FILES.handoff));
  const section = sectionContent(handoff, "Git Checkpoint");
  const match = section.match(/(?:Deferred reason|暂缓原因)\s*:\s*(.+)/i);
  const reason = String(match?.[1] || "").trim();
  return meaningful(reason) && !/^(?:none|n\/a|无|暂无)[。.]?$/i.test(reason) ? reason : "";
}

function transitionWorkflowStateUnlocked(root, ctx, event) {
  const state = loadWorkflowState(root, ctx);
  let next;

  if (state.phase === "complete" && event !== "new-task") {
    throw new Error(`Cannot transition ${event} from complete; run workflow-state transition new-task`);
  }

  if (DECISION_EVENTS.has(event)) {
    const decision = decisionForTransition(state, event);
    if (!decision) {
      throw new Error(`Cannot transition ${event}: no unambiguous pending decision is recorded`);
    }
    const evidence = canonicalDecisionEvidenceStatus(root, ctx, state, decision, event);
    if (!evidence.ok) {
      throw new Error(`Cannot transition ${event}: ${evidence.reason}`);
    }
  }

  switch (event) {
    case "work-lane-0":
    case "work-lane-1":
    case "work-lane-2":
    case "work-lane-3": {
      requirePhase(state, event, PRE_EXECUTION_PHASES);
      const workLane = event.replace(/^work-/, "");
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        work_lane: workLane,
        decision_required: "none"
      }, `Work lane classified as ${workLane}`);
      break;
    }
    case "new-task": {
      requirePhase(state, event, ["complete"]);
      const generation = (Number.parseInt(state.task_generation || "0", 10) || 0) + 1;
      next = withBase(state, {
        work_lane: "lane-1",
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
        verification_gap_status: "not-required",
        review_status: "pending",
        checkpoint_status: "pending",
        verification_evidence_hash: "none",
        review_evidence_hash: "none",
        resume_phase: "none",
        resume_skill: "none",
        debug_return_phase: "none",
        debug_return_skill: "none",
        handoff_hash: "null",
        handoff_task_id: "none",
        handoff_task_generation: "none"
      }, "New task started");
      break;
    }
    case "wayfinder-start":
      if (state.phase === "complete") {
        throw new Error("Cannot transition wayfinder-start from complete; run workflow-state transition new-task");
      }
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "wayfinding",
        next_skill: "codex-wayfinder",
        spec_status: "living-draft",
        decision_required: "none"
      }, "Wayfinder discovery started");
      break;
    case "wayfinder-complete":
      requirePhase(state, event, ["wayfinding"]);
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "brainstorming",
        next_skill: "brainstorming",
        spec_status: "living-draft",
        decision_required: "none"
      }, "Wayfinder route resolved; written spec is next");
      break;
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
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "brainstorming",
        next_skill: "brainstorming",
        spec_status: "living-draft",
        decision_required: "none"
      }, "Brainstorming started");
      break;
    case "spec-living":
      requirePhase(state, event, ["brainstorming", "spec"]);
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "brainstorming",
        next_skill: "brainstorming",
        spec_status: "living-draft",
        decision_required: "none"
      }, "Living spec updated");
      break;
    case "spec-ready":
      requirePhase(state, event, ["brainstorming", "spec"]);
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "spec",
        next_skill: "brainstorming",
        spec_status: "pending-approval",
        decision_required: "written-spec-approval"
      }, "Written spec is ready for user approval");
      break;
    case "spec-approved":
      requirePhase(state, event, ["brainstorming", "spec", "planning"]);
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "planning",
        next_skill: "writing-plans",
        spec_status: "approved",
        approved_spec_hash: documentHash(ctxFor(root, ctx), REQUIRED_FILES.spec),
        decision_required: "none"
      }, "Written spec approved");
      break;
    case "spec-skipped":
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
        phase: "planning",
        next_skill: "writing-plans",
        spec_status: "skipped",
        decision_required: "none"
      }, "Brainstorming explicitly skipped");
      break;
    case "mechanical-exception":
      requirePhase(state, event, PRE_EXECUTION_PHASES);
      if (state.work_lane !== "lane-0") {
        throw new Error("Cannot transition mechanical-exception: work_lane must be lane-0");
      }
      next = withBase(state, {
        ...RESET_AFTER_SCOPE_CHANGE,
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
        ...RESET_AFTER_PLAN_CHANGE,
        phase: "planning",
        next_skill: "writing-plans",
        plan_status: "drafting",
        decision_required: "none"
      }, "Planning started");
      break;
    case "plan-ready":
      requirePhase(state, event, ["planning"]);
      requireSpecReady(state, event);
      requirePlanImplementationReady(root, ctx, state, event);
      next = withBase(state, {
        ...RESET_AFTER_PLAN_CHANGE,
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
        approved_plan_hash: approvedDocumentHash(root, ctxFor(root, ctx), REQUIRED_FILES.plan, state.document_hash_mode),
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
        approved_plan_hash: approvedDocumentHash(root, ctxFor(root, ctx), REQUIRED_FILES.plan, state.document_hash_mode),
        execution_mode: "codex-goal",
        execution_approval: "approved-goal",
        loop_review_status: "approved",
        decision_required: "none"
      }, "Codex Goal mode approved");
      break;
    case "debugging-start":
      requirePhase(state, event, ["execution"]);
      next = withBase(state, {
        phase: "debugging",
        next_skill: "systematic-debugging",
        debug_return_phase: "execution",
        debug_return_skill: "executing-plans",
        decision_required: "none"
      }, "Execution failure entered systematic debugging");
      break;
    case "debugging-resolved":
      requirePhase(state, event, ["debugging"]);
      if (state.decision_required !== "none") {
        throw new Error(`Cannot transition ${event}: resolve the pending decision first`);
      }
      if (state.debug_return_phase !== "execution" || state.debug_return_skill !== "executing-plans") {
        throw new Error(`Cannot transition ${event}: no execution debugging return path is recorded`);
      }
      next = withBase(state, {
        phase: state.debug_return_phase,
        next_skill: state.debug_return_skill,
        debug_return_phase: "none",
        debug_return_skill: "none",
        decision_required: "none"
      }, "Debugging resolved; return to the active execution plan");
      break;
    case "execution-complete":
      requirePhase(state, event, ["execution", "debugging"]);
      if (state.phase === "debugging" && state.debug_return_phase !== "none") {
        throw new Error("Cannot transition execution-complete during an execution debugging detour; run debugging-resolved first");
      }
      next = withBase(state, {
        phase: "verification",
        next_skill: "codex-verification-loop",
        verify_result: "pending",
        verification_gap_status: "not-required",
        review_status: "pending",
        checkpoint_status: "pending",
        verification_evidence_hash: "none",
        review_evidence_hash: "none",
        decision_required: "none"
      }, "Execution complete; verification required");
      break;
    case "verification-pass": {
      requirePhase(state, event, ["verification"]);
      const verificationEvidenceHash = requireVerificationEvidence(root, ctx, event, "pass");
      next = withBase(state, {
        phase: "review",
        next_skill: "codex-review-panel",
        verify_result: "pass",
        verification_gap_status: "not-required",
        review_status: "pending",
        verification_evidence_hash: verificationEvidenceHash,
        review_evidence_hash: "none",
        decision_required: "none"
      }, "Verification passed; review gate next");
      break;
    }
    case "verification-gap-recorded": {
      requirePhase(state, event, ["verification"]);
      const verificationEvidenceHash = requireVerificationEvidence(root, ctx, event, "gap");
      next = withBase(state, {
        phase: "verification",
        next_skill: "codex-verification-loop",
        verify_result: "gap-recorded",
        verification_gap_status: "pending",
        review_status: "pending",
        verification_evidence_hash: verificationEvidenceHash,
        review_evidence_hash: "none",
        decision_required: "verification-gap-acceptance"
      }, "Verification gap recorded; explicit user acceptance required");
      break;
    }
    case "verification-fail": {
      requirePhase(state, event, ["verification"]);
      const verificationEvidenceHash = requireVerificationEvidence(root, ctx, event, "fail");
      next = withBase(state, {
        phase: "debugging",
        next_skill: "systematic-debugging",
        verify_result: "fail",
        verification_gap_status: "not-required",
        verification_evidence_hash: verificationEvidenceHash,
        review_evidence_hash: "none",
        debug_return_phase: "none",
        debug_return_skill: "none",
        decision_required: "verification-failure-choice"
      }, "Verification failed; choose fix path");
      break;
    }
    case "verification-retry":
      requirePhase(state, event, ["verification", "debugging"]);
      if (!["verification-gap-acceptance", "verification-failure-choice"].includes(state.decision_required)) {
        throw new Error("Cannot transition verification-retry: no retryable verification decision is pending");
      }
      next = withBase(state, {
        phase: "debugging",
        next_skill: "systematic-debugging",
        verify_result: "fail",
        verification_gap_status: "not-required",
        review_status: "pending",
        checkpoint_status: "pending",
        verification_evidence_hash: "none",
        review_evidence_hash: "none",
        debug_return_phase: "none",
        debug_return_skill: "none",
        decision_required: "none"
      }, "Verification failure accepted for another fix-and-verify cycle");
      break;
    case "verification-gap-accepted":
      requirePhase(state, event, ["verification", "debugging"]);
      if (!["verification-gap-acceptance", "verification-failure-choice"].includes(state.decision_required)) {
        throw new Error("Cannot transition verification-gap-accepted: verification gap acceptance is not pending");
      }
      next = withBase(state, {
        phase: "review",
        next_skill: "codex-review-panel",
        verify_result: "gap-recorded",
        verification_gap_status: "accepted",
        review_status: "pending",
        decision_required: "none"
      }, "User accepted the recorded verification gap; review gate next");
      break;
    case "review-changes-requested":
      requirePhase(state, event, ["review", "delivery", "handoff"]);
      next = withBase(state, {
        phase: "debugging",
        next_skill: "receiving-code-review",
        verify_result: "pending",
        review_status: "pending",
        checkpoint_status: "pending",
        verification_evidence_hash: "none",
        review_evidence_hash: "none",
        debug_return_phase: "none",
        debug_return_skill: "none",
        decision_required: "none"
      }, "Review changes accepted; implementation and verification reopened");
      break;
    case "review-complete": {
      requirePhase(state, event, ["review"]);
      const reviewEvidenceHash = requireReviewEvidence(root, ctx, state, event);
      next = withBase(state, {
        phase: "delivery",
        next_skill: "verification-before-completion",
        review_status: "done",
        review_evidence_hash: reviewEvidenceHash,
        decision_required: "none"
      }, "Review complete; delivery gate next");
      break;
    }
    case "review-skipped": {
      requirePhase(state, event, ["review"]);
      if (["lane-2", "lane-3"].includes(state.work_lane)) {
        throw new Error(`Cannot transition review-skipped: ${state.work_lane} requires completed review`);
      }
      if (state.verify_result !== "pass") {
        throw new Error("Cannot transition review-skipped: verification must pass");
      }
      const reviewEvidenceHash = requireReviewEvidence(root, ctx, state, event);
      next = withBase(state, {
        phase: "delivery",
        next_skill: "verification-before-completion",
        review_status: "skipped",
        review_evidence_hash: reviewEvidenceHash,
        decision_required: "none"
      }, "Review skipped with recorded reason");
      break;
    }
    case "checkpoint-ready":
      requirePhase(state, event, ["delivery"]);
      requireDeliveryEvidence(root, ctx, state, event);
      next = withBase(state, {
        phase: "handoff",
        next_skill: "codex-git-checkpoint",
        checkpoint_status: "pending",
        decision_required: "none"
      }, "Checkpoint required");
      break;
    case "checkpoint-done":
      requirePhase(state, event, ["execution", "debugging", "handoff"]);
      next = withBase(state, {
        checkpoint_status: "done",
        decision_required: "none"
      }, "Checkpoint complete");
      break;
    case "checkpoint-deferred":
      requirePhase(state, event, ["execution", "debugging", "handoff"]);
      if (!checkpointDeferralReason(root, ctx)) {
        throw new Error("Cannot transition checkpoint-deferred: handoff Git Checkpoint requires a concrete deferred reason");
      }
      next = withBase(state, {
        checkpoint_status: "deferred",
        decision_required: "none"
      }, "Checkpoint deferred with recorded reason");
      break;
    case "delivery-complete":
      requirePhase(state, event, ["handoff"]);
      requireDeliveryEvidence(root, ctx, state, event);
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
      if (state.decision_required && state.decision_required !== "none") {
        throw new Error(`Cannot transition blocked while decision_required=${state.decision_required}; keep the pending decision active and record the external blocker in handoff-summary.md`);
      }
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

  let rollbackTaskReset = null;
  let rollbackDecisionDocument = null;
  try {
    rollbackDecisionDocument = applyDecisionDocumentResolution(root, ctx, state, event);
    if (event === "spec-approved") {
      next.approved_spec_hash = documentHash(ctxFor(root, ctx), REQUIRED_FILES.spec);
    }
    if (["execution-approved-traditional", "execution-approved-goal"].includes(event)) {
      next.approved_plan_hash = approvedDocumentHash(root, ctxFor(root, ctx), REQUIRED_FILES.plan, next.document_hash_mode);
    }
    if (event === "new-task") {
      rollbackTaskReset = resetTaskScopedContext(root, ctx, state, next);
      const handoffHash = workflowContextHash(root, ctx, false).combined;
      next = {
        ...next,
        handoff_hash: handoffHash,
        handoff_task_id: next.task_id,
        handoff_task_generation: next.task_generation
      };
    }
    saveWorkflowStateUnlocked(root, ctx, next);
    return next;
  } catch (error) {
    if (rollbackDecisionDocument) rollbackDecisionDocument();
    if (rollbackTaskReset) rollbackTaskReset();
    throw error;
  }
}

export function transitionWorkflowState(root, ctx, event) {
  return withWorkflowStateLock(root, ctx, () => transitionWorkflowStateUnlocked(root, ctx, event));
}

export function reopenWorkflowAfterProjectMutation(root, ctx, sourcePhase) {
  const contextDir = ctxFor(root, ctx);
  return withWorkflowStateLock(root, contextDir, () => {
    const state = loadWorkflowState(root, contextDir);
    if (!["verification", "review", "delivery", "handoff"].includes(state.phase)) {
      return state;
    }
    const fromReview = ["review", "delivery", "handoff"].includes(state.phase);
    const next = {
      ...state,
      phase: "debugging",
      next_skill: fromReview ? "receiving-code-review" : "systematic-debugging",
      verify_result: "pending",
      verification_gap_status: "not-required",
      review_status: "pending",
      checkpoint_status: "pending",
      verification_evidence_hash: "none",
      review_evidence_hash: "none",
      debug_return_phase: "none",
      debug_return_skill: "none",
      decision_required: "none",
      note: `Project mutation automatically reopened ${sourcePhase || state.phase} evidence`
    };
    saveWorkflowStateUnlocked(root, contextDir, next);
    return next;
  });
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
    const transitions = DECISION_TRANSITIONS[state.decision_required] || [];
    return {
      next: "manual",
      skill: state.next_skill,
      transitions,
      hint: transitions.length
        ? `decision required: ${state.decision_required}; after a matching user response use one of: ${transitions.join(", ")}`
        : `decision required: ${state.decision_required}; no automated transition is registered`
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
  return normalizedTextHash(readText(file));
}

function normalizedText(text) {
  return String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function normalizedTextHash(text) {
  return createHash("sha256").update(normalizedText(text), "utf8").digest("hex");
}

function rawFileHash(file) {
  return createHash("sha256").update(readText(file), "utf8").digest("hex");
}

function documentHash(contextDir, name) {
  const file = path.join(contextDir, name);
  return fs.existsSync(file) ? fileHash(file) : "none";
}

function canonicalPlanMarkdown(markdown) {
  return normalizedText(withoutSection(
    withoutSection(
      withoutSection(markdown, "Workflow Decision"),
      "Current Step"
    ),
    "Checkpoints"
  )).replace(/^(\s*[-*]\s+)\[[ xX]\]/gm, "$1[ ]");
}

function planReferenceFromMarkdown(markdown) {
  const section = sectionContent(String(markdown || ""), "Active Plan");
  const candidates = [
    ...[...section.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/gi)].map((match) => match[1]),
    ...[...section.matchAll(/`([^`]+\.md)`/gi)].map((match) => match[1]),
    section.match(/(?:^|\s)([A-Za-z0-9_.][^\s`'"<>]*\.md)(?:\s|$)/i)?.[1]
  ].filter(Boolean);
  return String(candidates[0] || "").trim().replace(/^<|>$/g, "").replace(/\\/g, "/");
}

function planContractEntries(root, contextDir, progressMarkdown, linkedReader = null) {
  const entries = [{
    name: `.codex-context/${REQUIRED_FILES.plan}`,
    content: canonicalPlanMarkdown(progressMarkdown)
  }];
  const reference = planReferenceFromMarkdown(progressMarkdown);
  if (!reference) return entries;
  const absolute = path.isAbsolute(reference) ? path.resolve(reference) : path.resolve(root, reference);
  if (!pathIsInside(root, absolute)) {
    entries.push({ name: reference, content: "[outside-project]" });
    return entries;
  }
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  let linked = null;
  if (linkedReader) linked = linkedReader(relative, absolute);
  else if (fs.existsSync(absolute)) linked = readText(absolute);
  entries.push({
    name: relative,
    content: linked === null || linked === undefined ? "[missing]" : canonicalPlanMarkdown(linked)
  });
  return entries;
}

function planContractHash(root, contextDir, progressMarkdown = null, linkedReader = null) {
  const markdown = progressMarkdown === null
    ? readText(path.join(contextDir, REQUIRED_FILES.plan))
    : progressMarkdown;
  return stableFingerprint({
    schema: "dong-skills.plan-approval-contract.v1",
    files: planContractEntries(root, contextDir, markdown, linkedReader)
  });
}

function approvedDocumentHash(root, contextDir, name, mode = "approval-contract-v2") {
  if (name === REQUIRED_FILES.plan && mode === "approval-contract-v2") {
    return planContractHash(root, contextDir);
  }
  return documentHash(contextDir, name);
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
  const wayfinderReference = activeWayfinderReference(contextDir);
  if (wayfinderReference) {
    for (const name of [REQUIRED_FILES.decisions, REQUIRED_FILES.questions, REQUIRED_FILES.workingNotes]) {
      const file = path.join(contextDir, name);
      entries.push({
        name,
        exists: fs.existsSync(file),
        hash: fs.existsSync(file) ? fileHash(file) : "missing"
      });
    }
    const wayfinderFile = path.resolve(root, wayfinderReference);
    const validPath = pathIsInside(root, wayfinderFile);
    entries.push({
      name: `wayfinder:${wayfinderReference}`,
      exists: validPath && fs.existsSync(wayfinderFile),
      hash: validPath && fs.existsSync(wayfinderFile) ? fileHash(wayfinderFile) : "missing"
    });
  }
  const combined = createHash("sha256")
    .update(entries.map((entry) => `${entry.name}:${entry.hash}`).join("\n"), "utf8")
    .digest("hex");

  if (write) {
    withWorkflowStateLock(root, contextDir, () => {
      const state = loadWorkflowState(root, contextDir);
      if (state.handoff_hash === combined &&
          state.handoff_task_id === state.task_id &&
          String(state.handoff_task_generation) === String(state.task_generation)) {
        return;
      }
      saveWorkflowStateUnlocked(root, contextDir, {
        ...state,
        handoff_hash: combined,
        handoff_task_id: state.task_id,
        handoff_task_generation: state.task_generation,
        note: "Context hash refreshed"
      });
    });
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
