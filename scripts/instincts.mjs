#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REQUIRED_FIELDS = [
  "id",
  "title",
  "scope",
  "domain",
  "status",
  "confidence",
  "created",
  "last_checked",
  "source"
];

const VALID_SCOPES = new Set(["project", "global-candidate"]);
const VALID_STATUSES = new Set(["candidate", "active", "retired", "contradicted", "superseded"]);
const VALID_DOMAINS = new Set([
  "workflow",
  "code-style",
  "architecture",
  "testing",
  "debugging",
  "verification",
  "docs",
  "security",
  "performance",
  "user-preference",
  "tooling"
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

function ensureDirs(root) {
  const base = path.join(root, ".codex-context", "instincts");
  for (const rel of ["project", "candidates", "retired"]) {
    fs.mkdirSync(path.join(base, rel), { recursive: true });
  }
  fs.mkdirSync(path.join(root, ".codex-context", "raw"), { recursive: true });
  return base;
}

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, out);
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!item) continue;
    let value = item[2].trim();
    value = value.replace(/^"|"$/g, "");
    meta[item[1]] = value;
  }
  return meta;
}

function loadInstincts(root) {
  const base = ensureDirs(root);
  const files = [
    ...walkMd(path.join(base, "project")),
    ...walkMd(path.join(base, "candidates")),
    ...walkMd(path.join(base, "retired"))
  ];
  return files.map((file) => {
    const text = fs.readFileSync(file, "utf8");
    const meta = parseFrontmatter(text);
    const bucket = path.relative(base, file).split(path.sep)[0];
    return { file, rel: path.relative(root, file).replace(/\\/g, "/"), bucket, meta, text };
  });
}

function validateInstinct(item) {
  const issues = [];
  for (const field of REQUIRED_FIELDS) {
    if (!item.meta[field]) issues.push(`missing ${field}`);
  }
  if (item.meta.id && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(item.meta.id)) {
    issues.push("invalid id");
  }
  if (item.meta.scope && !VALID_SCOPES.has(item.meta.scope)) {
    issues.push(`invalid scope ${item.meta.scope}`);
  }
  if (item.meta.status && !VALID_STATUSES.has(item.meta.status)) {
    issues.push(`invalid status ${item.meta.status}`);
  }
  if (item.meta.domain && !VALID_DOMAINS.has(item.meta.domain)) {
    issues.push(`nonstandard domain ${item.meta.domain}`);
  }
  const confidence = Number(item.meta.confidence);
  if (!Number.isFinite(confidence) || confidence < 0.3 || confidence > 0.9) {
    issues.push("confidence must be between 0.3 and 0.9");
  }
  for (const heading of ["## Trigger", "## Action", "## Evidence"]) {
    if (!item.text.includes(heading)) issues.push(`missing ${heading}`);
  }
  if (!item.text.includes("## Contraindications")) {
    issues.push("missing ## Contraindications");
  }
  return issues;
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function status(root) {
  const items = loadInstincts(root);
  const byBucket = groupBy(items, (item) => item.bucket);
  const lines = [
    "Codex instinct status",
    `Root: ${root}`,
    `Total instincts: ${items.length}`,
    ""
  ];
  for (const bucket of ["project", "candidates", "retired"]) {
    const list = byBucket.get(bucket) || [];
    lines.push(`${bucket}: ${list.length}`);
    for (const item of list.sort((a, b) => String(b.meta.confidence || "").localeCompare(String(a.meta.confidence || "")))) {
      lines.push(`- ${item.meta.id || path.basename(item.file)} (${item.meta.status || "unknown"}, ${item.meta.scope || "unknown"}, ${item.meta.confidence || "?"})`);
      if (item.meta.title) lines.push(`  ${item.meta.title}`);
      lines.push(`  ${item.rel}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function validate(root) {
  const items = loadInstincts(root);
  const byId = groupBy(items.filter((item) => item.meta.id), (item) => item.meta.id);
  const lines = ["Codex instinct validation", `Root: ${root}`, ""];
  let issueCount = 0;

  for (const item of items) {
    const issues = validateInstinct(item);
    if (issues.length) {
      issueCount += issues.length;
      lines.push(`- ${item.rel}: ${issues.join("; ")}`);
    }
  }

  for (const [id, list] of byId) {
    if (list.length > 1) {
      issueCount += 1;
      lines.push(`- duplicate id ${id}: ${list.map((item) => item.rel).join(", ")}`);
    }
  }

  if (issueCount === 0) lines.push("OK: no validation issues found");
  else lines.push("", `Issues: ${issueCount}`);
  return { ok: issueCount === 0, text: lines.join("\n") };
}

function parseDate(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function prune(root, apply) {
  const items = loadInstincts(root);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const base = path.join(root, ".codex-context", "instincts");
  const stale = items.filter((item) => {
    if (item.bucket !== "candidates") return false;
    const status = item.meta.status || "candidate";
    if (status !== "candidate") return false;
    const checked = parseDate(item.meta.last_checked || item.meta.created);
    return checked && checked < cutoff;
  });

  const lines = [
    `Codex instinct prune ${apply ? "apply" : "dry-run"}`,
    `Root: ${root}`,
    `Stale candidates: ${stale.length}`,
    ""
  ];

  for (const item of stale) {
    const target = path.join(base, "retired", path.basename(item.file));
    lines.push(`- ${item.rel} -> ${path.relative(root, target).replace(/\\/g, "/")}`);
    if (apply) fs.renameSync(item.file, target);
  }

  if (!apply) lines.push("Pass --apply to move stale candidates to retired/.");
  return lines.join("\n").trimEnd();
}

function promotionCandidates(root) {
  const items = loadInstincts(root);
  const candidates = items.filter((item) => {
    const confidence = Number(item.meta.confidence);
    return item.bucket === "project" &&
      item.meta.scope === "global-candidate" &&
      Number.isFinite(confidence) &&
      confidence >= 0.7;
  });

  const lines = [
    "Codex instinct promotion candidates",
    `Root: ${root}`,
    `Candidates: ${candidates.length}`,
    ""
  ];
  for (const item of candidates) {
    lines.push(`- ${item.meta.id}: ${item.meta.title || ""}`);
    lines.push(`  confidence: ${item.meta.confidence}`);
    lines.push(`  evidence: ${item.rel}`);
  }
  return lines.join("\n").trimEnd();
}

function usage() {
  return [
    "Usage:",
    "  node scripts/instincts.mjs status [project-root]",
    "  node scripts/instincts.mjs validate [project-root]",
    "  node scripts/instincts.mjs prune [project-root] [--apply]",
    "  node scripts/instincts.mjs promotion-candidates [project-root]"
  ].join("\n");
}

const [command, maybeRoot, ...rest] = process.argv.slice(2);
const rootArg = maybeRoot && !maybeRoot.startsWith("--") ? maybeRoot : process.cwd();
const flags = new Set([maybeRoot, ...rest].filter(Boolean).filter((arg) => arg.startsWith("--")));
const root = gitRoot(rootArg);

if (!command || command === "help" || command === "--help") {
  console.log(usage());
  process.exit(command ? 0 : 1);
}

switch (command) {
  case "status":
    console.log(status(root));
    break;
  case "validate": {
    const result = validate(root);
    console.log(result.text);
    process.exit(result.ok ? 0 : 1);
    break;
  }
  case "prune":
    console.log(prune(root, flags.has("--apply")));
    break;
  case "promotion-candidates":
    console.log(promotionCandidates(root));
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error(usage());
    process.exit(1);
}
