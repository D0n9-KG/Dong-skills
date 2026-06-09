#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const inputRoot = process.argv[2];

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

function estimateTokens(file, text) {
  const codeLike = /\.(js|mjs|ts|tsx|py|go|rs|java|cs|json|toml|ya?ml|ps1|sh)$/i.test(file);
  if (codeLike) return Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

function walkFiles(root, relDir, out = []) {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "build", ".next", "__pycache__"].includes(entry.name)) continue;
    const relPath = path.join(relDir, entry.name).replace(/\\/g, "/");
    const full = path.join(root, relPath);
    if (entry.isDirectory()) walkFiles(root, relPath, out);
    else out.push(full);
  }
  return out;
}

const root = inputRoot ? path.resolve(inputRoot) : gitRoot(process.cwd());
const candidates = [];
for (const rel of ["AGENTS.md", ".codex/hooks.json", ".mcp.json", ".codex/config.toml"]) {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) candidates.push(file);
}
candidates.push(...walkFiles(root, ".agents/skills").filter((file) => file.endsWith("/SKILL.md") || file.endsWith("\\SKILL.md")));
candidates.push(...walkFiles(root, ".codex/hooks").filter((file) => /\.(mjs|js|ps1|sh)$/i.test(file)));
candidates.push(...walkFiles(root, ".codex-context").filter((file) => /\.(md|jsonl)$/i.test(file) && !file.includes(`${path.sep}raw${path.sep}`)));

const rows = candidates.map((file) => {
  const text = readText(file);
  return {
    file: path.relative(root, file).replace(/\\/g, "/"),
    lines: text.split(/\r?\n/).length,
    tokens: estimateTokens(file, text)
  };
}).sort((a, b) => b.tokens - a.tokens);

const total = rows.reduce((sum, row) => sum + row.tokens, 0);
console.log("Codex context budget report");
console.log(`Root: ${root}`);
console.log(`Estimated total: ~${total.toLocaleString()} tokens across ${rows.length} files`);
console.log("");
console.log("Largest files:");
for (const row of rows.slice(0, 12)) {
  console.log(`- ${row.file}: ~${row.tokens.toLocaleString()} tokens, ${row.lines} lines`);
}

const heavy = rows.filter((row) => row.lines > 400 || row.tokens > 2500);
if (heavy.length) {
  console.log("");
  console.log("Heavy files to consider splitting into references:");
  for (const row of heavy.slice(0, 8)) console.log(`- ${row.file}`);
}
