import fs from "node:fs";
import path from "node:path";
import { assetGovernanceStatus } from "./assets.mjs";
import { fileFresh, latestChangedMtime, mtimeMs, readText, shortList, writeJson } from "./core.mjs";
import { changedPathsNeedVerification, gitChangedFiles, gitCheckpointStatus, gitStatusFiles, isGovernancePath } from "./git.mjs";
import { handoffStatus, markdownStatus, meaningful, sectionContent, verificationStatus } from "./markdown.mjs";
import {
  appendLearningObservation,
  classifyLearningCue,
  extractPromptText,
  learningStatus,
  sanitizeLearningExcerpt
} from "./learning.mjs";
import { sessionRecoveryContext } from "./recovery.mjs";
import { REQUIRED_FILES } from "./templates.mjs";
import { workflowStatus } from "./workflow.mjs";

const DISCUSSION_STATE_FILE = "discussion-state.json";
const DISCUSSION_REFRESH_FILES = [
  REQUIRED_FILES.spec,
  REQUIRED_FILES.current,
  REQUIRED_FILES.decisions,
  REQUIRED_FILES.questions,
  REQUIRED_FILES.handoff
];
const WORKING_NOTES_REFRESH_FILES = [
  REQUIRED_FILES.workingNotes,
  REQUIRED_FILES.current,
  REQUIRED_FILES.handoff
];
const ACTIVE_DISCUSSION_PHASES = new Set(["discovery", "brainstorming", "spec", "planning", "debugging"]);
const ACTIVE_INVESTIGATION_PHASES = new Set(["discovery", "brainstorming", "spec", "planning", "execution", "debugging"]);
const EVIDENCE_REQUIRED_PHASES = new Set(["execution", "debugging", "verification", "review", "delivery"]);
const CHECKPOINT_REQUIRED_PHASES = new Set(["delivery", "handoff", "complete"]);

export function sessionStart(root, ctx) {
  writeJson(sessionRecoveryContext(root, ctx, "SessionStart"));
}

export function postCompact() {
  writeJson({ continue: true });
}

function allowStop() {
  writeJson({});
}

function blockStop(reason) {
  writeJson({
    decision: "block",
    reason
  });
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function discussionStateFile(ctx) {
  return path.join(ctx, DISCUSSION_STATE_FILE);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function workflowStateFor(root, ctx) {
  return workflowStatus(root, ctx).state || {};
}

function discussionWorkflowActive(state) {
  return ACTIVE_DISCUSSION_PHASES.has(state.phase) ||
    ["living-draft", "pending-approval"].includes(state.spec_status) ||
    ["clarify-scope", "written-spec-approval", "execution-approval", "user-choice"].includes(state.decision_required);
}

function investigationWorkflowActive(state) {
  return ACTIVE_INVESTIGATION_PHASES.has(state.phase) ||
    ["living-draft", "pending-approval"].includes(state.spec_status);
}

function executionEvidenceRequired(state, files) {
  return EVIDENCE_REQUIRED_PHASES.has(state.phase) || changedPathsNeedVerification(files);
}

function checkpointReviewRequired(state, files) {
  return CHECKPOINT_REQUIRED_PHASES.has(state.phase) || executionEvidenceRequired(state, files);
}

function promptIsSubstantive(prompt) {
  return String(prompt || "").trim().length >= 2;
}

function writeDiscussionMarker(root, ctx, input, patch) {
  const file = discussionStateFile(ctx);
  const previous = readJsonFile(file);
  const requiredFiles = unique([
    ...(Array.isArray(previous.required_files) ? previous.required_files : []),
    ...(patch.required_files || [])
  ]);
  const now = new Date().toISOString();
  const marker = {
    status: "dirty",
    updated_at: now,
    source: patch.source,
    reason: patch.reason,
    phase: patch.phase,
    spec_status: patch.spec_status,
    decision_required: patch.decision_required,
    prompt_excerpt: patch.prompt_excerpt || previous.prompt_excerpt || undefined,
    tool_name: patch.tool_name || previous.tool_name || undefined,
    cwd_relative: input?.cwd ? path.relative(root, path.resolve(input.cwd)).replace(/\\/g, "/") || "." : previous.cwd_relative || ".",
    required_files: requiredFiles,
    next_action: [
      "Refresh the listed files with confirmed user decisions, current question, and externalized investigation findings.",
      "Do not store hidden chain-of-thought; write checked facts, rejected paths, current hypothesis, conclusion, and next verification step."
    ].join(" ")
  };
  fs.mkdirSync(ctx, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
  return marker;
}

export function userPromptSubmit(input, root, ctx) {
  const prompt = extractPromptText(input);
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const messages = [];

  if (promptIsSubstantive(prompt) && discussionWorkflowActive(state)) {
    writeDiscussionMarker(root, ctx, input, {
      source: "UserPromptSubmit",
      reason: "latest user prompt may change discussion/spec state",
      phase: state.phase,
      spec_status: state.spec_status,
      decision_required: state.decision_required,
      prompt_excerpt: sanitizeLearningExcerpt(prompt),
      required_files: DISCUSSION_REFRESH_FILES
    });
    messages.push([
      "Codex Project Ops marked discussion state dirty.",
      "Before stopping or compacting, refresh spec.md, current-state.md, decisions.md, open-questions.md, handoff-summary.md, and working-notes.md when exploration findings changed."
    ].join(" "));
  }

  const cue = classifyLearningCue(prompt);
  if (cue) {
    const saved = appendLearningObservation(root, ctx, input, cue, prompt);
    if (saved) {
      messages.push([
        "Codex Project Ops captured a raw learning observation.",
        "Do not treat it as active memory yet.",
        "Before compaction or stopping, evaluate it with codex-learning-memory and refresh learned-instincts.md."
      ].join(" "));
    }
  }

  if (!messages.length) return;

  writeJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: messages.join("\n")
    }
  });
}

