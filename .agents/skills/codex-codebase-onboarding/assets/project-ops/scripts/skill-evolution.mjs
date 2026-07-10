#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

const TASK_FORMAT = "skillopt_sleep.tasks.v1";
const LOG_FILE = path.join("docs", "improvements", "evolution-log.md");
const DEFAULT_TASKS_FILE = path.join(".codex-context", "raw", "skill-evolution-tasks.json");
const SUPPORTED_RULE_JUDGE_OPS = new Set([
  "section_present",
  "regex",
  "max_chars",
  "min_chars",
  "contains",
  "tool_called"
]);

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

function normalizePathCandidate(value) {
  if (!value || typeof value !== "string") return "";
  const expanded = value.replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || "~");
  try {
    return path.resolve(expanded);
  } catch {
    return "";
  }
}

function isInside(parent, child) {
  const relPath = path.relative(parent, child);
  return relPath === "" || (!!relPath && !relPath.startsWith("..") && !path.isAbsolute(relPath));
}

function installedSkillRoots() {
  const home = os.homedir();
  return [
    path.join(home, ".agents", "skills"),
    path.join(home, ".codex", "skills")
  ];
}

function isInstalledSkillCopy(candidate) {
  const resolved = normalizePathCandidate(candidate);
  return installedSkillRoots().some((skillsRoot) => isInside(skillsRoot, resolved));
}

function dongSkillsBacklog(candidate) {
  return path.join(candidate, "docs", "improvements", "backlog.md");
}

