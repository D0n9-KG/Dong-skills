#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

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

function homePath(...parts) {
  return path.join(os.homedir(), ...parts);
}

function existingDirs() {
  const dirs = [
    { platform: "codex", dir: homePath(".codex", "sessions") },
    { platform: "codex", dir: homePath(".codex", "projects") },
    { platform: "claude", dir: homePath(".claude", "projects") },
    { platform: "cursor", dir: process.env.APPDATA ? path.join(process.env.APPDATA, "Cursor", "User", "workspaceStorage") : "" }
  ];
  return dirs.filter((entry) => entry.dir && fs.existsSync(entry.dir));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsonl|json|md|txt)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function readPrefix(file, maxBytes = 256 * 1024) {
  const fd = fs.openSync(file, "r");
  try {
    const stat = fs.statSync(file);
    const size = Math.min(stat.size, maxBytes);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    return buf.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(file, keywords) {
  if (!keywords.length) return 0;
  const text = readPrefix(file).toLowerCase();
  return keywords.reduce((sum, keyword) => {
    const matches = text.match(new RegExp(escapeRegExp(keyword.toLowerCase()), "g"));
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function parseArgs(argv) {
  const args = { command: argv[3] || "scan", days: 7, keywords: [], limit: 12 };
  for (let index = 4; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--days") args.days = Number(argv[++index] || "7");
    else if (arg === "--keywords") args.keywords = String(argv[++index] || "").split(",").map((item) => item.trim()).filter(Boolean);
    else if (arg === "--limit") args.limit = Number(argv[++index] || "12");
  }
  return args;
}

function scan(root, args) {
  const repoName = path.basename(root).toLowerCase();
  const keywords = args.keywords.length ? args.keywords : [repoName];
  const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
  const candidates = [];

  for (const source of existingDirs()) {
    for (const file of walk(source.dir)) {
      const stat = fs.statSync(file);
      if (stat.size > MAX_FILE_SIZE) continue;
      if (stat.mtimeMs < cutoff) continue;
      const matches = countMatches(file, keywords);
      const pathMatchesRepo = file.toLowerCase().includes(repoName);
      if (!matches && !pathMatchesRepo) continue;
      candidates.push({
        platform: source.platform,
        file,
        size: stat.size,
        modified: new Date(stat.mtimeMs).toISOString(),
        match_count: matches
      });
    }
  }

  candidates.sort((a, b) => b.match_count - a.match_count || Date.parse(b.modified) - Date.parse(a.modified));
  return candidates.slice(0, args.limit);
}

function formatScan(root, args) {
  const rows = scan(root, args);
  const lines = [
    "Dong Skills session history scan",
    `Root: ${root}`,
    `Window: ${args.days} day(s)`,
    `Keywords: ${(args.keywords.length ? args.keywords : [path.basename(root)]).join(", ")}`,
    `Candidates: ${rows.length}`,
    "",
    "Guardrails:",
    "- This script reports metadata and keyword counts only.",
    "- Do not paste full session files into context.",
    "- Read candidates through a skeleton/excerpt workflow and summarize technical facts only.",
    ""
  ];
  if (!rows.length) {
    lines.push("No candidate session files found.");
  } else {
    lines.push("Candidates:");
    for (const row of rows) {
      lines.push(`- ${row.platform} | matches=${row.match_count} | size=${row.size} | modified=${row.modified} | ${row.file}`);
    }
  }
  return { ok: true, text: lines.join("\n") };
}

const root = gitRoot(process.argv[2] || process.cwd());
const args = parseArgs(process.argv);
let result;

if (args.command === "scan") result = formatScan(root, args);
else {
  result = { ok: false, text: `Unknown session-history command: ${args.command}\nUse: scan --days 7 --keywords word1,word2` };
}

console.log(result.text);
process.exit(result.ok ? 0 : 1);
