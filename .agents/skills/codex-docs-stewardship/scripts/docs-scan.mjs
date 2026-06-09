#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const EXCLUDED = new Set([".git", "node_modules", "dist", "build", ".next", "__pycache__", "coverage"]);

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
    if (entry.isDirectory() && EXCLUDED.has(entry.name)) continue;
    const rel = path.join(relDir, entry.name);
    const full = path.join(root, rel);
    if (entry.isDirectory()) walk(root, rel, out);
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
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

function estimateTokens(text) {
  return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.3);
}

const root = gitRoot(process.argv[2] || process.cwd());
const docs = walk(root).filter((file) => {
  const relative = rel(root, file);
  return relative === "README.md" ||
    relative === "AGENTS.md" ||
    relative.startsWith("docs/") ||
    relative.startsWith(".codex-context/") ||
    relative.endsWith("/AGENTS.md");
});

const relativeDatePattern = /\b(today|yesterday|recently|last week|tomorrow)\b|今天|昨天|刚刚|最近|上周|明天/i;
const rows = docs.map((file) => {
  const text = readText(file);
  return {
    file: rel(root, file),
    lines: text.split(/\r?\n/).length,
    tokens: estimateTokens(text),
    relativeDates: relativeDatePattern.test(text),
    hasHeading: /^#\s+/m.test(text)
  };
}).sort((a, b) => b.tokens - a.tokens);

const lines = [
  "Codex docs stewardship scan",
  `Root: ${root}`,
  `Docs/state markdown files: ${rows.length}`,
  "",
  "Largest docs/state files:"
];

for (const row of rows.slice(0, 12)) {
  lines.push(`- ${row.file}: ~${row.tokens} tokens, ${row.lines} lines`);
}

const relativeDates = rows.filter((row) => row.relativeDates);
if (relativeDates.length) {
  lines.push("", "Relative date language to review:");
  for (const row of relativeDates.slice(0, 12)) lines.push(`- ${row.file}`);
}

const missingHeading = rows.filter((row) => !row.hasHeading);
if (missingHeading.length) {
  lines.push("", "Markdown files without top-level heading:");
  for (const row of missingHeading.slice(0, 12)) lines.push(`- ${row.file}`);
}

lines.push(
  "",
  "Interpretation:",
  "- Review large files for archiving or splitting.",
  "- Replace relative dates with concrete dates unless they are quoted.",
  "- Reconcile docs with code before preserving them."
);

console.log(lines.join("\n"));