function toolName(input) {
  return String(input?.tool_name || input?.toolName || input?.tool || input?.name || input?.matcher || "").trim();
}

function toolInputText(input) {
  const candidates = [
    input?.tool_input,
    input?.toolInput,
    input?.input,
    input?.arguments,
    input?.payload
  ];
  return candidates
    .map((candidate) => typeof candidate === "string" ? candidate : JSON.stringify(candidate || {}))
    .join(" ");
}

function explorationTool(input) {
  const name = toolName(input);
  const text = toolInputText(input);
  if (/read|grep|glob|search|find|open|web|browser|codegraph/i.test(name)) return true;
  if (/shell|bash|powershell|cmd|exec/i.test(name)) {
    return /\b(rg|grep|findstr|select-string|get-content|get-childitem|cat|type|git\s+(show|diff|log|status|ls-files|rev-parse|branch|worktree)|ls|dir|tree|sed|head|tail|wc)\b/i.test(text);
  }
  return false;
}

function markWorkingNotesDirty(input, root, ctx) {
  const state = workflowStateFor(root, ctx);
  if (!investigationWorkflowActive(state) || !explorationTool(input)) return null;
  return writeDiscussionMarker(root, ctx, input, {
    source: "PostToolUse",
    reason: "agent exploration or investigation happened after the last working notes checkpoint",
    phase: state.phase,
    spec_status: state.spec_status,
    decision_required: state.decision_required,
    tool_name: toolName(input) || "unknown",
    required_files: WORKING_NOTES_REFRESH_FILES
  });
}

