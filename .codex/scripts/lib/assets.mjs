import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { sectionContent } from "./markdown.mjs";

const DEFAULTS = {
  verificationKeep: 8,
  verificationIssueThreshold: 40,
  activeFileTokenThreshold: 2500,
  activeFileLineThreshold: 400,
  rawPrecompactKeep: 5,
  rawMaxAgeDays: 30,
  staleReviewHours: 24
};

const ACTIVE_STATE_FILES = [
  "current-state.md",
  "project-map.md",
  "spec.md",
  "plan-progress.md",
  "artifact-index.md",
  "decisions.md",
  "open-questions.md",
  "risks.md",
  "verification.md",
  "learned-instincts.md",
  "dong-skills-outbox.md",
  "solution-index.md",
  "worktree-state.md",
  "workflow-state.yaml",
  "handoff-summary.md"
];

const REVIEW_STATE_FILES = [
  "project-map.md",
  "spec.md",
  "decisions.md",
  "risks.md",
  "learned-instincts.md",
  "solution-index.md",
  "worktree-state.md"
];

const DEBT_SCAN_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".ps1",
  ".sh"
]);

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

function mtimeMs(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function estimateTokens(file, text) {
  const codeLike = /\.(js|mjs|ts|tsx|py|go|rs|java|cs|json|toml|ya?ml|ps1|sh)$/i.test(file);
  if (codeLike) return Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

function splitCommandItems(body) {
  const lines = body.split(/\r?\n/);
  const items = [];
  let current = [];

  for (const line of lines) {
    if (/^-\s+/.test(line) && current.length) {
      items.push(current.join("\n").trimEnd());
      current = [line];
    } else if (current.length || line.trim()) {
      current.push(line);
    }
  }

  if (current.length) items.push(current.join("\n").trimEnd());
  return items.filter((item) => {
    const stripped = item.replace(/None yet\.?/gi, "").replace(/-\s*/g, "").trim();
    return stripped.length > 0;
  });
}

function walk(root, relDir = "", out = []) {
  const dir = path.join(root, relDir);
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".codegraph", "node_modules", "dist", "build", ".next", "__pycache__"].includes(entry.name)) continue;
    const nextRel = path.join(relDir, entry.name);
    const full = path.join(root, nextRel);
    if (entry.isDirectory()) walk(root, nextRel, out);
    else out.push(full);
  }
  return out;
}

