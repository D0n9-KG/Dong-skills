#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const REQUIRED_WORKFLOW_EXPORTS = [
  "normalizeWorkflowState",
  "parseWorkflowYaml",
  "validateWorkflowState",
  "workflowConsistencyStatus"
];

function validateWorkflowRuntime(module, runtime) {
  const missing = REQUIRED_WORKFLOW_EXPORTS.filter((name) => typeof module?.[name] !== "function");
  if (missing.length) {
    throw new Error(`Dong Skills workflow API mismatch in ${runtime}; missing function export(s): ${missing.join(", ")}`);
  }
  return module;
}

async function loadWorkflowRuntime() {
  const candidates = [
    path.join(scriptDirectory, "lib", "workflow.mjs"),
    path.join(scriptDirectory, "..", ".codex", "scripts", "lib", "workflow.mjs"),
    path.join(
      scriptDirectory,
      "..",
      ".agents",
      "skills",
      "codex-codebase-onboarding",
      "assets",
      "project-ops",
      ".codex",
      "scripts",
      "lib",
      "workflow.mjs"
    )
  ];
  const failures = [];
  for (const runtime of candidates) {
    if (!fs.existsSync(runtime)) continue;
    try {
      return validateWorkflowRuntime(await import(pathToFileURL(runtime).href), runtime);
    } catch (error) {
      failures.push(`${runtime}: ${error.message}`);
    }
  }
  const detail = failures.length ? ` Load failures: ${failures.join(" | ")}` : "";
  throw new Error(`Dong Skills workflow runtime is unavailable. Checked: ${candidates.join(", ")}.${detail}`);
}

async function loadRuntimeSupport() {
  const candidates = [
    path.join(scriptDirectory, "lib", "runtime.mjs"),
    path.join(scriptDirectory, "..", ".codex", "scripts", "lib", "runtime.mjs")
  ];
  const runtime = candidates.find((candidate) => fs.existsSync(candidate));
  if (!runtime) {
    throw new Error(`Dong Skills hook runtime support is missing. Checked: ${candidates.join(", ")}`);
  }
  return import(pathToFileURL(runtime).href);
}

let workflowRuntime;
try {
  workflowRuntime = await loadWorkflowRuntime();
} catch (error) {
  process.stdout.write([
    "Dong Skills project health",
    "",
    "Hook control plane:",
    "- Static configuration: unavailable",
    "- Runtime parity: fail",
    "- Recent hook liveness: unavailable",
    "",
    "Issues:",
    `- ${error.message}`,
    "",
    "Result: fail",
    ""
  ].join("\n"));
  process.exit(1);
}

const {
  normalizeWorkflowState,
  parseWorkflowYaml,
  validateWorkflowState,
  workflowConsistencyStatus
} = workflowRuntime;
let hookLivenessStatus = null;
let runtimeSupportError = "";
try {
  ({ hookLivenessStatus } = await loadRuntimeSupport());
  if (typeof hookLivenessStatus !== "function") {
    throw new Error("Dong Skills hook runtime API mismatch; missing function export: hookLivenessStatus");
  }
} catch (error) {
  runtimeSupportError = error.message;
}

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
const CRITICAL_LIVENESS_EVENTS = ["PreToolUse", "PostToolUse", "Stop"];

const REQUIRED_HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SubagentStart",
  "SubagentStop",
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

