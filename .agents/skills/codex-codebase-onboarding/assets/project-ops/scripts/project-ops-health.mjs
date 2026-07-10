#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

async function loadWorkflowRuntime() {
  const candidates = [
    path.join(scriptDirectory, "lib", "workflow.mjs"),
    path.join(scriptDirectory, "..", ".codex", "scripts", "lib", "workflow.mjs")
  ];
  const runtime = candidates.find((candidate) => fs.existsSync(candidate));
  if (!runtime) {
    throw new Error(`Dong Skills workflow runtime is missing. Checked: ${candidates.join(", ")}`);
  }
  return import(pathToFileURL(runtime).href);
}

const {
  normalizeWorkflowState,
  planArtifactReadinessFromMarkdown,
  planLoopReviewFromMarkdown,
  parseWorkflowYaml,
  validateWorkflowState
} = await loadWorkflowRuntime();

const REQUIRED_CONTEXT_FILES = [
  "current-state.md",
  "project-map.md",
  "spec.md",
  "plan-progress.md",
  "artifact-index.md",
  "decisions.md",
  "open-questions.md",
  "risks.md",
  "verification.md",
  "working-notes.md",
  "learned-instincts.md",
  "dong-skills-outbox.md",
  "solution-index.md",
  "worktree-state.md",
  "workflow-state.yaml",
  "handoff-summary.md"
];

const REQUIRED_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop"
];

const REQUIRED_HANDOFF_SECTIONS = [
  ["Objective", "目标"],
  ["Latest User Instruction", "最新用户指令"],
  ["Approved Scope / Spec", "已批准范围 / 规格"],
  ["Plan Status", "计划状态"],
  ["Files Modified", "已修改文件"],
  ["Decisions Made", "已做决策"],
  ["Verification Evidence", "验证证据"],
  ["Git Checkpoint", "Git 存档"],
  ["Next Action", "下一步动作"],
  ["Files To Re-read First", "优先重读文件"]
];

const REQUIRED_SPEC_SECTIONS = [
  ["Problem", "问题"],
  ["Goal", "Goals", "目标"],
  ["Approval Status", "审批状态"],
  ["Truth Hierarchy", "事实优先级"],
  ["Work Class / Risk Lane", "工作类别 / 风险等级"],
  ["Approved Scope", "已批准范围"],
  ["Acceptance Criteria", "验收标准"],
  ["Open Questions", "开放问题"],
  ["Next Step", "下一步"]
];

const REQUIRED_PLAN_SECTIONS = [
  ["Active Plan", "当前计划"],
  ["Spec Approval", "规格审批"],
  ["Execution Approval", "执行审批"],
  ["Execution Mode", "执行模式"],
  ["Work Class / Risk Lane", "工作类别 / 风险等级"],
  ["Goal Mode Objective", "Goal 模式目标"],
  ["Runtime Constraints", "运行约束"],
  ["Checkpoint Cadence", "存档节奏"],
  ["Tasks", "任务"],
  ["Current Step", "当前步骤"],
  ["Verification", "验证"],
  ["Out Of Scope", "范围外"]
];

const REQUIRED_CHECKPOINT_FIELDS = [
  ["Latest commit", "Latest functional commit", "最新提交", "最新功能提交"],
  ["Push state", "推送状态"],
  ["Files included", "已包含文件"],
  ["Files intentionally left uncommitted", "有意保留未提交的文件"],
  ["Deferred reason", "暂缓原因"],
  ["Next checkpoint", "下次存档"]
];

function gitRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return path.resolve(cwd);
  }
}