export function postToolUse(input, root, ctx) {
  const marker = markWorkingNotesDirty(input, root, ctx);

  const changed = gitChangedFiles(root);
  if (changed.length === 0) {
    if (marker) {
      const message = [
        "Codex Project Ops marked investigation notes dirty.",
        "Before stopping or compacting, refresh working-notes.md with checked findings, rejected paths, current hypothesis/conclusion, and next verification step.",
        `Required files: ${shortList(marker.required_files || [])}.`
      ].join("\n");
      writeJson({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: message
        }
      });
    }
    return;
  }

  const latest = latestChangedMtime(root, changed);
  if (fileFresh(ctx, REQUIRED_FILES.artifacts, latest)) return;

  const reason = [
    "Codex Project Ops: non-context files changed, but .codex-context/artifact-index.md is not fresh.",
    hookStatusText(root, ctx, latest, changed, { assets: false, checkpoint: false, eventName: "PostToolUse" }),
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

function latestFileByMtime(root, files) {
  let latest = null;
  for (const file of files) {
    try {
      const stat = fs.statSync(path.join(root, file));
      if (!stat.isFile()) continue;
      const mtime = stat.mtimeMs;
      if (!latest || mtime > latest.mtime) latest = { file, mtime };
    } catch {
      // Deleted files may not have filesystem mtimes.
    }
  }
  return latest?.file || "";
}

function hookStatusText(root, ctx, latest = 0, files = [], options = {}) {
  const workflow = options.workflow || workflowStatus(root, ctx);
  const learning = options.learning === false ? null : (options.learning || learningStatus(ctx));
  const assets = options.assets === false ? null : (options.assets || assetGovernanceStatus(root, ctx));
  const checkpoint = options.checkpoint === false ? null : (options.checkpoint || gitCheckpointStatus(root, ctx, latest));
  const discussion = options.discussion === false ? null : (options.discussion || discussionStateStatus(root, ctx, workflow));
  const state = workflow.state || {};
  const consistencyIssues = workflow.consistency?.issues?.length || 0;
  const latestFile = latestFileByMtime(root, files.filter((file) => !isGovernancePath(file))) || latestFileByMtime(root, files);
  const lines = [
    "Hook status:",
    `- Event: ${options.eventName || "unknown"}`,
    `- Actual Git root: ${root}`,
    `- Workflow: phase=${state.phase || "missing"} next_skill=${state.next_skill || "missing"} decision_required=${state.decision_required || "missing"} issues=${workflow.issues.length} consistency_issues=${consistencyIssues}`,
    learning
      ? `- Learning: ${learning.ok ? "ok" : "pending-review"} issues=${learning.issues.length}`
      : "- Learning: not checked in this hook",
    assets
      ? `- Assets: ${assets.ok ? "ok" : "review-required"} issues=${assets.issues.length} advisories=${assets.advisories.length}`
      : "- Assets: not checked in this hook",
    discussion
      ? `- Discussion: ${discussion.ok ? "ok" : "needs-state-refresh"} issues=${discussion.issues.length}`
      : "- Discussion: not checked in this hook",
    checkpoint
      ? `- Checkpoint: ${checkpoint.ok ? "ok" : "review-required"}`
      : "- Checkpoint: not checked in this hook"
  ];
  if (latestFile) lines.push(`- Latest changed file: ${latestFile}`);
  return lines.join("\n");
}

function discussionStateStatus(root, ctx, workflow = null) {
  const file = discussionStateFile(ctx);
  if (!fs.existsSync(file)) {
    return {
      ok: true,
      issues: [],
      latest: 0,
      marker: null,
      requiredFiles: [],
      summary: "Discussion state ok: no dirty marker."
    };
  }

  const marker = readJsonFile(file);
  if (marker.status !== "dirty") {
    return {
      ok: true,
      issues: [],
      latest: mtimeMs(file),
      marker,
      requiredFiles: [],
      summary: "Discussion state ok: marker is not dirty."
    };
  }

  const state = workflow?.state || workflowStateFor(root, ctx);
  if (!discussionWorkflowActive(state) && !investigationWorkflowActive(state)) {
    return {
      ok: true,
      issues: [],
      latest: mtimeMs(file),
      marker,
      requiredFiles: [],
      summary: `Discussion state ok: inactive phase ${state.phase || "missing"}.`
    };
  }

  const latest = Math.max(mtimeMs(file), Date.parse(marker.updated_at || "") || 0);
  const requiredFiles = unique(Array.isArray(marker.required_files) ? marker.required_files : []);
  const issues = [];

  for (const name of requiredFiles) {
    if (!fileFresh(ctx, name, latest)) {
      issues.push(`${name} is older than latest discussion or investigation marker`);
    }
  }

  if (requiredFiles.includes(REQUIRED_FILES.workingNotes)) {
    const notes = readText(path.join(ctx, REQUIRED_FILES.workingNotes));
    const useful = ["Current Findings", "Current Hypothesis", "Rejected Paths", "Open Investigation Questions", "Next Verification Step"]
      .some((heading) => meaningful(sectionContent(notes, heading)));
    if (!useful) {
      issues.push("working-notes.md has no externalized investigation findings, hypothesis, rejected paths, open questions, or next verification step");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    latest,
    marker,
    requiredFiles,
    summary: issues.length
      ? `Discussion state needs refresh: ${issues.join("; ")}.`
      : "Discussion state ok: required files are fresh."
  };
}

function stripHandoffTitle(markdown) {
  return String(markdown || "")
    .trim()
    .replace(/^# (?:Handoff Summary|Handoff 摘要)[ \t]*\r?\n+/i, "")
    .trim();
}

function hasMeaningfulHandoff(markdown) {
  return ["Objective", "Latest User Instruction", "Next Action"]
    .some((heading) => meaningful(sectionContent(markdown, heading)));
}

function emergencyFallbackSections(statusFiles) {
  return `## 目标
自动压缩前的应急恢复快照。

## 最新用户指令
自动压缩即将运行，但 Codex Project Ops 状态仍有未解决的 freshness 问题。

## 已批准范围 / 规格
写入这个应急 handoff 后允许自动压缩。恢复后先检查列出的文件，并刷新正常项目状态，再继续实质工作。

## 计划状态
Emergency PreCompact fallback。这不是正常里程碑 handoff。

## 已修改文件
${markdownList(statusFiles)}

## 已读取但未修改文件
- 没有可用的旧 handoff 内容。

## 已做决策
- 为避免上下文压力下静默硬停，允许自动压缩继续。
- 手动压缩前仍应刷新项目状态。

## 开放问题与假设
- 假设：保留可恢复 handoff 比在没有可靠聊天反馈时阻止自动压缩更安全。
- 开放问题：恢复后确认是否有项目特定状态文件需要更完整更新。

## 风险
- 这个应急 handoff 可能不如主动 handoff 完整。
- 上方 issues 中列出的部分状态文件在压缩后可能仍然过期。

## 验证证据
- 应急 PreCompact 路径中未验证。恢复后检查 \`.codex-context/verification.md\`。

## Git 存档
- 最新提交: automatic PreCompact 期间未检查
- 推送状态: automatic PreCompact 期间未检查
- 已包含文件: automatic PreCompact 期间无
- 有意保留未提交的文件: ${statusFiles.length ? shortList(statusFiles, 20) : "none reported"}
- 暂缓原因: 为避免静默阻塞，写入应急 handoff 后允许自动压缩继续
- 下次存档: 恢复后如果需要归档工作，运行 codex-git-checkpoint

## 需要保留的经验沉淀
- 恢复后检查 \`.codex-context/learned-instincts.md\` 和待审查 raw observations。

## 下一步动作
压缩后重读这个 handoff，检查未解决 issues，然后按需刷新 current-state.md、plan-progress.md、artifact-index.md、verification.md、learned-instincts.md 和 Git 存档。`;
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
    "## Discussion Marker",
    readText(discussionStateFile(ctx)) || "No discussion marker.",
    "",
    "## Working Notes",
    readText(path.join(ctx, REQUIRED_FILES.workingNotes)) || "No working notes.",
    "",
    "## Previous Handoff",
    previousHandoff || "No previous handoff content."
  ].join("\n"), "utf8");

  const reread = [
    ".codex-context/handoff-summary.md",
    ".codex-context/workflow-state.yaml",
    ".codex-context/current-state.md",
    ".codex-context/project-map.md",
    ".codex-context/spec.md",
    ".codex-context/decisions.md",
    ".codex-context/open-questions.md",
    ".codex-context/working-notes.md",
    ".codex-context/discussion-state.json",
    ".codex-context/plan-progress.md",
    ".codex-context/artifact-index.md",
    ".codex-context/learned-instincts.md",
    ...statusFiles.slice(0, 8)
  ];
  const uniqueReread = [...new Set(reread)].filter(Boolean);
  const rawRel = path.relative(root, rawFile).replace(/\\/g, "/");
  const preservedHandoff = stripHandoffTitle(previousHandoff);
  const continuation = hasMeaningfulHandoff(previousHandoff)
    ? preservedHandoff
    : emergencyFallbackSections(statusFiles);

  fs.writeFileSync(handoffFile, `# Handoff 摘要

## PreCompact Emergency Notice
- Created: ${timestamp}
- Trigger: ${trigger}
- Raw snapshot: \`${rawRel}\`
- Previous handoff: 已保留在这个应急 notice 下方。
- Recovery rule: 先解决 PreCompact issues，再从下方保留的 handoff sections 继续。

## PreCompact Issues
${markdownList(issues)}

## PreCompact Files To Re-read First
${markdownList(uniqueReread)}

---

${continuation}
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
  const workflow = workflowStatus(root, ctx);
  issues.push(...workflow.issues);
  const discussion = discussionStateStatus(root, ctx, workflow);
  issues.push(...discussion.issues);
  const assets = assetGovernanceStatus(root, ctx);
  issues.push(...assets.issues);

  if (issues.length === 0) return;

  const trigger = compactTrigger(input);
  if (trigger === "auto") {
    const rawRel = writeEmergencyPreCompactHandoff(root, ctx, changed, statusFiles, issues, trigger);
    const message = [
      "Codex Project Ops allowed automatic compaction after preserving the existing handoff with an emergency notice.",
      hookStatusText(root, ctx, Math.max(latest, discussion.latest), [...new Set([...changed, ...statusFiles])], { learning, checkpoint, assets, workflow, discussion, eventName: "PreCompact" }),
      "Recovery file: .codex-context/handoff-summary.md.",
      "Lifecycle note: this emergency notice is temporary; after recovery, run asset-governance --apply or refresh a normal handoff to archive the notice.",
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
      hookStatusText(root, ctx, Math.max(latest, discussion.latest), [...new Set([...changed, ...statusFiles])], { learning, checkpoint, assets, workflow, discussion, eventName: "PreCompact" }),
      `Issues: ${issues.join("; ")}.`,
      "Refresh current-state.md, plan-progress.md, artifact-index.md, spec.md, decisions.md, open-questions.md, working-notes.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. Then compact again."
    ].join("\n")
  });
}

export function stop(input, root, ctx) {
  if (input.stop_hook_active) {
    allowStop();
    return;
  }

  const changed = gitChangedFiles(root);
  const learning = learningStatus(ctx);
  const statusFiles = gitStatusFiles(root);
  const allStatusFiles = [...new Set([...changed, ...statusFiles])];
  const latest = latestChangedMtime(root, changed);
  const checkpointLatest = latestChangedMtime(root, allStatusFiles);
  const assets = assetGovernanceStatus(root, ctx);
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const evidenceRequired = executionEvidenceRequired(state, allStatusFiles);
  const checkpointRequired = checkpointReviewRequired(state, allStatusFiles);
  const checkpoint = checkpointRequired ? gitCheckpointStatus(root, ctx, checkpointLatest) : null;
  const discussion = discussionStateStatus(root, ctx, workflow);
  const statusLatest = Math.max(latest, discussion.latest);

  if (changed.length === 0 && learning.ok && (!checkpointRequired || checkpoint.ok) && assets.ok && workflow.ok && discussion.ok) {
    allowStop();
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

    if (evidenceRequired) {
      const verification = verificationStatus(ctx, latest);
      if (verification.stale) issues.push("verification.md is older than changed files");
      if (!verification.hasEvidence) issues.push("verification.md has neither command evidence nor explicit unverified gaps");

      const handoff = handoffStatus(ctx, latest);
      if (!handoff.ok) {
        if (handoff.stale) issues.push("handoff-summary.md is older than changed files");
        if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
      }
    }
  }

  issues.push(...learning.issues);
  if (checkpointRequired && !checkpoint.ok) issues.push(checkpoint.summary);
  issues.push(...assets.issues);
  issues.push(...workflow.issues);
  issues.push(...discussion.issues);

  if (issues.length === 0) {
    allowStop();
    return;
  }

  const systemMessage = [
    "Before stopping, refresh Codex Project Ops state.",
    hookStatusText(root, ctx, statusLatest, allStatusFiles, { learning, checkpoint: checkpointRequired ? checkpoint : false, assets, workflow, discussion, eventName: "Stop" }),
    changed.length ? `Changed files: ${shortList(changed)}.` : "No non-context files changed.",
    `Issues: ${issues.join("; ")}.`,
    "Update artifact-index.md, current-state.md, spec.md, decisions.md, open-questions.md, working-notes.md, verification.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. If verification was not run, record the explicit gap instead of claiming success."
  ].join("\n");

  blockStop(systemMessage);
}
