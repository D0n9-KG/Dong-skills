#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".kt",
  ".cs", ".rb", ".php", ".swift", ".vue", ".svelte", ".astro"
]);
const EXCLUDED = new Set([".git", "node_modules", "dist", "build", ".next", "__pycache__", "coverage", ".venv", "venv"]);

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
    else if (CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function rel(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function lineCount(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).length;
}

function importCount(file) {
  const text = fs.readFileSync(file, "utf8");
  const matches = text.match(/\b(import\s+.+?\s+from\s+|require\s*\(|from\s+["']\.)/g);
  return matches ? matches.length : 0;
}

function dirStats(root, files) {
  const counts = new Map();
  for (const file of files) {
    const dir = path.dirname(rel(root, file));
    counts.set(dir, (counts.get(dir) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([dir, count]) => ({ dir, count }))
    .filter((item) => item.count >= 20)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

const root = gitRoot(process.argv[2] || process.cwd());
const files = walk(root);
const large = files
  .map((file) => ({ file: rel(root, file), lines: lineCount(file), imports: importCount(file) }))
  .filter((item) => item.lines >= 350 || item.imports >= 25)
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 15);
const flatDirs = dirStats(root, files);

const lines = [
  "Codex architecture scan",
  `Root: ${root}`,
  `Code files scanned: ${files.length}`,
  "",
  "Large or high-import files:"
];

if (large.length) {
  for (const item of large) {
    lines.push(`- ${item.file}: ${item.lines} lines, ${item.imports} import-like references`);
  }
} else {
  lines.push("- None over thresholds.");
}

lines.push("", "Flat directories:");
if (flatDirs.length) {
  for (const item of flatDirs) lines.push(`- ${item.dir}: ${item.count} code files`);
} else {
  lines.push("- None over threshold.");
}

lines.push(
  "",
  "Interpretation:",
  "- These are review candidates, not automatic refactor targets.",
  "- Check ownership, locality, dependency direction, test surface, and whether an abstraction is deep enough to earn its place."
);

console.log(lines.join("\n"));
