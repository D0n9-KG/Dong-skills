#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const EXCLUDED_DIRS = new Set([".git", ".codegraph", "node_modules", "dist", "build", ".next", "__pycache__"]);
const TEXT_EXTENSIONS = new Set([".md", ".mjs", ".js", ".json", ".ps1", ".txt", ".toml", ".yml", ".yaml"]);
const READABILITY_SCAN_DIRS = [
  ".agents/",
  ".codex/",
  ".codex-context/",
  "docs/",
  "scripts/",
  "tests/"
];
const READABILITY_SCAN_FILES = new Set([
  "README.md",
  "AGENTS.md",
  "AGENTS.project-ops.snippet.md"
]);
const MAX_TEXT_FILE_BYTES = 512 * 1024;
const HOT_CONTEXT_WARN_LIMIT = 35_000;
const HOT_CONTEXT_FAIL_LIMIT = 45_000;

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

function walk(root, relDir = "", out = []) {
  const dir = path.join(root, relDir);
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const rel = path.join(relDir, entry.name);
    const full = path.join(root, rel);
    if (entry.isDirectory()) walk(root, rel, out);
    else out.push(full);
  }
  return out;
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function findHelperScript(root, scriptName) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(root, "scripts", scriptName),
    path.join(root, ".codex", "scripts", scriptName),
    path.join(scriptDir, scriptName),
    path.join(scriptDir, "..", ".codex", "scripts", scriptName)
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function runCommand(label, command, args, options = {}) {
  try {
    execFileSync(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, label };
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return { ok: false, label, details };
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fromCodePoints(points) {
  return String.fromCodePoint(...points);
}

function textReadabilityPatterns() {
  const latinMojibakePattern = new RegExp([
    `${escapeRegExp(fromCodePoints([0x00c3]))}.`,
    `${escapeRegExp(fromCodePoints([0x00c2]))}.`,
    `${escapeRegExp(fromCodePoints([0x00e2]))}[\\u0080-\\u009F\\u20AC]`
  ].join("|"), "u");
  const cjkMojibakeMarkers = [
    [0x93b8],
    [0x9359],
    [0x7481, 0x9881],
    [0x6d7c, 0x6a3a],
    [0x6d93, 0x20ac]
  ].map(fromCodePoints);

  return [
    { name: "ANSI escape sequence", regex: /\u001b\[[0-?]*[ -/]*[@-~]/u },
    { name: "unexpected control character", regex: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u },
    { name: "Unicode replacement character", regex: /\uFFFD/u },
    { name: "private-use character often produced by mojibake", regex: /[\uE000-\uF8FF]/u },
    { name: "Latin UTF-8 mojibake", regex: latinMojibakePattern },
    {
      name: "Chinese mojibake marker",
      regex: new RegExp(cjkMojibakeMarkers.map(escapeRegExp).join("|"), "u")
    }
  ];
}

function shouldScanTextFile(root, file) {
  const relative = rel(root, file);
  if (relative.startsWith(".codex-context/raw/")) return false;
  if (relative.startsWith(".codex-context/archive/")) return false;
  if (READABILITY_SCAN_FILES.has(relative)) return true;
  if (!TEXT_EXTENSIONS.has(path.extname(file))) return false;
  return READABILITY_SCAN_DIRS.some((prefix) => relative.startsWith(prefix));
}

function syntaxChecks(root) {
  const files = walk(root).filter((file) => file.endsWith(".mjs"));
  return files.map((file) => runCommand(`node --check ${rel(root, file)}`, process.execPath, ["--check", file], { cwd: root }));
}

function canRunPowerShellHost(command) {
  try {
    execFileSync(command, ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return true;
  } catch {
    return false;
  }
}

function findPowerShellHost() {
  const candidates = ["pwsh", "pwsh.exe", "powershell.exe"];
  return candidates.find(canRunPowerShellHost) || "powershell.exe";
}

function powershellParseChecks(root) {
  if (process.platform !== "win32") return [];
  const host = findPowerShellHost();
  const files = walk(root).filter((file) => file.endsWith(".ps1"));
  return files.map((file) => {
    const script = [
      "$tokens=$null",
      "$errors=$null",
      `[System.Management.Automation.Language.Parser]::ParseFile('${file.replace(/'/g, "''")}', [ref]$tokens, [ref]$errors) > $null`,
      "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }"
    ].join("; ");
    return runCommand(`PowerShell parse ${rel(root, file)} via ${host}`, host, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { cwd: root });
  });
}

function privacyScan(root) {
  const issues = [];
  const patterns = [
    { name: "private key block", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
    { name: "local Windows user path", regex: /C:\\Users\\[A-Za-z0-9_.-]+/i },
    { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
    { name: "Anthropic key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
    { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
    { name: "GitLab token", regex: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
    { name: "npm token", regex: /\bnpm_[A-Za-z0-9-]{36,}\b/ },
    { name: "Bearer token", regex: /\bbearer\s+[A-Za-z0-9._~+/-]{20,}/i },
    {
      name: "key/value secret",
      regex: /["']?\b(?:api[_-]?key|secret|password|passwd|token|cookie|session|authorization)\b["']?\s*[:=]\s*\S+/i,
      validate: (_value, line, relative) => {
        const assignment = line.match(
          /["']?\b(?:api[_-]?key|secret|password|passwd|token|cookie|session|authorization)\b["']?\s*[:=]\s*(.+)$/i
        );
        if (!assignment) return false;
        const raw = assignment[1].trim();
        const quote = raw[0];
        if (quote === "\"" || quote === "'" || quote === "`") {
          const closing = raw.indexOf(quote, 1);
          return closing >= 9;
        }
        if (/\.(?:[cm]?js|jsx|ts|tsx)$/i.test(relative)) return false;
        const token = raw.match(/^[^\s,;#]+/);
        return Boolean(token && token[0].length >= 8);
      }
    },
    {
      name: "email address",
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      validate: (value) => !/@(?:example\.(?:com|org|net)|example\.test|test\.invalid)$/i.test(value)
    },
    {
      name: "phone number",
      regex: /\b(?:\+?\d[\d\s().-]{8,}\d)\b/,
      validate: (value) => value.replace(/\D/g, "").length >= 10 &&
        /[()+]/.test(value) &&
        !/^\d{4}-\d{2}-\d{2}/.test(value.trim())
    }
  ];

  for (const file of walk(root)) {
    const relative = rel(root, file);
    if (relative.startsWith(".codex-context/raw/")) continue;
    if (/\.(png|jpg|jpeg|gif|zip|tar|gz|pdf|docx|pptx|xlsx)$/i.test(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (relative === "README.md" && line.includes("rg -n -i -uuu")) continue;
      if (line.includes("codex-release-check: allow-secret-fixture")) continue;
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match && (!pattern.validate || pattern.validate(match[0], line, relative))) {
          issues.push(`${relative}:${index + 1}: ${pattern.name}`);
        }
      }
    }
  }

  return issues;
}

function largeFileScan(root) {
  const issues = [];
  for (const file of walk(root)) {
    const relative = rel(root, file);
    if (relative.startsWith(".codex-context/raw/")) continue;
    if (relative.startsWith(".codex-context/archive/")) continue;
    if (!READABILITY_SCAN_FILES.has(relative) && !TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const stat = fs.statSync(file);
    if (stat.size > MAX_TEXT_FILE_BYTES) {
      issues.push(`${relative}: ${stat.size} bytes exceeds ${MAX_TEXT_FILE_BYTES} byte release limit`);
    }
  }
  return issues;
}

function textReadabilityScan(root) {
  const issues = [];
  const patterns = textReadabilityPatterns();

  for (const file of walk(root)) {
    if (!shouldScanTextFile(root, file)) continue;
    const relative = rel(root, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.includes("codex-release-check: allow-mojibake")) continue;
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          issues.push(`${relative}:${index + 1}: ${pattern.name}`);
          break;
        }
      }
    }
  }

  return issues;
}

function runtimeArtifactScan(root) {
  return walk(root)
    .map((file) => rel(root, file))
    .filter((file) => /\.(bak|tmp|log)$/i.test(file) ||
      file.startsWith(".skillopt-sleep/") ||
      file.endsWith("observations.jsonl") ||
      file.endsWith(".codex-context/discussion-state.json") ||
      file.includes("test-session"));
}

function runTests(root) {
  const testsDir = path.join(root, "tests");
  const domainRunner = path.join(root, "scripts", "run-domain-tests.mjs");
  const sourceRelease = fs.existsSync(path.join(root, "dong-skills.manifest.json")) &&
    fs.existsSync(path.join(root, ".agents", "skills", "codex-codebase-onboarding", "assets", "project-ops"));
  if (!fs.existsSync(testsDir)) {
    return sourceRelease
      ? [{ ok: false, label: "test suite presence", details: "Dong Skills source release requires tests/domains and scripts/run-domain-tests.mjs." }]
      : [];
  }
  if (sourceRelease && !fs.existsSync(domainRunner)) {
    return [{ ok: false, label: "test suite presence", details: "Dong Skills source release requires scripts/run-domain-tests.mjs." }];
  }
  const files = walk(root, "tests").filter((file) => /\.test\.mjs$/i.test(file));
  if (!files.length) {
    return sourceRelease
      ? [{ ok: false, label: "test suite presence", details: "Dong Skills source release contains no .test.mjs files." }]
      : [];
  }
  if (sourceRelease && process.env.DONG_DOMAIN_TEST_ACTIVE === "1") {
    return [{
      ok: true,
      label: "domain-sharded tests",
      details: "Covered by the active outer domain test runner; nested execution skipped."
    }];
  }
  if (sourceRelease) {
    return [runCommand("domain-sharded tests", process.execPath, [domainRunner], {
      cwd: root,
      env: { ...process.env, TMPDIR: os.tmpdir() }
    })];
  }
  return [runCommand("node --test tests", process.execPath, ["--test", ...files], {
    cwd: root,
    env: { ...process.env, TMPDIR: os.tmpdir() }
  })];
}

function contextBudgetScan(root) {
  const hook = path.join(root, ".codex", "hooks", "project-ops.mjs");
  if (!fs.existsSync(hook)) {
    return { ok: true, label: "context budget scan", details: "" };
  }

  try {
    const output = execFileSync(process.execPath, [hook, "context-budget"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const match = output.match(/Hot budget status:\s*(\w+)/i);
    const status = match ? match[1].toLowerCase() : "unknown";
    const warning = status === "warn"
      ? `Hot recovery path is above the warning threshold (${HOT_CONTEXT_WARN_LIMIT.toLocaleString()} tokens).`
      : "";
    const details = [output.trim(), warning].filter(Boolean).join("\n");

    return {
      ok: status === "ok" || status === "warn",
      label: "context budget scan",
      details
    };
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return { ok: false, label: "context budget scan", details };
  }
}

function main(root) {
  const checks = [];
  const healthScript = findHelperScript(root, "project-ops-health.mjs");
  checks.push(runCommand("health-check", process.execPath, [healthScript || path.join(root, "scripts", "project-ops-health.mjs"), root], { cwd: root }));
  checks.push(contextBudgetScan(root));
  checks.push(...syntaxChecks(root));
  checks.push(...powershellParseChecks(root));
  checks.push(...runTests(root));

  const privacyIssues = privacyScan(root);
  checks.push({
    ok: privacyIssues.length === 0,
    label: "privacy scan",
    details: privacyIssues.join("\n")
  });

  const readabilityIssues = textReadabilityScan(root);
  checks.push({
    ok: readabilityIssues.length === 0,
    label: "text readability scan",
    details: readabilityIssues.join("\n")
  });

  const largeFileIssues = largeFileScan(root);
  checks.push({
    ok: largeFileIssues.length === 0,
    label: "large file scan",
    details: largeFileIssues.join("\n")
  });

  const runtimeArtifacts = runtimeArtifactScan(root);
  checks.push({
    ok: runtimeArtifacts.length === 0,
    label: "runtime artifact scan",
    details: runtimeArtifacts.join("\n")
  });

  const lines = ["Dong Skills release check", `Root: ${root}`, ""];
  let failed = 0;
  const warnings = [];
  for (const check of checks) {
    lines.push(`${check.ok ? "PASS" : "FAIL"} ${check.label}`);
    if (!check.ok && check.details) {
      failed += 1;
      lines.push(check.details.split(/\r?\n/).slice(0, 12).map((line) => `  ${line}`).join("\n"));
    } else if (check.ok && check.label === "context budget scan" && check.details) {
      const statusLine = check.details.split(/\r?\n/).find((line) => /^Hot budget status:/i.test(line));
      if (statusLine && /^Hot budget status:\s*warn\b/i.test(statusLine)) warnings.push(statusLine);
    } else if (!check.ok) {
      failed += 1;
    }
  }

  if (warnings.length) {
    lines.push("", "Warnings:");
    for (const warning of warnings) lines.push(`- ${warning}`);
  }

  lines.push("", failed ? `Result: fail (${failed} failed check(s))` : "Result: pass");
  return { ok: failed === 0, text: lines.join("\n") };
}

const root = gitRoot(process.argv[2] || process.cwd());
const result = main(root);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
