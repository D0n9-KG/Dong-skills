#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "__pycache__"]);

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

function syntaxChecks(root) {
  const files = walk(root).filter((file) => file.endsWith(".mjs"));
  return files.map((file) => runCommand(`node --check ${rel(root, file)}`, process.execPath, ["--check", file], { cwd: root }));
}

function powershellParseChecks(root) {
  if (process.platform !== "win32") return [];
  const files = walk(root).filter((file) => file.endsWith(".ps1"));
  return files.map((file) => {
    const script = [
      "$tokens=$null",
      "$errors=$null",
      `[System.Management.Automation.Language.Parser]::ParseFile('${file.replace(/'/g, "''")}', [ref]$tokens, [ref]$errors) > $null`,
      "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }"
    ].join("; ");
    return runCommand(`PowerShell parse ${rel(root, file)}`, "powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { cwd: root });
  });
}

function privacyScan(root) {
  const issues = [];
  const patterns = [
    { name: "local Windows user path", regex: /C:\\Users\\[A-Za-z0-9_.-]+/i },
    { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
    { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
    { name: "Bearer token", regex: /\bbearer\s+[A-Za-z0-9._~+/-]{20,}/i },
    { name: "key/value secret", regex: /\b(?:api[_-]?key|secret|password|passwd|token|cookie|session|authorization)\b\s*[:=]\s*\S{8,}/i }
  ];

  for (const file of walk(root)) {
    const relative = rel(root, file);
    if (relative.startsWith(".codex-context/raw/")) continue;
    if (relative.startsWith("tests/")) continue;
    if (/\.(png|jpg|jpeg|gif|zip|tar|gz|pdf|docx|pptx|xlsx)$/i.test(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (relative === "README.md" && line.includes("rg -n -i -uuu")) continue;
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) issues.push(`${relative}:${index + 1}: ${pattern.name}`);
      }
    }
  }

  return issues;
}

function runtimeArtifactScan(root) {
  return walk(root)
    .map((file) => rel(root, file))
    .filter((file) => /\.(bak|tmp|log)$/i.test(file) || file.endsWith("observations.jsonl") || file.includes("test-session"));
}

function runTests(root) {
  const testsDir = path.join(root, "tests");
  if (!fs.existsSync(testsDir)) return [];
  const files = walk(root, "tests").filter((file) => /\.test\.mjs$/i.test(file));
  if (!files.length) return [];
  return [runCommand("node --test tests", process.execPath, ["--test", ...files], {
    cwd: root,
    env: { ...process.env, TMPDIR: os.tmpdir() }
  })];
}

function main(root) {
  const checks = [];
  checks.push(runCommand("health-check", process.execPath, [path.join(root, "scripts", "project-ops-health.mjs"), root], { cwd: root }));
  checks.push(...syntaxChecks(root));
  checks.push(...powershellParseChecks(root));
  checks.push(...runTests(root));

  const privacyIssues = privacyScan(root);
  checks.push({
    ok: privacyIssues.length === 0,
    label: "privacy scan",
    details: privacyIssues.join("\n")
  });

  const runtimeArtifacts = runtimeArtifactScan(root);
  checks.push({
    ok: runtimeArtifacts.length === 0,
    label: "runtime artifact scan",
    details: runtimeArtifacts.join("\n")
  });

  const lines = ["Dong Skills release check", `Root: ${root}`, ""];
  let failed = 0;
  for (const check of checks) {
    lines.push(`${check.ok ? "PASS" : "FAIL"} ${check.label}`);
    if (!check.ok && check.details) {
      failed += 1;
      lines.push(check.details.split(/\r?\n/).slice(0, 12).map((line) => `  ${line}`).join("\n"));
    } else if (!check.ok) {
      failed += 1;
    }
  }

  lines.push("", failed ? `Result: fail (${failed} failed check(s))` : "Result: pass");
  return { ok: failed === 0, text: lines.join("\n") };
}

const root = gitRoot(process.argv[2] || process.cwd());
const result = main(root);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