function isDongSkillsSourceRepo(candidate) {
  const resolved = normalizePathCandidate(candidate);
  if (!resolved || isInstalledSkillCopy(resolved)) return false;
  return fs.existsSync(dongSkillsBacklog(resolved)) &&
    fs.existsSync(path.join(resolved, ".agents", "skills", "codex-skill-evolution", "SKILL.md"));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function sourceMarkerCandidates(env = process.env) {
  if (env.DONG_SKILLS_DISABLE_SOURCE_MARKER === "1") return [];
  const candidates = [];
  for (const skillsRoot of installedSkillRoots()) {
    const marker = path.join(skillsRoot, ".dong-skills-source.json");
    const data = readJson(marker);
    if (!data) continue;
    for (const key of ["source_repo", "sourceRepo", "repo", "root"]) {
      if (typeof data[key] === "string") {
        candidates.push({ path: data[key], source: `source marker ${path.basename(marker)}` });
      }
    }
  }
  return candidates;
}

function parentCandidates(root) {
  const candidates = [];
  let current = normalizePathCandidate(root);
  for (let depth = 0; current && depth < 5; depth += 1) {
    candidates.push({ path: current, source: depth === 0 ? "current repo" : "parent repo" });
    candidates.push({ path: path.join(current, "outputs", "codex-project-ops-kit"), source: "known checkout candidate" });
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates;
}

function findDongSkillsRepo(invocationRoot, options, env = process.env) {
  const candidates = [
    { path: options.dongSkillsRepo, source: "--dong-skills-repo" },
    { path: env.DONG_SKILLS_REPO, source: "DONG_SKILLS_REPO" },
    { path: env.DONG_SKILLS_HOME, source: "DONG_SKILLS_HOME" },
    ...sourceMarkerCandidates(env),
    ...parentCandidates(invocationRoot)
  ];
  const seen = new Set();
  const rejectedInstalledCopies = [];
  for (const candidate of candidates) {
    const resolved = normalizePathCandidate(candidate.path);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    if (isInstalledSkillCopy(resolved)) {
      rejectedInstalledCopies.push(resolved);
      continue;
    }
    if (isDongSkillsSourceRepo(resolved)) {
      return {
        found: true,
        root: resolved,
        source: candidate.source,
        rejectedInstalledCopies
      };
    }
  }
  return { found: false, root: "", source: "not found", rejectedInstalledCopies };
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function parseArgs(argv) {
  const maybeRoot = argv[0] && !argv[0].startsWith("--") ? argv[0] : process.cwd();
  const invocationRoot = gitRoot(maybeRoot);
  const rest = argv[0] && !argv[0].startsWith("--") ? argv.slice(1) : argv;
  const command = rest[0] && !rest[0].startsWith("--") ? rest[0] : "status";
  const flags = rest[0] && !rest[0].startsWith("--") ? rest.slice(1) : rest;
  const options = { passthrough: [] };

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const value = flags[index + 1];
    if (flag === "--output") {
      options.output = value;
      index += 1;
    } else if (flag.startsWith("--output=")) {
      options.output = flag.slice("--output=".length);
    } else if (flag === "--tasks-file") {
      options.tasksFile = value;
      index += 1;
    } else if (flag.startsWith("--tasks-file=")) {
      options.tasksFile = flag.slice("--tasks-file=".length);
    } else if (flag === "--backend") {
      options.backend = value;
      index += 1;
    } else if (flag.startsWith("--backend=")) {
      options.backend = flag.slice("--backend=".length);
    } else if (flag === "--target-skill") {
      options.targetSkill = value;
      index += 1;
    } else if (flag.startsWith("--target-skill=")) {
      options.targetSkill = flag.slice("--target-skill=".length);
    } else if (flag === "--skillopt-repo") {
      options.skilloptRepo = value;
      index += 1;
    } else if (flag.startsWith("--skillopt-repo=")) {
      options.skilloptRepo = flag.slice("--skillopt-repo=".length);
    } else if (flag === "--dong-skills-repo") {
      options.dongSkillsRepo = value;
      index += 1;
    } else if (flag.startsWith("--dong-skills-repo=")) {
      options.dongSkillsRepo = flag.slice("--dong-skills-repo=".length);
    } else if (flag === "--project-outbox-root") {
      options.projectOutboxRoot = value;
      index += 1;
    } else if (flag.startsWith("--project-outbox-root=")) {
      options.projectOutboxRoot = flag.slice("--project-outbox-root=".length);
    } else if (flag === "--confirm-reviewed") {
      options.confirmReviewed = true;
    } else if (flag === "--json") {
      options.json = true;
    } else {
      options.passthrough.push(flag);
    }
  }

  const repo = findDongSkillsRepo(invocationRoot, options);
  const root = repo.found ? repo.root : invocationRoot;
  options.invocationRoot = invocationRoot;
  options.dongSkillsRepo = repo;
  return { root, command, options };
}

function resolveProjectPath(root, value, fallback) {
  const raw = value || fallback;
  const expanded = String(raw || "").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || "~");
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(root, expanded);
}

function skillOptEnvRepo(options) {
  return options.skilloptRepo ||
    process.env.SKILLOPT_SLEEP_REPO ||
    process.env.SKILLOPT_REPO ||
    "";
}

function pythonArgsForSkillOpt(action, root, options) {
  const args = ["-m", "skillopt_sleep", action, "--project", root, "--source", "codex"];
  const backend = options.backend || (action === "run" ? "" : "mock");
  if (backend) args.push("--backend", backend);
  if (options.tasksFile) args.push("--tasks-file", resolveProjectPath(root, options.tasksFile));
  if (options.targetSkill) args.push("--target-skill-path", resolveProjectPath(root, options.targetSkill));
  if (options.json) args.push("--json");
  args.push(...options.passthrough);
  return args;
}

function runPythonModule(root, action, options) {
  const repo = skillOptEnvRepo(options);
  const env = { ...process.env };
  if (repo) env.PYTHONPATH = [repo, env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  const python = process.env.PYTHON || "python";
  const args = pythonArgsForSkillOpt(action, root, options);
  const result = spawnSync(python, args, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return { ...result, args, python, repo };
}

function detectSkillOpt(root, options) {
  const result = runPythonModule(root, "status", { ...options, json: true });
  const available = result.status === 0;
  return {
    available,
    python: result.python,
    repo: result.repo || "",
    command: `${result.python} ${result.args.join(" ")}`,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function splitBacklogItems(text) {
  const matches = [...String(text || "").matchAll(/^###\s+(.+?)\s*$(.*?)(?=^###\s+|\s*$)/gms)];
  return matches.map((match) => ({ title: match[1].trim(), body: match[2].trim() }));
}

function pendingBacklogItems(root) {
  const file = path.join(root, "docs", "improvements", "backlog.md");
  return splitBacklogItems(readText(file))
    .filter((item) => !/^status:\s*(done|rejected)\b/im.test(item.body))
    .filter((item) => /skill|hook|brainstorm|compact|handoff|install|bootstrap|workflow|learning|memory|context|review|checkpoint|evolution|SkillOpt/i.test(`${item.title}\n${item.body}`))
    .slice(0, 20)
    .map((item, index) => taskFromItem(root, item, index + 1, "docs/improvements/backlog.md"));
}

function pendingOutboxItems(root, sourceRoot = root) {
  const file = path.join(sourceRoot, ".codex-context", "dong-skills-outbox.md");
  return splitBacklogItems(readText(file))
    .filter((item) => !/^status:\s*(done|migrated|rejected)\b/im.test(item.body))
    .slice(0, 20)
    .map((item, index) => taskFromItem(root, item, index + 1, rel(root, file)));
}

function taskFromItem(root, item, index, sourcePath) {
  const text = `${item.title}\n${item.body}`.replace(/\r?\n{3,}/g, "\n\n").trim();
  const target = inferTargetSkill(root, text);
  const rule = inferRule(text);
  return {
    id: `dong-skill-evolution-${index}-${slug(item.title)}`,
    project: root,
    intent: `Improve Dong Skills behavior for: ${item.title}`,
    context_excerpt: truncate(text, 900),
    attempted_solution: "",
    outcome: "unknown",
    reference_kind: "rule",
    reference: "",
    judge: {
      kind: "rule",
      checks: [
        { op: "contains", arg: "staged proposal" },
        { op: "contains", arg: rule },
        { op: "contains", arg: "do not auto-adopt" }
      ]
    },
    tags: ["dong-skills", "skill-evolution", target ? `target:${target}` : "target:unknown"],
    source_sessions: [sourcePath],
    split: index % 3 === 0 ? "val" : "train",
    origin: "real",
    derived_from: ""
  };
}

function inferTargetSkill(root, text) {
  const skillsDir = path.join(root, ".agents", "skills");
  if (!fs.existsSync(skillsDir)) return "";
  const names = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.length - a.length);
  const lower = String(text || "").toLowerCase();
  return names.find((name) => lower.includes(name.toLowerCase())) || "";
}

function inferRule(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("brainstorm")) return "ask one focused next question";
  if (lower.includes("compact") || lower.includes("handoff")) return "preserve recoverable handoff";
  if (lower.includes("hook")) return "keep hooks deterministic and Codex-compatible";
  if (lower.includes("learning") || lower.includes("memory")) return "separate project memory from Dong Skills meta-learning";
  if (lower.includes("install") || lower.includes("bootstrap")) return "preserve split project installation";
  return "preserve Dong Skills phase gates";
}

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

function truncate(value, limit) {
  const text = String(value || "");
  return text.length <= limit ? text : `${text.slice(0, limit - 20)}\n[truncated]`;
}

function redactPersistentText(value) {
  return String(value || "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/((?:[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|AUTHORIZATION))\s*[:=]\s*)([^\s"'`]+)/gi, "$1[REDACTED]")
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9][A-Za-z0-9_-]{10,}\b/g, "[REDACTED]");
}

function sanitizeForPersistence(value) {
  if (typeof value === "string") return redactPersistentText(value);
  if (Array.isArray(value)) return value.map(sanitizeForPersistence);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForPersistence(item)]));
  }
  return value;
}