function runGit(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function resolveGitPath(root, value) {
  if (!value) return "";
  if (path.isAbsolute(value)) return path.resolve(value);
  return path.resolve(root, value);
}

function normalizedPath(value) {
  return path.resolve(value || "").replace(/\\/g, "/").toLowerCase();
}

function pathContainsSegment(value, segments) {
  const normalized = normalizedPath(value);
  return segments.some((segment) => normalized.includes(segment));
}

function detectWorktree(cwd) {
  const root = gitRoot(cwd);
  const gitDirRaw = runGit(cwd, ["rev-parse", "--git-dir"]);
  const gitCommonRaw = runGit(cwd, ["rev-parse", "--git-common-dir"]);
  const gitDir = resolveGitPath(root, gitDirRaw);
  const gitCommonDir = resolveGitPath(root, gitCommonRaw);
  const branch = runGit(cwd, ["branch", "--show-current"]);
  const superproject = runGit(cwd, ["rev-parse", "--show-superproject-working-tree"]);
  const isGitRepo = Boolean(gitDirRaw && gitCommonRaw);
  const isSubmodule = Boolean(superproject);
  const isLinkedWorktree = isGitRepo &&
    !isSubmodule &&
    Boolean(gitDir && gitCommonDir) &&
    normalizedPath(gitDir) !== normalizedPath(gitCommonDir);

  let role = "unknown";
  let cleanupOwner = "unknown";
  if (isSubmodule) {
    role = "submodule";
    cleanupOwner = "none";
  } else if (!isGitRepo) {
    role = "unknown";
    cleanupOwner = "unknown";
  } else if (!isLinkedWorktree) {
    role = "primary-checkout";
    cleanupOwner = "none";
  } else if (pathContainsSegment(root, ["/.codex/worktrees/"])) {
    role = "codex-managed-worktree";
    cleanupOwner = "host";
  } else {
    role = "manual-worktree";
    cleanupOwner = "user";
  }

  return {
    root,
    gitDir,
    gitCommonDir,
    branch,
    detached: isGitRepo && !branch,
    isLinkedWorktree,
    isSubmodule,
    role,
    cleanupOwner
  };
}

function worktreeHealthLines(info) {
  return [
    "Worktree:",
    `- Role: ${info.role}`,
    `- Root: ${info.root}`,
    `- Git dir: ${info.gitDir || "not detected"}`,
    `- Git common dir: ${info.gitCommonDir || "not detected"}`,
    `- Branch: ${info.detached ? "detached HEAD" : (info.branch || "none")}`,
    `- Linked worktree: ${info.isLinkedWorktree ? "yes" : "no"}`,
    `- Submodule: ${info.isSubmodule ? "yes" : "no"}`,
    `- Cleanup owner: ${info.cleanupOwner}`
  ];
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function treeSha256(dir) {
  const entries = walkFiles(dir)
    .map((file) => `${path.relative(dir, file).replace(/\\/g, "/")}\t${sha256(file)}`)
    .sort();
  const payload = entries.length ? `${entries.join("\n")}\n` : "";
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function sectionContent(markdown, headingOrHeadings) {
  const lines = markdown.split(/\r?\n/);
  const headings = Array.isArray(headingOrHeadings) ? headingOrHeadings : [headingOrHeadings];
  const start = lines.findIndex((line) => headings.some((heading) => line.trim() === `## ${heading}`));
  if (start === -1) return "";
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function hasAnyHeading(markdown, headings) {
  const lines = String(markdown || "").split(/\r?\n/);
  return headings.some((heading) => lines.some((line) => line.trim() === `## ${heading}`));
}

function headingLabel(headings) {
  return headings.join(" or ");
}

function parseFlatYaml(text) {
  const state = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) state[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return state;
}

function requireWorkflowValue(state, field, allowed, issues) {
  if (!state[field]) {
    issues.push(`workflow-state.yaml missing field: ${field}`);
  } else if (allowed && !allowed.includes(state[field])) {
    issues.push(`workflow-state.yaml invalid ${field}: ${state[field]}`);
  }
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

function meaningful(text) {
  const compact = String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/[.。]/g, "")
    .trim();
  if (/^(None yet|None known|None|Unknown|No formal plan yet|暂无正式计划|暂无已知风险|尚未检测|待定|暂无|无|未知)$/i.test(compact)) {
    return false;
  }
  return compact.length > 0;
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
  const approval = nonTemplateStatusText(sectionContent(markdown, ["Approval Status", "审批状态"]));
  if (!approval) return "unknown";
  if (/living draft|not approved|未批准|草稿/.test(approval)) return "living-draft";
  if (/pending written-spec approval|pending approval|待.*审批|等待.*审批/.test(approval)) return "pending-approval";
  if (/skipped|跳过/.test(approval)) return "skipped";
  if (/mechanical exception|机械例外/.test(approval)) return "mechanical-exception";
  if (/approved|用户.*批准|已批准/.test(approval)) return "approved";
  return "unknown";
}

function planApprovalFromMarkdown(markdown) {
  const approval = nonTemplateStatusText(sectionContent(markdown, ["Execution Approval", "执行审批"]));
  if (!approval) return "unknown";
  if (/pending|not approved|尚未批准|未批准|待.*批准|等待.*批准/.test(approval)) return "pending";
  if (/approved by user.*codex goal|approved.*goal|approved-goal|codex goal.*批准/.test(approval)) return "approved-goal";
  if (/approved by user.*traditional|approved.*traditional|approved-traditional|traditional.*批准|逐项执行.*批准/.test(approval)) return "approved-traditional";
  if (/plan-then-execute|先计划.*执行|计划后执行/.test(approval)) return "plan-then-execute-traditional";
  return "unknown";
}

function planModeFromMarkdown(markdown) {
  const mode = nonTemplateStatusText(sectionContent(markdown, ["Execution Mode", "执行模式"]));
  if (!mode) return "unknown";
  if (/pending|待定|未定|尚未/.test(mode)) return "pending";
  if (/codex goal|goal mode/.test(mode)) return "codex-goal";
  if (/traditional|task-by-task|逐项|传统/.test(mode)) return "traditional";
  return "unknown";
}

function phaseAtOrAfterExecution(phase) {
  return EXECUTION_OR_LATER_PHASES.has(phase);
}

function checkWorkflowConsistency(workflow, spec, plan, issues) {
  const specDoc = specApprovalFromMarkdown(spec);
  const planApproval = planApprovalFromMarkdown(plan);
  const planMode = planModeFromMarkdown(plan);
  const planReadiness = planArtifactReadinessFromMarkdown(plan);
  const planLoopReview = planLoopReviewFromMarkdown(plan);

  if (specDoc === "approved" && ["not-started", "living-draft", "pending-approval"].includes(workflow.spec_status)) {
    issues.push(`workflow-state.yaml/spec.md mismatch: spec.md says approved, but spec_status=${workflow.spec_status}`);
  }
  if (["living-draft", "pending-approval"].includes(specDoc) && workflow.spec_status === "approved") {
    issues.push(`workflow-state.yaml/spec.md mismatch: workflow spec_status=approved, but spec.md approval status is ${specDoc}`);
  }
  if (phaseAtOrAfterExecution(workflow.phase) && !["approved", "skipped", "mechanical-exception"].includes(workflow.spec_status)) {
    issues.push(`workflow-state.yaml mismatch: phase=${workflow.phase} requires approved/skipped/mechanical spec_status, got ${workflow.spec_status}`);
  }

  if (planApproval === "pending" && ["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(workflow.execution_approval)) {
    issues.push(`workflow-state.yaml/plan-progress.md mismatch: execution_approval=${workflow.execution_approval}, but plan-progress.md execution approval is pending`);
  }
  if (["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(planApproval) && workflow.execution_approval === "pending") {
    issues.push("workflow-state.yaml/plan-progress.md mismatch: plan-progress.md has execution approval, but execution_approval=pending");
  }
  if (phaseAtOrAfterExecution(workflow.phase) && !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(workflow.execution_approval)) {
    issues.push(`workflow-state.yaml mismatch: phase=${workflow.phase} requires execution approval, got ${workflow.execution_approval}`);
  }
  if (workflow.plan_status === "approved" && planApproval === "pending") {
    issues.push("workflow-state.yaml/plan-progress.md mismatch: plan_status=approved, but plan-progress.md says execution is not approved");
  }
  if (["traditional", "codex-goal"].includes(planMode) && workflow.execution_mode !== "pending" && planMode !== workflow.execution_mode) {
    issues.push(`workflow-state.yaml/plan-progress.md mismatch: execution mode=${workflow.execution_mode}, but plan-progress.md says ${planMode}`);
  }
  if (phaseAtOrAfterExecution(workflow.phase) &&
      workflow.spec_status !== "mechanical-exception" &&
      planReadiness !== "implementation-ready") {
    issues.push(`workflow-state.yaml mismatch: phase=${workflow.phase} requires Artifact Readiness implementation-ready, got ${planReadiness}`);
  }
  if (phaseAtOrAfterExecution(workflow.phase) &&
      (workflow.execution_mode === "codex-goal" || workflow.execution_approval === "approved-goal") &&
      workflow.loop_review_status !== "approved") {
    issues.push(`workflow-state.yaml mismatch: Codex Goal mode requires loop_review_status approved, got ${workflow.loop_review_status || "missing"}`);
  }
  if (phaseAtOrAfterExecution(workflow.phase) &&
      (workflow.execution_mode === "codex-goal" || workflow.execution_approval === "approved-goal") &&
      planLoopReview !== "approved") {
    issues.push(`workflow-state.yaml mismatch: Codex Goal mode requires plan Loop Review approved, got ${planLoopReview}`);
  }

  if (workflow.phase === "complete" && workflow.next_skill !== "none") {
    issues.push(`workflow-state.yaml mismatch: phase=complete requires next_skill=none, got ${workflow.next_skill}`);
  }
  if (["delivery", "handoff", "complete"].includes(workflow.phase) && !["pass", "gap-recorded"].includes(workflow.verify_result)) {
    issues.push(`workflow-state.yaml mismatch: phase=${workflow.phase} requires verify_result pass or gap-recorded, got ${workflow.verify_result}`);
  }
}

function decodePowerShellEncodedCommand(value) {
  const match = String(value).match(/(?:^|\s)-EncodedCommand\s+([A-Za-z0-9+/=]+)/i);
  if (!match) return "";
  try {
    return Buffer.from(match[1], "base64").toString("utf16le");
  } catch {
    return "";
  }
}

function hookCommandMentionsDongSkills(group) {
  for (const hook of group.hooks || []) {
    for (const field of ["command", "commandWindows", "command_windows"]) {
      const value = String(hook[field] || "");
      if (value.includes("project-ops.mjs")) return true;
      if (value.includes("launch-project-ops.mjs")) return true;
      if ((field === "commandWindows" || field === "command_windows") &&
          /(?:project-ops|launch-project-ops)\.mjs/.test(decodePowerShellEncodedCommand(value))) {
        return true;
      }
    }
  }
  return false;
}

function checkWindowsHookCommand(group, eventName, issues) {
  for (const hook of group.hooks || []) {
    const value = String(hook.commandWindows || hook.command_windows || "");
    if (!value) continue;
    if (!value.includes("-EncodedCommand")) {
      issues.push(`.codex/hooks.json ${eventName} commandWindows must use -EncodedCommand to avoid PowerShell variable expansion`);
    } else if (!/(?:project-ops|launch-project-ops)\.mjs/.test(decodePowerShellEncodedCommand(value))) {
      issues.push(`.codex/hooks.json ${eventName} commandWindows encoded command does not invoke Dong Skills hook launcher`);
    } else {
      const decoded = decodePowerShellEncodedCommand(value);
      if (!decoded.includes("Get-Command pwsh")) {
        issues.push(`.codex/hooks.json ${eventName} commandWindows should prefer pwsh when available before falling back to powershell.exe`);
      }
      if (!decoded.includes("} else {")) {
        issues.push(`.codex/hooks.json ${eventName} commandWindows should keep a powershell.exe fallback for hosts without PowerShell 7`);
      }
    }
    if (value.includes('-Command "$root') || value.includes("2>$null")) {
      issues.push(`.codex/hooks.json ${eventName} commandWindows contains unsafe inline PowerShell variable syntax`);
    }
  }
}

function checkHooksJson(root, issues) {
  const file = path.join(root, ".codex", "hooks.json");
  if (!fs.existsSync(file)) {
    issues.push("Missing .codex/hooks.json");
    return;
  }

  let config;
  try {
    config = JSON.parse(readText(file));
  } catch (error) {
    issues.push(`Invalid .codex/hooks.json: ${error.message}`);
    return;
  }

  for (const eventName of REQUIRED_HOOK_EVENTS) {
    const groups = Array.isArray(config.hooks?.[eventName]) ? config.hooks[eventName] : [];
    if (!groups.some(hookCommandMentionsDongSkills)) {
      issues.push(`.codex/hooks.json is missing Dong Skills hook for ${eventName}`);
    }
    for (const group of groups) checkWindowsHookCommand(group, eventName, issues);
  }
}

function checkRuntimeGitignore(root, issues) {
  const file = path.join(root, ".gitignore");
  const text = readText(file);
  if (!text.includes(".codex-context/raw/*")) {
    issues.push(".gitignore does not ignore .codex-context/raw/*");
  }
  if (!text.includes("!.codex-context/raw/.gitkeep")) {
    issues.push(".gitignore does not keep .codex-context/raw/.gitkeep trackable");
  }
  if (!text.includes(".codex-context/discussion-state.json")) {
    issues.push(".gitignore does not ignore .codex-context/discussion-state.json");
  }
  if (!text.includes(".skillopt-sleep/")) {
    issues.push(".gitignore does not ignore .skillopt-sleep/");
  }
}

function checkTrackedRaw(root, issues) {
  try {
    const out = execFileSync("git", ["ls-files", ".codex-context/raw"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const tracked = out.split(/\r?\n/).filter(Boolean);
    const unsafe = tracked.filter((file) => !file.endsWith("/.gitkeep") && !file.endsWith("\\.gitkeep"));
    if (unsafe.length) {
      issues.push(`Tracked raw runtime file(s): ${unsafe.join(", ")}`);
    }
  } catch {
    // Non-git projects are allowed; hooks still work with filesystem state.
  }
}

function checkContext(root, issues) {
  const ctx = path.join(root, ".codex-context");
  for (const name of REQUIRED_CONTEXT_FILES) {
    if (!fs.existsSync(path.join(ctx, name))) issues.push(`Missing .codex-context/${name}`);
  }

  const spec = readText(path.join(ctx, "spec.md"));
  for (const headings of REQUIRED_SPEC_SECTIONS) {
    if (!hasAnyHeading(spec, headings)) {
      issues.push(`spec.md missing section: ${headingLabel(headings)}`);
    }
  }

  const plan = readText(path.join(ctx, "plan-progress.md"));
  for (const headings of REQUIRED_PLAN_SECTIONS) {
    if (!hasAnyHeading(plan, headings)) {
      issues.push(`plan-progress.md missing section: ${headingLabel(headings)}`);
    }
  }

  const handoff = readText(path.join(ctx, "handoff-summary.md"));
  for (const headings of REQUIRED_HANDOFF_SECTIONS) {
    if (!hasAnyHeading(handoff, headings)) {
      issues.push(`handoff-summary.md missing section: ${headingLabel(headings)}`);
    }
  }

  const checkpoint = sectionContent(handoff, ["Git Checkpoint", "Git 存档"]);
  for (const labels of REQUIRED_CHECKPOINT_FIELDS) {
    if (!labels.some((field) => checkpoint.includes(`${field}:`))) {
      issues.push(`handoff-summary.md Git Checkpoint missing field label: ${labels.join(" or ")}`);
    }
  }

  const worktree = readText(path.join(ctx, "worktree-state.md"));
  for (const headings of [
    ["Current Workspace", "当前工作区"],
    ["Primary Checkout", "主检出区"],
    ["Branch State", "分支状态"],
    ["Ownership And Cleanup", "所有权与清理"],
    ["Hook Root Notes", "Hook 根目录记录"],
    ["Resume Instructions", "恢复指令"]
  ]) {
    if (!hasAnyHeading(worktree, headings)) {
      issues.push(`worktree-state.md missing section: ${headingLabel(headings)}`);
    }
  }

  const workingNotes = readText(path.join(ctx, "working-notes.md"));
  for (const headings of [
    ["Purpose", "用途"],
    ["Current Findings", "当前发现"],
    ["Current Hypothesis", "当前假设"],
    ["Rejected Paths", "已排除路径"],
    ["Open Investigation Questions", "开放调查问题"],
    ["Next Verification Step", "下一步验证"],
    ["Promotion Notes", "提升记录"]
  ]) {
    if (!hasAnyHeading(workingNotes, headings)) {
      issues.push(`working-notes.md missing section: ${headingLabel(headings)}`);
    }
  }

  const workflow = normalizeWorkflowState(
    parseWorkflowYaml(readText(path.join(ctx, "workflow-state.yaml")))
  );
  issues.push(...validateWorkflowState(workflow).issues);
  if (workflow.task_id !== undefined && !/^task-\S+/.test(workflow.task_id || "")) {
    issues.push("workflow-state.yaml task_id must identify the current task");
  }
  if (workflow.task_generation !== undefined && !/^[1-9]\d*$/.test(workflow.task_generation || "")) {
    issues.push("workflow-state.yaml task_generation must be a positive integer");
  }
  checkWorkflowConsistency(workflow, spec, plan, issues);
}

function readJsonFile(file, issues, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    issues.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function projectSkillNames(root, issues) {
  const projectMarker = path.join(root, ".agents", "skills", ".dong-skills-project.json");
  if (fs.existsSync(projectMarker)) {
    const marker = readJsonFile(projectMarker, issues, ".agents/skills/.dong-skills-project.json");
    if (!marker) return [];
    if (marker.managed_by !== "Dong Skills") {
      issues.push(".agents/skills/.dong-skills-project.json is not marked as Dong Skills managed");
    }
    if (!Array.isArray(marker.installed_skills) || marker.installed_skills.length === 0) {
      issues.push(".agents/skills/.dong-skills-project.json has no installed_skills list");
      return [];
    }
    return marker.installed_skills;
  }

  const sourceManifest = path.join(root, "dong-skills.manifest.json");
  const sourceAssets = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops");
  if (fs.existsSync(sourceManifest) && fs.existsSync(sourceAssets)) {
    const manifest = readJsonFile(sourceManifest, issues, "dong-skills.manifest.json");
    if (!manifest) return [];
    if (!Array.isArray(manifest.project_skills) || manifest.project_skills.length === 0) {
      issues.push("dong-skills.manifest.json has no project_skills list");
      return [];
    }
    return manifest.project_skills;
  }

  issues.push("Missing project-level Dong Skills marker: .agents/skills/.dong-skills-project.json");
  return [];
}

function checkProjectSkills(root, issues) {
  const skillsRoot = path.join(root, ".agents", "skills");
  const names = projectSkillNames(root, issues);

  for (const name of names) {
    const skillDir = path.join(skillsRoot, name);
    const skillFile = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      issues.push(`Missing project-level Dong Skill: .agents/skills/${name}/SKILL.md`);
      continue;
    }

    const marker = path.join(skillDir, ".dong-skill-managed.json");
    const sourceManifest = path.join(root, "dong-skills.manifest.json");
    if (!fs.existsSync(sourceManifest) && !fs.existsSync(marker)) {
      issues.push(`Missing Dong Skills managed marker for project skill: .agents/skills/${name}/.dong-skill-managed.json`);
    }
  }
}

function checkSourceManifestCoverage(root, issues) {
  const manifestFile = path.join(root, "dong-skills.manifest.json");
  const assetRoot = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops");
  if (!fs.existsSync(manifestFile) || !fs.existsSync(assetRoot)) return;

  const manifest = readJsonFile(manifestFile, issues, "dong-skills.manifest.json");
  if (!manifest) return;
  const globalSkills = Array.isArray(manifest.global_skills) ? manifest.global_skills : [];
  const projectSkills = Array.isArray(manifest.project_skills) ? manifest.project_skills : [];
  if (new Set(globalSkills).size !== globalSkills.length) {
    issues.push("dong-skills.manifest.json contains duplicate global skill names");
  }
  if (new Set(projectSkills).size !== projectSkills.length) {
    issues.push("dong-skills.manifest.json contains duplicate project skill names");
  }
  const expected = new Set([...globalSkills, ...projectSkills]);

  const skillsRoot = path.join(root, ".agents", "skills");
  const actual = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name);

  for (const name of expected) {
    if (!actual.includes(name)) {
      issues.push(`Dong Skills manifest declares a missing source skill: .agents/skills/${name}/SKILL.md`);
    }
  }
  for (const name of actual) {
    if (!expected.has(name)) {
      issues.push(`Dong Skills source skill is omitted from the manifest: .agents/skills/${name}`);
    }
  }
}

function checkInstallReceipt(root, issues) {
  const markerFile = path.join(root, ".agents", "skills", ".dong-skills-project.json");
  if (!fs.existsSync(markerFile)) return;
  const marker = readJsonFile(markerFile, issues, ".agents/skills/.dong-skills-project.json");
  if (!marker) return;
  if (marker.schema !== "dong-skills.project-install.v2") {
    if (marker.runtime_contract === "project-ops-v2") {
      issues.push("Dong Skills project marker predates the v2 content receipt; rerun project bootstrap");
    }
    return;
  }

  const receipt = marker.content_receipt;
  if (!receipt || receipt.algorithm !== "sha256-tree-v1" ||
      !receipt.skill_trees || typeof receipt.skill_trees !== "object" ||
      Array.isArray(receipt.skill_trees)) {
    issues.push(".agents/skills/.dong-skills-project.json has no valid content_receipt");
    return;
  }
  if (typeof marker.source_manifest_sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(marker.source_manifest_sha256)) {
    issues.push(".agents/skills/.dong-skills-project.json has no valid source_manifest_sha256");
  }

  for (const name of marker.installed_skills || []) {
    const expected = receipt.skill_trees[name];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
      issues.push(`Dong Skills content receipt is missing a valid skill hash: ${name}`);
      continue;
    }
    const skillDir = path.join(root, ".agents", "skills", name);
    if (!fs.existsSync(skillDir)) continue;
    if (treeSha256(skillDir) !== expected) {
      issues.push(`Managed Dong Skill content differs from install receipt: .agents/skills/${name}`);
    }
  }

  if (!receipt.runtime_files || typeof receipt.runtime_files !== "object" ||
      Array.isArray(receipt.runtime_files) || Object.keys(receipt.runtime_files).length === 0) {
    issues.push("Dong Skills content receipt has no managed runtime files");
    return;
  }
  for (const [relative, expected] of Object.entries(receipt.runtime_files)) {
    const normalized = String(relative).replace(/\\/g, "/");
    const resolved = path.resolve(root, normalized);
    const rootPrefix = `${path.resolve(root)}${path.sep}`;
    if (!normalized.startsWith(".codex/") ||
        !resolved.startsWith(rootPrefix) ||
        typeof expected !== "string" ||
        !/^[a-f0-9]{64}$/.test(expected)) {
      issues.push(`Dong Skills content receipt has an invalid runtime entry: ${relative}`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      issues.push(`Managed Dong Skills runtime file is missing: ${normalized}`);
      continue;
    }
    if (sha256(resolved) !== expected) {
      issues.push(`Managed Dong Skills runtime content differs from install receipt: ${normalized}`);
    }
  }
}

function checkRuntimeContract(root, issues) {
  const markerFile = path.join(root, ".agents", "skills", ".dong-skills-project.json");
  if (!fs.existsSync(markerFile)) return;
  const marker = readJsonFile(markerFile, issues, ".agents/skills/.dong-skills-project.json");
  if (!marker || marker.runtime_contract !== "project-ops-v2") return;
  const hook = path.join(root, ".codex", "hooks", "project-ops.mjs");
  try {
    const output = execFileSync(process.execPath, [hook, "context-budget", root], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (!/Hot budget status:\s*(ok|warn|fail)\b/i.test(output)) {
      issues.push("Dong Skills runtime contract smoke returned an unrecognized context-budget result");
    }
  } catch (error) {
    issues.push(`Dong Skills runtime contract smoke failed: ${String(error.stderr || error.message).trim()}`);
  }
}

function checkAssetParity(root, issues) {
  const assetRoot = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops");
  if (!fs.existsSync(assetRoot)) return;

  const pairs = [
    [
      path.join(root, ".codex", "hooks", "launch-project-ops.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks", "launch-project-ops.mjs")
    ],
    [
      path.join(root, ".codex", "hooks", "project-ops.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks", "project-ops.mjs")
    ],
    [
      path.join(root, "AGENTS.project-ops.snippet.md"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "AGENTS.project-ops.snippet.md")
    ],
    [
      path.join(root, "dong-skills.manifest.json"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "dong-skills.manifest.json")
    ],
    [
      path.join(root, "scripts", "instincts.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "instincts.mjs")
    ],
    [
      path.join(root, "scripts", "asset-governance.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "asset-governance.mjs")
    ],
    [
      path.join(root, "scripts", "context-recovery-eval.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "context-recovery-eval.mjs")
    ],
    [
      path.join(root, "scripts", "project-ops-health.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "project-ops-health.mjs")
    ],
    [
      path.join(root, "scripts", "release-check.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "release-check.mjs")
    ],
    [
      path.join(root, "scripts", "skill-forward-eval.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "skill-forward-eval.mjs")
    ],
    [
      path.join(root, "scripts", "state-prune.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "state-prune.mjs")
    ],
    [
      path.join(root, "scripts", "workflow-state.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "workflow-state.mjs")
    ],
    [
      path.join(root, "scripts", "solutions.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "solutions.mjs")
    ],
    [
      path.join(root, "scripts", "session-history.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "session-history.mjs")
    ],
    [
      path.join(root, "scripts", "skill-evolution.mjs"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", "scripts", "skill-evolution.mjs")
    ]
  ];

  for (const [rootFile, assetFile] of pairs) {
    if (!fs.existsSync(rootFile) || !fs.existsSync(assetFile)) {
      const missing = fs.existsSync(rootFile) ? assetFile : rootFile;
      issues.push(`Bootstrap asset file mismatch: ${path.relative(root, missing).replace(/\\/g, "/")}`);
      continue;
    }
    if (sha256(rootFile) !== sha256(assetFile)) {
      issues.push(`Bootstrap asset differs from root file: ${path.relative(root, assetFile).replace(/\\/g, "/")}`);
    }
  }

  const rootLib = path.join(root, ".codex", "scripts", "lib");
  const assetLib = path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "scripts", "lib");
  if (!fs.existsSync(rootLib) || !fs.existsSync(assetLib)) {
    issues.push("Bootstrap asset is missing .codex/scripts/lib parity tree");
    return;
  }

  const rootFiles = walkFiles(rootLib)
    .map((file) => path.relative(rootLib, file).replace(/\\/g, "/"))
    .sort();
  const assetFiles = walkFiles(assetLib)
    .map((file) => path.relative(assetLib, file).replace(/\\/g, "/"))
    .sort();
  const allFiles = new Set([...rootFiles, ...assetFiles]);
  for (const relFile of allFiles) {
    const rootFile = path.join(rootLib, relFile);
    const assetFile = path.join(assetLib, relFile);
    if (!fs.existsSync(rootFile) || !fs.existsSync(assetFile)) {
      issues.push(`Bootstrap asset lib file mismatch: ${relFile}`);
    } else if (sha256(rootFile) !== sha256(assetFile)) {
      issues.push(`Bootstrap asset differs from root lib file: .codex/scripts/lib/${relFile}`);
    }
  }
}

function run(root) {
  const issues = [];

  if (!fs.existsSync(path.join(root, ".codex", "hooks", "project-ops.mjs"))) {
    issues.push("Missing .codex/hooks/project-ops.mjs");
  }
  if (!fs.existsSync(path.join(root, ".codex", "hooks", "launch-project-ops.mjs"))) {
    issues.push("Missing .codex/hooks/launch-project-ops.mjs");
  }
  if (!fs.existsSync(path.join(root, ".codex", "scripts", "instincts.mjs")) &&
      !fs.existsSync(path.join(root, "scripts", "instincts.mjs"))) {
    issues.push("Missing project ops instincts script");
  }
  if (!fs.existsSync(path.join(root, ".codex", "scripts", "lib", "core.mjs"))) {
    issues.push("Missing .codex/scripts/lib/core.mjs required by split project hook");
  }
  for (const scriptName of ["asset-governance.mjs", "context-recovery-eval.mjs", "project-ops-health.mjs", "release-check.mjs", "skill-forward-eval.mjs", "state-prune.mjs", "workflow-state.mjs", "solutions.mjs", "session-history.mjs", "skill-evolution.mjs"]) {
    if (!fs.existsSync(path.join(root, ".codex", "scripts", scriptName)) &&
        !fs.existsSync(path.join(root, "scripts", scriptName))) {
      issues.push(`Missing project ops helper script: ${scriptName}`);
    }
  }

  checkHooksJson(root, issues);
  checkRuntimeGitignore(root, issues);
  checkTrackedRaw(root, issues);
  checkContext(root, issues);
  checkProjectSkills(root, issues);
  checkSourceManifestCoverage(root, issues);
  checkInstallReceipt(root, issues);
  checkRuntimeContract(root, issues);
  checkAssetParity(root, issues);

  const lines = [
    "Dong Skills health check",
    `Root: ${root}`,
    "",
    ...worktreeHealthLines(detectWorktree(root)),
    ""
  ];

  if (issues.length) {
    lines.push("Issues:");
    for (const issue of issues) lines.push(`- ${issue}`);
  } else {
    lines.push("Issues: none");
  }

  lines.push("", issues.length ? "Result: fail" : "Result: pass");
  return { ok: issues.length === 0, text: lines.join("\n") };
}

const root = gitRoot(process.argv[2] || process.cwd());
const result = run(root);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