function textSha256(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
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
    if (!labels.some((field) => checkpoint.includes(`${field}:`) || checkpoint.includes(`${field}：`))) {
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
  issues.push(...workflowConsistencyStatus(root, ctx, workflow).issues);
}

function headingLines(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter((item) => /^#{1,3}\s+/.test(item.line.trim()));
}

function firstHeadings(markdown, count = 5) {
  return headingLines(markdown)
    .slice(0, count)
    .map((item) => item.line.replace(/^#{1,3}\s+/, "").trim());
}

function firstSectionHeading(markdown) {
  const item = headingLines(markdown).find((candidate) => /^#{2,3}\s+/.test(candidate.line.trim()));
  return item ? item.line.replace(/^#{2,3}\s+/, "").trim() : "";
}

function matchCount(text, patterns) {
  return patterns.reduce((total, pattern) => total + (String(text || "").match(pattern) || []).length, 0);
}

function repeatedHeadingNames(markdown, minimum = 3) {
  const counts = new Map();
  for (const item of headingLines(markdown)) {
    const name = item.line.replace(/^#{1,3}\s+/, "").trim();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .map(([name, count]) => `${name} (${count})`);
}

function checkSemanticContext(root, warnings) {
  const ctx = path.join(root, ".codex-context");
  const handoff = readText(path.join(ctx, "handoff-summary.md"));
  const current = readText(path.join(ctx, "current-state.md"));
  const workingNotes = readText(path.join(ctx, "working-notes.md"));
  const questions = readText(path.join(ctx, "open-questions.md"));

  const handoffFirstSection = firstSectionHeading(handoff);
  if (handoffFirstSection &&
      /(dong skills|hook|hooks|stop|precompact|mutation|runtime|freshness|recovery)/i.test(handoffFirstSection) &&
      !/^(objective|目标|latest user instruction|最新用户指令)$/i.test(handoffFirstSection)) {
    warnings.push("handoff-summary.md top appears focused on Dong Skills maintenance; active handoff should start from the business task and archive resolved infrastructure/debug history");
  }

  const currentMaintenanceMentions = matchCount(current, [/stop hook/gi, /\bstop\b/gi, /precompact/gi, /recovery gate/gi, /runtime/gi]);
  if (currentMaintenanceMentions >= 8) {
    warnings.push("current-state.md contains many Stop/hook/runtime entries; compact resolved infrastructure history and keep active state to current project truth");
  }
  if (/(仍|still|not).*?(未收口|risk|风险|fail|失败)/i.test(current) &&
      /(已|pass|通过|resolved|收口).*?(stop|freshness|回归)/i.test(current)) {
    warnings.push("current-state.md may contain both unresolved and resolved versions of one issue; rewrite active summary to one current conclusion");
  }

  const workingMaintenanceSections = matchCount(workingNotes, [/^#{2,3}\s+.*\bstop\b/gim, /^#{2,3}\s+.*hook/gim, /^#{2,3}\s+.*git status/gim]);
  if (workingMaintenanceSections >= 5) {
    warnings.push("working-notes.md looks like a closed Stop/Git/hook investigation log; archive detailed history after promoting the current conclusion");
  }

  const repeatedQuestions = repeatedHeadingNames(questions, 3);
  if (repeatedQuestions.length) {
    warnings.push(`open-questions.md has repeated headings (${repeatedQuestions.slice(0, 5).join(", ")}); mark old entries resolved/superseded or archive duplicates`);
  }
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
  if (typeof marker.distribution_id !== "string" ||
      !/^[a-f0-9]{64}$/.test(marker.distribution_id)) {
    issues.push(".agents/skills/.dong-skills-project.json has no valid distribution_id; reinstall or bootstrap the project with the current Dong Skills distribution");
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
      path.join(root, ".codex", "hooks.json"),
      path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops", ".codex", "hooks.json")
    ],
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
  const hookIssues = [];
  const parityIssues = [];
  const warnings = [];

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

  checkHooksJson(root, hookIssues);
  checkRuntimeGitignore(root, issues);
  checkTrackedRaw(root, issues);
  checkContext(root, issues);
  checkSemanticContext(root, warnings);
  checkProjectSkills(root, issues);
  checkSourceManifestCoverage(root, issues);
  checkInstallReceipt(root, issues);
  checkRuntimeContract(root, parityIssues);
  checkAssetParity(root, parityIssues);
  if (runtimeSupportError) parityIssues.push(runtimeSupportError);
  issues.push(...hookIssues, ...parityIssues);
  const liveness = hookLivenessStatus
    ? hookLivenessStatus(root, path.join(root, ".codex-context"), {
        requiredEvents: CRITICAL_LIVENESS_EVENTS
      })
    : {
        status: "unavailable",
        recent: false,
        lastEvent: "unknown",
        lastSeenAt: "",
        events: {},
        missingEvents: CRITICAL_LIVENESS_EVENTS,
        detail: runtimeSupportError || "hook runtime support unavailable"
      };

  const lines = [
    "Dong Skills health check",
    `Root: ${root}`,
    "",
    ...worktreeHealthLines(detectWorktree(root)),
    "",
    "Hook control plane:",
    `- Static configuration: ${hookIssues.length ? "fail" : "pass"}`,
    `- Runtime parity: ${parityIssues.length ? "fail" : "pass"}`,
    `- Recent hook liveness: ${liveness.status}`,
    "- Host trust: not proven by health-check",
    `- Last event: ${liveness.lastEvent}`,
    `- Last seen: ${liveness.lastSeenAt || "not observed"}`,
    `- Critical event coverage: ${liveness.missingEvents.length ? "incomplete" : "complete"}`,
    `- Missing critical events: ${liveness.missingEvents.length ? liveness.missingEvents.join(", ") : "none"}`,
    ""
  ];

  if (!liveness.recent) {
    warnings.push(`Hook liveness is ${liveness.status}: ${liveness.detail}. This does not prove whether host trust is enabled.`);
  }
  if (liveness.recent && liveness.missingEvents.length) {
    warnings.push(`Recent liveness does not yet cover critical events: ${liveness.missingEvents.join(", ")}.`);
  }
  if (warnings.length) {
    lines.push("Warnings:");
    for (const warning of warnings) lines.push(`- ${warning}`);
    lines.push("");
  }

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