function collectCandidates(root, options) {
  const output = resolveProjectPath(root, options.output, DEFAULT_TASKS_FILE);
  const outboxRoots = [root];
  const projectOutboxRoot = normalizePathCandidate(options.projectOutboxRoot || options.invocationRoot);
  if (projectOutboxRoot && !outboxRoots.some((item) => normalizePathCandidate(item) === projectOutboxRoot)) {
    outboxRoots.push(projectOutboxRoot);
  }
  const tasks = [
    ...pendingBacklogItems(root),
    ...outboxRoots.flatMap((outboxRoot) => pendingOutboxItems(root, outboxRoot))
  ];
  const payload = {
    format: TASK_FORMAT,
    project: root,
    invocation_project: options.invocationRoot || root,
    transcript_source: "dong-skills-backlog-outbox",
    n_sessions: 0,
    target_skill_path: options.targetSkill ? resolveProjectPath(root, options.targetSkill) : "",
    reviewed: false,
    tasks
  };
  writeText(output, `${JSON.stringify(sanitizeForPersistence(payload), null, 2)}\n`);
  return [
    "Dong Skills skill evolution candidates",
    `Dong Skills repo: ${root}`,
    `Repo source: ${options.dongSkillsRepo?.source || "current root"}`,
    `Output: ${rel(root, output)}`,
    `Tasks: ${tasks.length}`,
    "Reviewed: false",
    "",
    "Next:",
    "- Review and sanitize the tasks file.",
    "- Set reviewed to true only after privacy review.",
    "- Run skill-evolution dry-run with --backend mock."
  ].join("\n");
}