function gitLsFiles(root, args) {
  try {
    const out = execFileSync("git", ["ls-files", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return out.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function rawPrecompactSnapshots(ctx) {
  const raw = path.join(ctx, "raw");
  if (!fs.existsSync(raw)) return [];
  return fs.readdirSync(raw)
    .filter((name) => /^precompact-auto-.*\.md$/i.test(name))
    .map((name) => {
      const file = path.join(raw, name);
      const stat = fs.statSync(file);
      return {
        file,
        rel: path.join(".codex-context", "raw", name).replace(/\\/g, "/"),
        mtimeMs: stat.mtimeMs,
        size: stat.size
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function emergencyHandoffNotice(ctx) {
  const file = path.join(ctx, "handoff-summary.md");
  const markdown = readText(file);
  const marker = "## PreCompact Emergency Notice";
  const separator = "\n---\n\n";
  const markerIndex = markdown.indexOf(marker);
  const separatorIndex = markdown.indexOf(separator, markerIndex);
  if (markerIndex === -1 || separatorIndex === -1) {
    return { present: false, file, markdown, continuation: "", notice: "" };
  }
  const notice = markdown.slice(markerIndex, separatorIndex).trim();
  const continuation = markdown.slice(separatorIndex + separator.length).trim();
  return {
    present: true,
    file,
    markdown,
    notice,
    continuation,
    canArchive: continuation.length > 0
  };
}

function archiveEmergencyHandoffNotice(ctx, noticeStatus, apply) {
  if (!noticeStatus.present || !noticeStatus.canArchive) return null;
  const archiveDir = path.join(ctx, "archive");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archive = path.join(archiveDir, `precompact-emergency-notice-${stamp}.md`);
  if (apply) {
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(archive, [
      "# PreCompact Emergency Notice Archive",
      "",
      `Archived: ${new Date().toISOString()}`,
      "",
      noticeStatus.notice,
      ""
    ].join("\n"), "utf8");
    fs.writeFileSync(noticeStatus.file, `# Handoff 摘要\n\n${noticeStatus.continuation}\n`, "utf8");
  }
  return {
    file: archive,
    rel: path.join(".codex-context", "archive", path.basename(archive)).replace(/\\/g, "/")
  };
}

function prunableRawSnapshots(ctx, options) {
  const snapshots = rawPrecompactSnapshots(ctx);
  const keep = options.rawPrecompactKeep;
  const cutoff = Date.now() - options.rawMaxAgeDays * 24 * 60 * 60 * 1000;
  const byCount = snapshots.slice(keep);
  const byAge = snapshots.filter((item) => item.mtimeMs < cutoff);
  const selected = new Map();
  for (const item of [...byCount, ...byAge]) selected.set(item.file, item);
  return [...selected.values()].sort((a, b) => a.mtimeMs - b.mtimeMs);
}

function activeStateMetrics(root, ctx) {
  return ACTIVE_STATE_FILES
    .map((name) => {
      const file = path.join(ctx, name);
      const text = readText(file);
      return {
        file,
        rel: `.codex-context/${name}`,
        exists: fs.existsSync(file),
        lines: text ? text.split(/\r?\n/).length : 0,
        tokens: estimateTokens(file, text),
        mtimeMs: mtimeMs(file)
      };
    });
}

function staleReviewFiles(ctx, options) {
  const anchor = Math.max(
    mtimeMs(path.join(ctx, "handoff-summary.md")),
    mtimeMs(path.join(ctx, "current-state.md")),
    mtimeMs(path.join(ctx, "plan-progress.md"))
  );
  if (!anchor) return [];
  const cutoff = anchor - options.staleReviewHours * 60 * 60 * 1000;
  return REVIEW_STATE_FILES
    .map((name) => {
      const file = path.join(ctx, name);
      return {
        rel: `.codex-context/${name}`,
        mtimeMs: mtimeMs(file)
      };
    })
    .filter((item) => item.mtimeMs && item.mtimeMs < cutoff);
}

function runtimeArtifactFiles(root) {
  return walk(root)
    .map((file) => rel(root, file))
    .filter((file) => !file.startsWith(".git/"))
    .filter((file) => /\.(bak|tmp|log)$/i.test(file) || file.endsWith("observations.jsonl") || file.includes("test-session"));
}

function trackedRuntimeArtifacts(root) {
  const tracked = gitLsFiles(root, []);
  return tracked.filter((file) => /\.(bak|tmp|log)$/i.test(file) || file.endsWith("observations.jsonl"));
}

function trackedRawFiles(root) {
  return gitLsFiles(root, [".codex-context/raw"])
    .filter((file) => !file.endsWith("/.gitkeep") && !file.endsWith("\\.gitkeep"));
}

function simplificationDebtMarkers(root) {
  const markers = [];
  for (const file of walk(root)) {
    const relative = rel(root, file);
    if (relative.startsWith(".codex-context/raw/")) continue;
    if (relative.startsWith(".codex-context/archive/")) continue;
    if (relative.startsWith("tests/")) continue;
    if (relative.startsWith("node_modules/") || relative.startsWith("dist/") || relative.startsWith("build/")) continue;
    if (!DEBT_SCAN_EXTENSIONS.has(path.extname(file))) continue;

    const lines = readText(file).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/\bdong-debt:/i.test(line)) continue;
      const text = line.replace(/^.*?\bdong-debt:\s*/i, "").trim();
      markers.push({
        rel: relative,
        line: index + 1,
        text,
        hasTrigger: /revisit when\b/i.test(text)
      });
    }
  }
  return markers;
}

export function assetGovernanceStatus(root, ctx, overrides = {}) {
  const options = { ...DEFAULTS, ...overrides };
  const issues = [];
  const advisories = [];
  const actions = [];

  const verificationFile = path.join(ctx, "verification.md");
  const verification = readText(verificationFile);
  const verificationCommands = splitCommandItems(sectionContent(verification, "Commands Run"));
  if (verificationCommands.length > options.verificationIssueThreshold) {
    issues.push(`verification.md has ${verificationCommands.length} command entries; run asset-governance/state-prune to keep the newest ${options.verificationKeep}`);
    actions.push(`node .codex/hooks/project-ops.mjs state-prune --keep ${options.verificationKeep} --apply`);
  } else if (verificationCommands.length > options.verificationKeep) {
    advisories.push(`verification.md has ${verificationCommands.length} command entries; consider pruning to ${options.verificationKeep}`);
  }

  const activeFiles = activeStateMetrics(root, ctx);
  const largeActiveFiles = activeFiles.filter((item) =>
    item.exists &&
    (item.tokens > options.activeFileTokenThreshold || item.lines > options.activeFileLineThreshold)
  );
  for (const item of largeActiveFiles) {
    issues.push(`${item.rel} is large (${item.lines} lines, ~${item.tokens} tokens); archive, split, or compact it`);
  }

  const prunableRaw = prunableRawSnapshots(ctx, options);
  if (prunableRaw.length) {
    advisories.push(`${prunableRaw.length} precompact raw snapshot(s) exceed retention; run asset-governance --apply to prune them`);
  }

  const emergencyNotice = emergencyHandoffNotice(ctx);
  if (emergencyNotice.present) {
    const level = emergencyNotice.canArchive ? "safe to archive with asset-governance --apply" : "refresh a normal handoff before archiving";
    advisories.push(`handoff-summary.md still contains a temporary PreCompact Emergency Notice; ${level}`);
  }

  const unsafeRaw = trackedRawFiles(root);
  if (unsafeRaw.length) {
    issues.push(`tracked raw runtime file(s): ${unsafeRaw.join(", ")}`);
  }

  const trackedArtifacts = trackedRuntimeArtifacts(root);
  if (trackedArtifacts.length) {
    issues.push(`tracked runtime artifact(s): ${trackedArtifacts.join(", ")}`);
  }

  const runtimeArtifacts = runtimeArtifactFiles(root)
    .filter((file) => !file.startsWith(".codex-context/raw/") && !file.startsWith(".codex-context/archive/"));
  if (runtimeArtifacts.length) {
    advisories.push(`${runtimeArtifacts.length} local runtime artifact(s) found outside raw/archive: ${runtimeArtifacts.slice(0, 8).join(", ")}`);
  }

  const staleFiles = staleReviewFiles(ctx, options);
  if (staleFiles.length) {
    advisories.push(`review on-demand state file freshness: ${staleFiles.map((item) => item.rel).join(", ")}`);
  }

  const debtMarkers = simplificationDebtMarkers(root);
  const debtWithoutTrigger = debtMarkers.filter((marker) => !marker.hasTrigger);
  if (debtMarkers.length) {
    advisories.push(`${debtMarkers.length} dong-debt marker(s) found; review with codex-simplicity-review before milestone handoff`);
  }
  if (debtWithoutTrigger.length) {
    advisories.push(`${debtWithoutTrigger.length} dong-debt marker(s) missing "revisit when" trigger: ${debtWithoutTrigger.slice(0, 8).map((marker) => `${marker.rel}:${marker.line}`).join(", ")}`);
  }

  const archiveDir = path.join(ctx, "archive");
  const archiveFiles = fs.existsSync(archiveDir) ? walk(ctx, "archive").map((file) => rel(root, file)) : [];
  if (archiveFiles.length > 20) {
    advisories.push(`archive contains ${archiveFiles.length} files; keep archive on-demand and consider consolidating old evidence`);
  }

  return {
    ok: issues.length === 0,
    issues,
    advisories,
    actions,
    metrics: {
      verificationCommands: verificationCommands.length,
      largeActiveFiles,
      rawPrecompactSnapshots: rawPrecompactSnapshots(ctx),
      prunableRawSnapshots: prunableRaw,
      emergencyHandoffNotice: emergencyNotice,
      staleReviewFiles: staleFiles,
      runtimeArtifacts,
      trackedRuntimeArtifacts: trackedArtifacts,
      trackedRawFiles: unsafeRaw,
      simplificationDebtMarkers: debtMarkers,
      simplificationDebtWithoutTrigger: debtWithoutTrigger,
      archiveFiles
    },
    options
  };
}

export function pruneRawSnapshots(items, apply) {
  const removed = [];
  for (const item of items) {
    if (apply && fs.existsSync(item.file)) fs.rmSync(item.file, { force: true });
    removed.push(item.rel);
  }
  return removed;
}

export function assetGovernanceReport(root, ctx, options = {}, apply = false) {
  const status = assetGovernanceStatus(root, ctx, options);
  const pruned = pruneRawSnapshots(status.metrics.prunableRawSnapshots, apply);
  const archivedEmergencyNotice = archiveEmergencyHandoffNotice(ctx, status.metrics.emergencyHandoffNotice, apply);
  const lines = [
    `Dong Skills asset governance ${apply ? "apply" : "dry-run"}`,
    `Root: ${root}`,
    "",
    "Summary:",
    `- Verification command entries: ${status.metrics.verificationCommands}`,
    `- Large active state files: ${status.metrics.largeActiveFiles.length}`,
    `- PreCompact raw snapshots: ${status.metrics.rawPrecompactSnapshots.length}`,
    `- Prunable raw snapshots: ${status.metrics.prunableRawSnapshots.length}`,
    `- Temporary PreCompact handoff notice: ${status.metrics.emergencyHandoffNotice.present ? "present" : "none"}`,
    `- Stale review candidates: ${status.metrics.staleReviewFiles.length}`,
    `- Runtime artifacts outside raw/archive: ${status.metrics.runtimeArtifacts.length}`,
    `- Tracked raw/runtime artifacts: ${status.metrics.trackedRawFiles.length + status.metrics.trackedRuntimeArtifacts.length}`,
    `- Dong debt markers: ${status.metrics.simplificationDebtMarkers.length}`,
    `- Dong debt markers without trigger: ${status.metrics.simplificationDebtWithoutTrigger.length}`,
    "",
    "Classification:",
    "- Keep: accurate, current, referenced, and still useful.",
    "- Update: useful but stale paths, commands, examples, or status.",
    "- Consolidate: overlapping files should merge into one canonical asset.",
    "- Replace: old guidance conflicts with verified current behavior.",
    "- Delete: no current reader, owner, reason, or reference.",
    "- Stale: cannot verify now; mark and stop treating as active truth.",
    "- Raw-Prune: runtime-only raw material exceeds retention.",
    "- Safe-Auto: generated emergency notices and retained raw snapshots that can be archived/pruned without changing project truth.",
    "- Confirm-First: tracked docs, source code, specs, decisions, solution memory, and user-approved records.",
    ""
  ];

  if (status.issues.length) {
    lines.push("Blocking issues:");
    for (const issue of status.issues) lines.push(`- ${issue}`);
    lines.push("");
  } else {
    lines.push("Blocking issues: none", "");
  }

  if (status.advisories.length) {
    lines.push("Advisories:");
    for (const advisory of status.advisories) lines.push(`- ${advisory}`);
    lines.push("");
  } else {
    lines.push("Advisories: none", "");
  }

  if (status.actions.length) {
    lines.push("Suggested commands:");
    for (const action of status.actions) lines.push(`- ${action}`);
    lines.push("");
  }

  if (status.metrics.simplificationDebtMarkers.length) {
    lines.push("Dong debt markers:");
    for (const marker of status.metrics.simplificationDebtMarkers.slice(0, 20)) {
      const trigger = marker.hasTrigger ? "triggered" : "no-trigger";
      lines.push(`- ${marker.rel}:${marker.line}: ${trigger}: ${marker.text}`);
    }
    lines.push("");
  }

  if (status.metrics.prunableRawSnapshots.length) {
    lines.push(`Raw snapshot pruning ${apply ? "applied" : "preview"}:`);
    for (const item of status.metrics.prunableRawSnapshots.slice(0, 20)) lines.push(`- ${item.rel}`);
    if (!apply) lines.push("- Pass --apply to delete the listed precompact snapshots.");
    else lines.push(`- Deleted ${pruned.length} snapshot(s).`);
    lines.push("");
  }

  if (status.metrics.emergencyHandoffNotice.present) {
    lines.push(`PreCompact notice archive ${apply ? "applied" : "preview"}:`);
    if (status.metrics.emergencyHandoffNotice.canArchive) {
      if (apply && archivedEmergencyNotice) {
        lines.push(`- Archived temporary notice to ${archivedEmergencyNotice.rel}`);
        lines.push("- Restored handoff-summary.md to the preserved normal handoff body.");
      } else {
        lines.push("- Temporary notice can be archived because a preserved handoff body exists below it.");
        lines.push("- Pass --apply to archive the notice and restore the normal handoff body.");
      }
    } else {
      lines.push("- Notice exists, but no preserved handoff body was found; refresh handoff-summary.md manually first.");
    }
    lines.push("");
  }

  lines.push(status.ok ? "Result: pass" : "Result: review-required");
  return { ok: status.ok, text: lines.join("\n").trimEnd() };
}
