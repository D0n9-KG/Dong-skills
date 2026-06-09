#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REQUIRED_FIELDS = [
  "title",
  "date",
  "track",
  "category",
  "problem_type",
  "status",
  "scope",
  "tags",
  "verified_by"
];

const TRACKS = new Set(["bug", "knowledge"]);
const STATUSES = new Set(["active", "stale", "superseded"]);
const BUG_CATEGORIES = new Set([
  "build-errors",
  "test-failures",
  "runtime-errors",
  "performance-issues",
  "database-issues",
  "security-issues",
  "ui-bugs",
  "integration-issues",
  "logic-errors"
]);
const KNOWLEDGE_CATEGORIES = new Set([
  "architecture-patterns",
  "design-patterns",
  "tooling-decisions",
  "conventions",
  "workflow-issues",
  "developer-experience",
  "documentation-gaps",
  "best-practices"
]);
const ALL_CATEGORIES = new Set([...BUG_CATEGORIES, ...KNOWLEDGE_CATEGORIES]);

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

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function walkMarkdown(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "_archived") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, out);
    else if (entry.name.toLowerCase().endsWith(".md") && entry.name !== "README.md") out.push(full);
  }
  return out;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { data: {}, raw: "", hasFrontmatter: false };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = field[2].trim();
  }
  return { data, raw: match[1], hasFrontmatter: true };
}

function stripQuotes(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "");
}

function parseList(value) {
  const raw = stripQuotes(value);
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw.slice(1, -1).split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
  }
  return raw.split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
}

function validateYamlSafety(raw) {
  const issues = [];
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    const quoted = /^["'].*["']$/.test(value) || /^\[.*\]$/.test(value);
    if (!quoted && /\s#/.test(value)) issues.push(`${match[1]} has an unquoted inline # comment risk`);
    if (!quoted && /:\s/.test(value)) issues.push(`${match[1]} has an unquoted colon-space value`);
  }
  return issues;
}

function solutionDocs(root) {
  return walkMarkdown(path.join(root, "docs", "solutions"));
}

function validKnowledgeCategory(category) {
  return KNOWLEDGE_CATEGORIES.has(category);
}

function validateDoc(root, file) {
  const text = readText(file);
  const fm = parseFrontmatter(text);
  const issues = [];
  if (!fm.hasFrontmatter) issues.push("missing YAML frontmatter");
  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(fm.data, field) || !stripQuotes(fm.data[field])) issues.push(`missing required field: ${field}`);
  }

  const track = stripQuotes(fm.data.track);
  const category = stripQuotes(fm.data.category);
  const status = stripQuotes(fm.data.status);
  if (track && !TRACKS.has(track)) issues.push(`invalid track: ${track}`);
  if (status && !STATUSES.has(status)) issues.push(`invalid status: ${status}`);
  if (category && !ALL_CATEGORIES.has(category)) issues.push(`invalid category: ${category}`);
  if (track === "bug" && category && !BUG_CATEGORIES.has(category)) issues.push(`bug track category mismatch: ${category}`);
  if (track === "knowledge" && category && !validKnowledgeCategory(category)) issues.push(`knowledge track category mismatch: ${category}`);

  const date = stripQuotes(fm.data.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) issues.push(`date must be YYYY-MM-DD: ${date}`);
  if (!parseList(fm.data.tags).length) issues.push("tags must contain at least one item");
  issues.push(...validateYamlSafety(fm.raw));

  return {
    file: rel(root, file),
    data: fm.data,
    issues
  };
}

function discoverability(root) {
  const agents = readText(path.join(root, "AGENTS.md"));
  const claude = readText(path.join(root, "CLAUDE.md"));
  const combined = `${agents}\n${claude}`;
  return {
    solutions: /docs\/solutions|docs\\solutions/i.test(combined),
    concepts: /CONCEPTS\.md/i.test(combined)
  };
}