function statusText(root, options) {
  const detection = detectSkillOpt(root, options);
  const latest = latestStaging(root);
  const tasksFile = resolveProjectPath(root, options.tasksFile, DEFAULT_TASKS_FILE);
  const taskInfo = readTasksInfo(tasksFile);
  const lines = [
    "Dong Skills SkillOpt-Sleep integration status",
    `Invocation root: ${options.invocationRoot || root}`,
    `Dong Skills repo: ${root}`,
    `Repo source: ${options.dongSkillsRepo?.source || "current root"}`,
    `SkillOpt-Sleep available: ${detection.available ? "yes" : "no"}`,
    `SkillOpt repo override: ${detection.repo || "not set"}`,
    `Default tasks file: ${rel(root, tasksFile)}`,
    `Tasks file exists: ${fs.existsSync(tasksFile) ? "yes" : "no"}`,
    `Tasks reviewed: ${taskInfo.reviewed ? "yes" : "no"}`,
    `Task count: ${taskInfo.count}`,
    `Latest staging: ${latest ? rel(root, latest) : "none"}`,
    "",
    "Safety:",
    "- Offline/manual only; hooks must not run SkillOpt-Sleep.",
    "- Default flow stages proposals; do not use --auto-adopt.",
    "- Adopt requires --confirm-reviewed.",
    "- Keep .skillopt-sleep/ and raw task drafts out of Git."
  ];
  if (!detection.available) {
    lines.push("", "SkillOpt-Sleep is not callable. Set SKILLOPT_SLEEP_REPO to a local SkillOpt checkout or install the skillopt_sleep package, then rerun status.");
    if (detection.stderr.trim()) lines.push(`Last error: ${detection.stderr.trim().split(/\r?\n/).slice(-1)[0]}`);
  }
  if (!options.dongSkillsRepo?.found) {
    lines.push("", "Dong Skills source repo was not found. The current invocation root is being used as a fallback.");
  }
  return lines.join("\n");
}

function readTasksInfo(file) {
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    return { reviewed: payload.reviewed === true, count: Array.isArray(payload.tasks) ? payload.tasks.length : 0 };
  } catch {
    return { reviewed: false, count: 0 };
  }
}

