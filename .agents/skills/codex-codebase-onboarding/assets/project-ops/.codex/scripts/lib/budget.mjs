import fs from "node:fs";
import path from "node:path";
import { readText, walkFiles } from "./core.mjs";

const HOT_LIMIT = 35_000;
const HOT_FAIL_LIMIT = 45_000;

export function estimateTokens(file, text) {
  const codeLike = /\.(js|mjs|ts|tsx|py|go|rs|java|cs|json|toml|ya?ml|ps1|sh)$/i.test(file);
  if (codeLike) return Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

function workflowNextSkill(root) {
  const workflow = readText(path.join(root, ".codex-context", "workflow-state.yaml"));
  const match = workflow.match(/^next_skill:\s*([^\r\n#]+)/m);
  return match ? match[1].trim() : "";
}

function activeStateFiles() {
  return new Set([
    ".codex-context/handoff-summary.md",
    ".codex-context/current-state.md",
    ".codex-context/project-map.md",
    ".codex-context/spec.md",
    ".codex-context/plan-progress.md",
    ".codex-context/artifact-index.md",
    ".codex-context/workflow-state.yaml",
    ".codex-context/learned-instincts.md"
  ]);
}

function classifyContextFile(relPath, nextSkill) {
  const normalized = relPath.replace(/\\/g, "/");
  const hotStates = activeStateFiles();
  const nextSkillPath = nextSkill ? `.agents/skills/${nextSkill}/SKILL.md` : "";

  if (
    normalized === "AGENTS.md" ||
    normalized === ".codex/hooks.json" ||
    normalized === ".agents/skills/using-superpowers/SKILL.md" ||
    normalized === ".agents/skills/codex-codebase-onboarding/SKILL.md" ||
    normalized === nextSkillPath ||
    hotStates.has(normalized)
  ) {
    return {
      bucket: "hot",
      reason: "recovery/router path"
    };
  }

  if (
    normalized.startsWith(".agents/skills/") ||
    normalized.startsWith(".codex-context/") ||
    normalized === ".mcp.json" ||
    normalized === ".codex/config.toml"
  ) {
    return {
      bucket: "warm",
      reason: "on-demand skill or state"
    };
  }

  return {
    bucket: "cold",
    reason: "runtime/bootstrap maintenance"
  };
}

function bucketTotals(rows) {
  const buckets = {
    hot: [],
    warm: [],
    cold: []
  };
  for (const row of rows) buckets[row.bucket].push(row);
  return buckets;
}

function sumTokens(rows) {
  return rows.reduce((sum, row) => sum + row.tokens, 0);
}

function budgetStatus(hotTokens) {
  if (hotTokens > HOT_FAIL_LIMIT) return "fail";
  if (hotTokens > HOT_LIMIT) return "warn";
  return "ok";
}

function formatRow(row) {
  return `- ${row.file}: ~${row.tokens.toLocaleString()} tokens, ${row.lines} lines (${row.reason})`;
}

export function contextBudget(root) {
  const candidates = [];
  const nextSkill = workflowNextSkill(root);
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
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    const classification = classifyContextFile(relPath, nextSkill);
    return {
      file: relPath,
      lines: text.split(/\r?\n/).length,
      tokens: estimateTokens(file, text),
      bucket: classification.bucket,
      reason: classification.reason
    };
  }).sort((a, b) => b.tokens - a.tokens);

  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  const buckets = bucketTotals(rows);
  const hotTokens = sumTokens(buckets.hot);
  const warmTokens = sumTokens(buckets.warm);
  const coldTokens = sumTokens(buckets.cold);
  const status = budgetStatus(hotTokens);
  const heavy = rows.filter((row) => row.lines > 400 || row.tokens > 2500);
  const lines = [
    "Codex context budget report",
    `Root: ${root}`,
    `Estimated total scanned: ~${total.toLocaleString()} tokens across ${rows.length} files`,
    `Hot recovery path: ~${hotTokens.toLocaleString()} tokens across ${buckets.hot.length} files`,
    `Warm on-demand path: ~${warmTokens.toLocaleString()} tokens across ${buckets.warm.length} files`,
    `Cold runtime/bootstrap path: ~${coldTokens.toLocaleString()} tokens across ${buckets.cold.length} files`,
    `Hot budget status: ${status} (warn > ${HOT_LIMIT.toLocaleString()}, fail > ${HOT_FAIL_LIMIT.toLocaleString()})`,
    nextSkill ? `Workflow next skill: ${nextSkill}` : "Workflow next skill: unknown",
    "",
    "Largest hot files:"
  ];
  for (const row of buckets.hot.sort((a, b) => b.tokens - a.tokens).slice(0, 8)) {
    lines.push(formatRow(row));
  }
  lines.push("", "Largest warm/cold files:");
  for (const row of [...buckets.warm, ...buckets.cold].sort((a, b) => b.tokens - a.tokens).slice(0, 12)) {
    lines.push(formatRow(row));
  }
  if (heavy.length) {
    lines.push("", "Heavy files to consider splitting into references:");
    for (const row of heavy.slice(0, 8)) lines.push(`- ${row.file}`);
  }
  return lines.join("\n");
}