function referenceCandidates(root, docs) {
  const candidates = [];
  const codePath = /`([^`\n]+\.(?:js|mjs|ts|tsx|py|go|rs|java|cs|json|ya?ml|toml|md|ps1|sh|css|html)(?::\d+)?)`/gi;
  for (const file of docs) {
    const text = readText(file);
    let match;
    while ((match = codePath.exec(text))) {
      let target = match[1].replace(/:\d+$/, "");
      if (/^(https?:|file:)/i.test(target)) continue;
      target = target.replace(/\\/g, "/").replace(/^\.\//, "");
      if (target.startsWith("../")) continue;
      if (!fs.existsSync(path.join(root, target))) {
        candidates.push(`${rel(root, file)} references missing path ${target}`);
      }
    }
  }
  return candidates;
}

function overlapCandidates(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = [
      stripQuotes(row.data.track),
      stripQuotes(row.data.category),
      stripQuotes(row.data.problem_type),
      stripQuotes(row.data.scope)
    ].join("|").toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row.file);
  }
  return [...groups.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([key, files]) => `${key}: ${files.join(", ")}`);
}

function issueLines(issues) {
  return issues.map((issue) => `- ${issue.file}: ${issue.issues.join("; ")}`);
}

function writeIndex(root, rows, issues, refreshSignals) {
  const ctx = path.join(root, ".codex-context");
  fs.mkdirSync(ctx, { recursive: true });
  const byCategory = new Map();
  for (const row of rows) {
    const category = stripQuotes(row.data.category) || "uncategorized";
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }
  const lines = [
    "# Solution Index",
    "",
    "## Knowledge Store",
    `- docs/solutions present: ${fs.existsSync(path.join(root, "docs", "solutions")) ? "yes" : "no"}`,
    `- CONCEPTS.md present: ${fs.existsSync(path.join(root, "CONCEPTS.md")) ? "yes" : "no"}`,
    `- Solution docs: ${rows.length}`,
    "",
    "## Categories",
    ...([...byCategory.entries()].sort().map(([category, count]) => `- ${category}: ${count}`)),
    ...(byCategory.size ? [] : ["- None yet."]),
    "",
    "## Validation",
    ...(issues.length ? issueLines(issues) : ["- No validation issues found."]),
    "",
    "## Refresh Signals",
    ...(refreshSignals.length ? refreshSignals.map((item) => `- ${item}`) : ["- No refresh candidates found."]),
    "",
    "## Last Updated",
    `- ${new Date().toISOString()}`
  ];
  fs.writeFileSync(path.join(ctx, "solution-index.md"), `${lines.join("\n")}\n`, "utf8");
}

function commandStatus(root, args) {
  const docs = solutionDocs(root);
  const rows = docs.map((file) => validateDoc(root, file));
  const invalid = rows.filter((row) => row.issues.length);
  const refreshSignals = [...referenceCandidates(root, docs), ...overlapCandidates(rows)];
  const discover = discoverability(root);
  if (args.includes("--update-index")) writeIndex(root, rows, invalid, refreshSignals);

  const lines = [
    "Dong Skills solution memory status",
    `Root: ${root}`,
    `Solution docs: ${rows.length}`,
    `Invalid docs: ${invalid.length}`,
    `Refresh candidates: ${refreshSignals.length}`,
    `CONCEPTS.md: ${fs.existsSync(path.join(root, "CONCEPTS.md")) ? "present" : "missing"}`,
    `Instruction discoverability: docs/solutions=${discover.solutions ? "yes" : "no"}, CONCEPTS.md=${discover.concepts ? "yes" : "no"}`
  ];
  if (invalid.length) {
    lines.push("", "Validation issues:");
    lines.push(...issueLines(invalid));
  }
  if (refreshSignals.length) {
    lines.push("", "Refresh candidates:");
    lines.push(...refreshSignals.map((item) => `- ${item}`));
  }
  if (args.includes("--update-index")) lines.push("", "Updated .codex-context/solution-index.md");
  return { ok: invalid.length === 0, text: lines.join("\n") };
}

function commandValidate(root) {
  const rows = solutionDocs(root).map((file) => validateDoc(root, file));
  const invalid = rows.filter((row) => row.issues.length);
  const lines = ["Dong Skills solution validation", `Root: ${root}`];
  if (!rows.length) lines.push("No docs/solutions/*.md files found.");
  if (invalid.length) {
    lines.push("Issues:");
    lines.push(...issueLines(invalid));
  } else {
    lines.push("Issues: none");
  }
  lines.push(invalid.length ? "Result: fail" : "Result: pass");
  return { ok: invalid.length === 0, text: lines.join("\n") };
}

function commandInit(root) {
  const docsRoot = path.join(root, "docs", "solutions");
  fs.mkdirSync(docsRoot, { recursive: true });
  const readme = path.join(docsRoot, "README.md");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, "# Solutions\n\nDocument verified solutions and durable project learnings here. Each solution uses YAML frontmatter so agents can search by track, category, problem type, scope, and tags.\n", "utf8");
  }
  const concepts = path.join(root, "CONCEPTS.md");
  if (!fs.existsSync(concepts)) {
    fs.writeFileSync(concepts, "# Concepts\n\nShared domain vocabulary for this project. Keep entries short and stable; this is a glossary, not a spec or implementation index.\n", "utf8");
  }
  commandStatus(root, ["--update-index"]);
  return {
    ok: true,
    text: [
      "Dong Skills solution memory initialized",
      `Root: ${root}`,
      "- Ensured docs/solutions/README.md",
      "- Ensured CONCEPTS.md",
      "- Updated .codex-context/solution-index.md"
    ].join("\n")
  };
}

const root = gitRoot(process.argv[2] || process.cwd());
const command = process.argv[3] || "status";
const args = process.argv.slice(4);
let result;

if (command === "status") result = commandStatus(root, args);
else if (command === "validate") result = commandValidate(root);
else if (command === "init") result = commandInit(root);
else {
  result = {
    ok: false,
    text: `Unknown solutions command: ${command}\nUse: status | validate | init`
  };
}

console.log(result.text);
process.exit(result.ok ? 0 : 1);