function readTasksPayload(file) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Tasks file is not valid JSON: ${error.message}`);
  }
  if (payload.format !== TASK_FORMAT) {
    throw new Error(`Tasks file has unsupported format: ${payload.format || "missing"}`);
  }
  if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    throw new Error("Tasks file must contain at least one evaluation task.");
  }
  return payload;
}

function validateTaskJudges(payload, { requireHeldOut = false } = {}) {
  const issues = [];
  const ids = new Set();
  let trainCount = 0;
  let heldOutCount = 0;

  for (const [index, task] of payload.tasks.entries()) {
    const label = task.id || `task[${index}]`;
    if (!task.id) issues.push(`${label}: missing id`);
    else if (ids.has(task.id)) issues.push(`${label}: duplicate id`);
    else ids.add(task.id);

    const split = String(task.split || "").toLowerCase();
    if (split === "train") trainCount += 1;
    else if (["val", "validation", "held-out", "heldout", "test"].includes(split)) heldOutCount += 1;
    else issues.push(`${label}: split must be train or held-out/val`);

    if (task.judge?.kind !== "rule") {
      issues.push(`${label}: judge.kind must be rule`);
      continue;
    }
    const checks = task.judge.checks;
    if (!Array.isArray(checks) || checks.length === 0) {
      issues.push(`${label}: rule judge must contain checks`);
      continue;
    }
    for (const check of checks) {
      if (!SUPPORTED_RULE_JUDGE_OPS.has(check?.op)) {
        issues.push(`${label}: unsupported judge op ${check?.op || "missing"}`);
      }
    }
  }

  if (trainCount === 0) issues.push("tasks file requires at least one train task");
  if (requireHeldOut && heldOutCount === 0) {
    issues.push("real SkillOpt-Sleep run requires held-out evaluation tasks (split=val or held-out)");
  }
  return issues;
}

function assertTasksReady(root, options, { requireReviewed = false, requireHeldOut = false } = {}) {
  const tasksFile = resolveProjectPath(root, options.tasksFile, DEFAULT_TASKS_FILE);
  if (!fs.existsSync(tasksFile)) throw new Error(`Tasks file not found: ${rel(root, tasksFile)}`);
  const payload = readTasksPayload(tasksFile);
  if (requireReviewed && payload.reviewed !== true) {
    throw new Error(`Refusing real SkillOpt-Sleep run from unreviewed tasks file: ${rel(root, tasksFile)}`);
  }
  const issues = validateTaskJudges(payload, { requireHeldOut });
  if (issues.length > 0) {
    throw new Error(`SkillOpt-Sleep task validation failed:\n- ${issues.join("\n- ")}`);
  }
  return tasksFile;
}

function runSleep(root, action, options) {
  if (options.tasksFile || action === "run") {
    assertTasksReady(root, options, {
      requireReviewed: action === "run",
      requireHeldOut: action === "run"
    });
  }
  if (action === "run" && !options.backend) throw new Error("Real run requires explicit --backend, usually --backend codex.");
  const result = runPythonModule(root, action, options);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.status !== 0) {
    throw new Error(output || `SkillOpt-Sleep ${action} failed with exit ${result.status}`);
  }
  return output || `SkillOpt-Sleep ${action} completed.`;
}

function latestStaging(root) {
  const stagingRoot = path.join(root, ".skillopt-sleep", "staging");
  if (!fs.existsSync(stagingRoot)) return "";
  const dirs = fs.readdirSync(stagingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(stagingRoot, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return dirs[0] || "";
}

function inspectStage(root) {
  const latest = latestStaging(root);
  if (!latest) return "No SkillOpt-Sleep staging directory found.";
  const report = readText(path.join(latest, "report.md")) || readText(path.join(latest, "report.json"));
  return [
    `Latest staging: ${rel(root, latest)}`,
    "",
    report.trim() || "(staging report missing or empty)"
  ].join("\n");
}

function adopt(root, options) {
  if (!options.confirmReviewed) {
    throw new Error("Refusing adoption without --confirm-reviewed. Review report.md and proposed files first.");
  }
  const result = runPythonModule(root, "adopt", options);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.status !== 0) throw new Error(output || "SkillOpt-Sleep adopt failed");
  appendEvolutionLog(root, output);
  return [
    output,
    "",
    "Post-adoption verification required:",
    "- node scripts/run-domain-tests.mjs",
    "- node scripts/release-check.mjs ."
  ].join("\n");
}

function appendEvolutionLog(root, output) {
  const file = path.join(root, LOG_FILE);
  const existing = readText(file);
  const header = existing.trim() ? existing.trimEnd() : "# Dong Skills Evolution Log\n";
  const entry = [
    "",
    `## ${new Date().toISOString()} - SkillOpt-Sleep Adoption`,
    "",
    "Status: adopted",
    "",
    "Output:",
    "",
    "```text",
    redactPersistentText(output.trim()),
    "```",
    ""
  ].join("\n");
  writeText(file, `${header}\n${entry}`);
}

function usage() {
  return [
    "Usage: skill-evolution.mjs <root> <command> [options]",
    "",
    "Commands:",
    "  status",
    "  collect-candidates [--output <file>] [--target-skill <SKILL.md>]",
    "  dry-run --tasks-file <file> [--backend mock]",
    "  run --tasks-file <file> --backend codex --target-skill <SKILL.md>",
    "  inspect-stage",
    "  adopt --confirm-reviewed",
    "",
    "Environment:",
    "  SKILLOPT_SLEEP_REPO or SKILLOPT_REPO can point to a local microsoft/SkillOpt checkout.",
    "  DONG_SKILLS_REPO or DONG_SKILLS_HOME can point to the Dong Skills source checkout.",
    "  --project-outbox-root <repo> can add a project outbox as candidate input."
  ].join("\n");
}

const { root, command, options } = parseArgs(process.argv.slice(2));

try {
  let text = "";
  switch (command) {
    case "status":
      text = statusText(root, options);
      break;
    case "collect-candidates":
      text = collectCandidates(root, options);
      break;
    case "dry-run":
      text = runSleep(root, "dry-run", { ...options, backend: options.backend || "mock" });
      break;
    case "run":
      text = runSleep(root, "run", options);
      break;
    case "inspect-stage":
      text = inspectStage(root);
      break;
    case "adopt":
      text = adopt(root, options);
      break;
    case "help":
    case "--help":
    case "-h":
      text = usage();
      break;
    default:
      throw new Error(`Unknown skill-evolution command: ${command}\n\n${usage()}`);
  }
  console.log(text);
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
