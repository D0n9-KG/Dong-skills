import fs from "node:fs";
import path from "node:path";
import { readText, walkFiles } from "./core.mjs";

export function estimateTokens(file, text) {
  const codeLike = /\.(js|mjs|ts|tsx|py|go|rs|java|cs|json|toml|ya?ml|ps1|sh)$/i.test(file);
  if (codeLike) return Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

export function contextBudget(root) {
  const candidates = [];
  for (const rel of ["AGENTS.md", ".codex/hooks.json", ".mcp.json", ".codex/config.toml"]) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) candidates.push(file);
  }
  candidates.push(...walkFiles(root, ".agents/skills").filter((file) => file.endsWith("/SKILL.md") || file.endsWith("\\SKILL.md")));
  candidates.push(...walkFiles(root, ".codex/hooks").filter((file) => /\.(mjs|js|ps1|sh)$/i.test(file)));
  candidates.push(...walkFiles(root, ".codex/scripts").filter((file) => /\.(mjs|js|ps1|sh)$/i.test(file)));
  candidates.push(...walkFiles(root, ".codex-context").filter((file) =>
    /\.(md|jsonl)$/i.test(file) &&
    !file.includes(`${path.sep}raw${path.sep}`) &&
    !file.includes(`${path.sep}archive${path.sep}`)
  ));

  const rows = candidates.map((file) => {
    const text = readText(file);
    return {
      file: path.relative(root, file).replace(/\\/g, "/"),
      lines: text.split(/\r?\n/).length,
      tokens: estimateTokens(file, text)
    };
  }).sort((a, b) => b.tokens - a.tokens);

  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  const heavy = rows.filter((row) => row.lines > 400 || row.tokens > 2500);
  const lines = [
    "Codex context budget report",
    `Root: ${root}`,
    `Estimated total: ~${total.toLocaleString()} tokens across ${rows.length} files`,
    "",
    "Largest files:"
  ];
  for (const row of rows.slice(0, 12)) {
    lines.push(`- ${row.file}: ~${row.tokens.toLocaleString()} tokens, ${row.lines} lines`);
  }
  if (heavy.length) {
    lines.push("", "Heavy files to consider splitting into references:");
    for (const row of heavy.slice(0, 8)) lines.push(`- ${row.file}`);
  }
  return lines.join("\n");
}
