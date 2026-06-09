#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const REQUIRED_FILES = {
  current: "current-state.md",
  projectMap: "project-map.md",
  spec: "spec.md",
  plan: "plan-progress.md",
  artifacts: "artifact-index.md",
  decisions: "decisions.md",
  questions: "open-questions.md",
  risks: "risks.md",
  verification: "verification.md",
  instincts: "learned-instincts.md",
  handoff: "handoff-summary.md"
};

const TEMPLATES = {
  "current-state.md": `# Current State

## Objective
[One sentence.]

## Latest User Instruction
[Most recent instruction that changes scope or priority.]

## Current Phase
[discovery | brainstorming | spec | planning | implementation | debugging | verification | review | delivery | blocked | handoff]

## Active Assumptions
- [Assumption and why it is acceptable.]

## Blockers
- None.

## Next Action
[Exactly one next action.]

## Last Updated
[YYYY-MM-DD HH:mm local time.]
`,
  "project-map.md": `# Project Map

## Purpose
[What this project does, or "Unknown".]

## Stack
- [Language/framework/package manager.]

## Architecture
- [Key components and how they connect.]

## Important Paths
- \`path\`: [purpose]

## Entry Points
- \`path\`: [runtime or command entry point]

## Commands
- Dev: \`[command or unknown]\`
- Build: \`[command or unknown]\`
- Typecheck: \`[command or unknown]\`
- Lint: \`[command or unknown]\`
- Test: \`[command or unknown]\`

## Conventions
- [Evidence-backed convention.]

## Where To Change Things
- [Task type]: \`path\`

## Unknowns
- [Unknown and how to verify.]
`,
  "spec.md": `# Spec

## Problem
[What user wants solved.]

## Goals
- [Goal.]

## Non-Goals
- [Explicitly out of scope.]

## Approved Scope
- [What has been approved.]

## User Decisions
- [Decision and date.]

## Acceptance Criteria
- [Observable outcome.]

## Open Questions
- [Question or "None".]
`,
  "plan-progress.md": `# Plan Progress

## Active Plan
[Path to detailed plan/spec, or "No formal plan yet".]

## Tasks
- [ ] Task 1: [status and evidence]

## Current Step
[Exactly one active step, or "None".]

## Out Of Scope
- [Explicit non-goals.]
`,
  "artifact-index.md": `# Artifact Index

## Created
- None yet.

## Modified
- None yet.

## Read / Inspected
- None yet.

## Raw Outputs
- None yet.
`,
  "decisions.md": `# Decisions

## Accepted
- None yet.

## Rejected
- None yet.
`,
  "open-questions.md": `# Open Questions

- None.
`,
  "risks.md": `# Risks

## Context Risks
- None known.

## Technical Risks
- None known.

## Safety / Destructive Risks
- None known.
`,
  "verification.md": `# Verification

## Commands Run
- None yet.

## Not Yet Verified
- None yet.
`,
  "learned-instincts.md": `# Learned Instincts

## Summary
Keep this file as a compact index. Store individual instincts under \`.codex-context/instincts/\`.

## Raw Observation Review
- Last reviewed raw observations: None yet.
- Review rule: convert useful events into instincts, absorb duplicates into existing docs, or record a deliberate drop.

## Active Project Instincts
- None yet.

## Candidate Instincts
- None yet.

## Retired / Contradicted / Superseded
- None yet.

## Promotion Candidates
- None yet.

## Maintenance Log
- None yet.
`,
  "handoff-summary.md": `# Handoff Summary

## Objective

## Latest User Instruction

## Approved Scope / Spec

## Plan Status

## Files Modified

## Files Read But Not Changed

## Decisions Made

## Open Questions And Assumptions

## Risks

## Verification Evidence

## Git Checkpoint
- Latest commit:
- Push state:
- Files included:
- Files intentionally left uncommitted:
- Deferred reason:
- Next checkpoint:

## Learned Instincts To Preserve

## Next Action

## Files To Re-read First
`
};

function readStdinJson() {
  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function writeJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

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

function ensureContext(root) {
  const ctx = path.join(root, ".codex-context");
  fs.mkdirSync(path.join(ctx, "raw"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "project"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(ctx, "instincts", "retired"), { recursive: true });
  for (const [name, body] of Object.entries(TEMPLATES)) {
    const file = path.join(ctx, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, body, "utf8");
  }
  return ctx;
}

function isGovernancePath(relPath) {
  return relPath === ".codex" ||
    relPath.startsWith(".codex/") ||
    relPath === ".codex-context" ||
    relPath.startsWith(".codex-context/") ||
    relPath === "AGENTS.md";
}

function gitChangedFiles(root) {
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.slice(3).trim())
      .map((name) => name.includes(" -> ") ? name.split(" -> ").pop().trim() : name)
      .map((name) => name.replace(/^"|"$/g, "").replace(/\\/g, "/"))
      .filter((name) => name && !isGovernancePath(name));
  } catch {
    return [];
  }
}

function gitStatusFiles(root) {
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.slice(3).trim())
      .map((name) => name.includes(" -> ") ? name.split(" -> ").pop().trim() : name)
      .map((name) => name.replace(/^"|"$/g, "").replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function gitCurrentBranch(root) {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function gitHasRemote(root) {
  try {
    const out = execFileSync("git", ["remote"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function gitAheadBehind(root) {
  try {
    execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return { hasUpstream: false, ahead: 0, behind: 0 };
  }

  try {
    const out = execFileSync("git", ["rev-list", "--left-right", "--count", "HEAD...@{u}"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const [aheadRaw, behindRaw] = out.split(/\s+/);
    return {
      hasUpstream: true,
      ahead: Number.parseInt(aheadRaw || "0", 10) || 0,
      behind: Number.parseInt(behindRaw || "0", 10) || 0
    };
  } catch {
    return { hasUpstream: true, ahead: 0, behind: 0 };
  }
}

function gitCheckpointStatus(root, ctx, latest) {
  const statusFiles = gitStatusFiles(root);
  const branch = gitCurrentBranch(root);
  const remote = gitHasRemote(root);
  const aheadBehind = gitAheadBehind(root);
  const issues = [];

  if (statusFiles.length > 0) issues.push(`${statusFiles.length} uncommitted file(s)`);
  if (aheadBehind.ahead > 0) issues.push(`${aheadBehind.ahead} unpushed commit(s)`);
  if (remote && branch && !aheadBehind.hasUpstream) issues.push(`branch '${branch}' has no upstream`);

  const needsCheckpoint = issues.length > 0;
  const handoffFile = path.join(ctx, REQUIRED_FILES.handoff);
  const handoff = readText(handoffFile);
  const checkpoint = sectionContent(handoff, "Git Checkpoint");
  const checkpointFresh = latest ? mtimeMs(handoffFile) >= latest - 1000 : true;
  const checkpointValidation = validateGitCheckpointSection(checkpoint);
  const checkpointRecorded = meaningful(checkpoint) && checkpointFresh && checkpointValidation.ok;
  if (needsCheckpoint && checkpointValidation.missing.length) {
    issues.push(`Git Checkpoint missing field(s): ${checkpointValidation.missing.join(", ")}`);
  }

  return {
    ok: !needsCheckpoint || checkpointRecorded,
    needsCheckpoint,
    checkpointRecorded,
    checkpointValidation,
    statusFiles,
    issues,
    summary: needsCheckpoint
      ? `Git checkpoint needs review: ${issues.join("; ")}. Use codex-git-checkpoint to commit/push or record the deferred reason in handoff-summary.md -> Git Checkpoint.`
      : "Git checkpoint ok: worktree has no uncommitted files and no unpushed commits."
  };
}

function mtimeMs(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function latestChangedMtime(root, files) {
  let latest = 0;
  for (const file of files) {
    const abs = path.join(root, file);
    if (fs.existsSync(abs)) latest = Math.max(latest, mtimeMs(abs));
    else latest = Math.max(latest, Date.now());
  }
  return latest;
}

function fileFresh(ctx, name, latest) {
  if (!latest) return true;
  return mtimeMs(path.join(ctx, name)) >= latest - 1000;
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function sectionContent(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkpointField(checkpoint, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegex(label)}\\s*:\\s*(.*)$`, "im");
    const match = checkpoint.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function validateGitCheckpointSection(checkpoint) {
  const fields = {
    latestCommit: checkpointField(checkpoint, ["Latest commit", "Latest functional commit"]),
    pushState: checkpointField(checkpoint, ["Push state"]),
    filesIncluded: checkpointField(checkpoint, ["Files included"]),
    filesLeft: checkpointField(checkpoint, ["Files intentionally left uncommitted", "Files left uncommitted"]),
    deferredReason: checkpointField(checkpoint, ["Deferred reason"]),
    nextCheckpoint: checkpointField(checkpoint, ["Next checkpoint"])
  };

  const missing = [];
  if (!meaningful(fields.pushState)) missing.push("Push state");
  if (!meaningful(fields.filesIncluded) && !meaningful(fields.filesLeft)) {
    missing.push("Files included or Files intentionally left uncommitted");
  }
  if (!meaningful(fields.latestCommit) && !meaningful(fields.deferredReason)) {
    missing.push("Latest commit or Deferred reason");
  }
  if (!meaningful(fields.nextCheckpoint)) missing.push("Next checkpoint");

  return { ok: missing.length === 0, missing, fields };
}

function meaningful(text) {
  const stripped = text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/None yet\.?/gi, "")
    .replace(/None known\.?/gi, "")
    .replace(/None\.?/gi, "")
    .replace(/Unknown\.?/gi, "")
    .replace(/No formal plan yet\.?/gi, "")
    .replace(/-/g, "")
    .trim();
  return stripped.length > 0;
}

function markdownStatus(ctx, name, latest, label = name) {
  const file = path.join(ctx, name);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  return {
    ok: !stale,
    stale,
    issue: stale ? `${label} is older than changed project files` : ""
  };
}

function handoffStatus(ctx, latest) {
  const file = path.join(ctx, REQUIRED_FILES.handoff);
  const markdown = readText(file);
  const required = [
    "Objective",
    "Latest User Instruction",
    "Approved Scope / Spec",
    "Plan Status",
    "Files Modified",
    "Decisions Made",
    "Verification Evidence",
    "Git Checkpoint",
    "Next Action",
    "Files To Re-read First"
  ];
  const missing = required.filter((heading) => !meaningful(sectionContent(markdown, heading)));
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  return { ok: missing.length === 0 && !stale, missing, stale };
}

function verificationStatus(ctx, latest) {
  const file = path.join(ctx, REQUIRED_FILES.verification);
  const markdown = readText(file);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  const commands = sectionContent(markdown, "Commands Run");
  const gaps = sectionContent(markdown, "Not Yet Verified");
  const hasEvidence = meaningful(commands) || meaningful(gaps);
  return { ok: !stale && hasEvidence, stale, hasEvidence };
}

function shortList(files, max = 8) {
  if (files.length <= max) return files.join(", ");
  return `${files.slice(0, max).join(", ")} and ${files.length - max} more`;
}

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function fingerprint(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex").slice(0, 16);
}

function truncate(text, max) {
  const value = normalizeWhitespace(text);
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function relativeCwd(root, cwd) {
  if (!cwd) return ".";
  const rel = path.relative(root, path.resolve(cwd)).replace(/\\/g, "/");
  if (!rel || rel === ".") return ".";
  if (rel.startsWith("../") || rel === ".." || path.isAbsolute(rel)) return "[outside-project]";
  return rel;
}

function containsPotentialSecret(text) {
  return [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    /\b(?:api[_-]?key|secret|password|passwd|token|cookie|session|authorization)\b\s*[:=]\s*\S{6,}/i,
    /\bbearer\s+[A-Za-z0-9._~+/-]{12,}/i,
    /\bsk-[A-Za-z0-9_-]{20,}/i,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/
  ].some((pattern) => pattern.test(text || ""));
}

function sanitizeLearningExcerpt(text) {
  let value = normalizeWhitespace(text);
  value = value.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/gi, "[redacted-private-key]");
  value = value.replace(/\b((?:api[_-]?key|secret|password|passwd|token|cookie|session|authorization)\b\s*[:=]\s*)\S+/gi, "$1[redacted]");
  value = value.replace(/\bbearer\s+[A-Za-z0-9._~+/-]{12,}/gi, "Bearer [redacted]");
  value = value.replace(/\bsk-[A-Za-z0-9_-]{20,}/g, "[redacted-openai-key]");
  value = value.replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[redacted-aws-key]");
  value = value.replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, "[redacted-github-token]");
  value = value.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[redacted-github-token]");
  value = value.replace(/\bxox[abprs]-[A-Za-z0-9-]{20,}\b/g, "[redacted-slack-token]");
  value = value.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]");
  value = value.replace(/https?:\/\/\S+/gi, (url) => {
    try {
      const parsed = new URL(url);
      parsed.username = "";
      parsed.password = "";
      parsed.search = parsed.search ? "?[redacted-query]" : "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return "[redacted-url]";
    }
  });
  return truncate(value, 160);
}

function extractPromptText(input) {
  for (const key of ["user_prompt", "prompt", "message", "text"]) {
    if (typeof input[key] === "string" && input[key].trim()) return input[key];
  }
  if (input.payload && typeof input.payload.prompt === "string") return input.payload.prompt;
  return "";
}

function classifyLearningCue(prompt) {
  const text = normalizeWhitespace(prompt);
  if (!text || text.length < 6) return null;

  const rules = [
    {
      category: "explicit-learning-request",
      signal: "explicit memory or learning request",
      pattern: /(记住|记下来|记录一下|沉淀|作为规则|以后都|今后都|以后默认|长期|global rule|memory|learn this|remember this|save this)/i
    },
    {
      category: "user-correction",
      signal: "user correction or rejected assumption",
      pattern: /(不对|错了|不是这个|不是这样|我说的是|你误解|理解错|已经弄好|不是已经|别.*假设|不要.*假设|correction|you misunderstood|that's wrong|not what I meant)/i
    },
    {
      category: "durable-preference",
      signal: "durable workflow or style preference",
      pattern: /(以后默认|今后都|以后都|每次都|必须始终|作为规则|不要再|别再|always|never|by default|prefer .* by default)/i
    }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) return { category: rule.category, signal: rule.signal };
  }
  return null;
}

function observationsFile(ctx) {
  return path.join(ctx, "raw", "observations.jsonl");
}

function parseJsonLines(file) {
  const text = readText(file);
  if (!text.trim()) return [];
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      records.push({ malformed: true, raw: line });
    }
  }
  return records;
}

function recentObservationDuplicate(file, promptHash, excerpt) {
  const records = parseJsonLines(file).slice(-20);
  return records.some((record) => record.prompt_fingerprint === promptHash || record.prompt_excerpt === excerpt);
}

function appendLearningObservation(root, ctx, input, cue, prompt) {
  const file = observationsFile(ctx);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const promptHash = fingerprint(prompt);
  const redacted = containsPotentialSecret(prompt);
  const promptExcerpt = sanitizeLearningExcerpt(prompt);
  if (recentObservationDuplicate(file, promptHash, promptExcerpt)) return false;

  const event = {
    timestamp: new Date().toISOString(),
    hook_event_name: input.hook_event_name || "UserPromptSubmit",
    category: cue.category,
    signal: cue.signal,
    status: "unreviewed",
    source: "UserPromptSubmit",
    sensitive_redactions_applied: redacted,
    prompt_fingerprint: promptHash,
    cwd_relative: relativeCwd(root, input.cwd),
    prompt_excerpt: promptExcerpt,
    next_action: "Evaluate with codex-learning-memory. Save, improve, absorb, or drop; then refresh learned-instincts.md."
  };

  fs.appendFileSync(file, `${JSON.stringify(event)}\n`, "utf8");
  return true;
}

function walkMdFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMdFiles(full, out);
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

function newestMtime(files) {
  return files.reduce((latest, file) => Math.max(latest, mtimeMs(file)), 0);
}

function learningStatus(ctx) {
  const indexFile = path.join(ctx, REQUIRED_FILES.instincts);
  const indexMtime = mtimeMs(indexFile);
  const obsFile = observationsFile(ctx);
  const observations = parseJsonLines(obsFile).filter((record) => !record.malformed);
  const pendingObservations = observations.filter((record) => {
    const time = Date.parse(record.timestamp || "");
    return Number.isFinite(time) && time > indexMtime;
  });

  const instinctsBase = path.join(ctx, "instincts");
  const instinctFiles = [
    ...walkMdFiles(path.join(instinctsBase, "project")),
    ...walkMdFiles(path.join(instinctsBase, "candidates")),
    ...walkMdFiles(path.join(instinctsBase, "retired"))
  ];
  const newestInstinct = newestMtime(instinctFiles);
  const candidateCount = walkMdFiles(path.join(instinctsBase, "candidates")).length;
  const indexStale = newestInstinct ? indexMtime < newestInstinct - 1000 : false;
  const observationFilePending = fs.existsSync(obsFile) && mtimeMs(obsFile) > indexMtime + 1000;

  const issues = [];
  if (pendingObservations.length || observationFilePending) {
    issues.push(`${pendingObservations.length || "some"} raw learning observation(s) need Save/Improve/Absorb/Drop review`);
  }
  if (indexStale) {
    issues.push("learned-instincts.md is older than instinct files");
  }

  return {
    ok: issues.length === 0,
    issues,
    observations,
    pendingObservations,
    candidateCount,
    indexStale,
    obsFile
  };
}

function learningStatusText(root, ctx) {
  const status = learningStatus(ctx);
  const lines = [
    "Codex learning memory status",
    `Root: ${root}`,
    `Raw observations: ${status.observations.length}`,
    `Pending observations: ${status.pendingObservations.length}`,
    `Candidate instincts: ${status.candidateCount}`,
    `Index freshness: ${status.indexStale ? "stale" : "fresh"}`,
    ""
  ];

  if (status.pendingObservations.length) {
    lines.push("Newest pending observations:");
    for (const item of status.pendingObservations.slice(-8).reverse()) {
      lines.push(`- ${item.timestamp || "unknown time"} [${item.category || "unknown"}] ${item.prompt_excerpt || ""}`);
    }
    lines.push("");
  }

  if (status.issues.length) {
    lines.push("Next action:");
    lines.push("- Use codex-learning-memory to evaluate each pending observation.");
    lines.push("- Save useful patterns as instincts, absorb duplicates into existing docs, or record dropped noise.");
    lines.push("- Refresh .codex-context/learned-instincts.md after review.");
  } else {
    lines.push("OK: no pending learning review.");
  }
  return lines.join("\n");
}

function excerpt(ctx, name, max) {
  const text = readText(path.join(ctx, name)).trim();
  return text ? text.slice(0, max) : "";
}

function sectionExcerpt(markdown, heading, max) {
  const body = sectionContent(markdown, heading);
  if (!meaningful(body)) return "";
  const clipped = body.length > max ? `${body.slice(0, max - 3)}...` : body;
  return `## ${heading}\n${clipped}`;
}

function handoffRecoveryExcerpt(ctx) {
  const markdown = readText(path.join(ctx, REQUIRED_FILES.handoff));
  const sections = [
    ["Objective", 280],
    ["Latest User Instruction", 360],
    ["Plan Status", 360],
    ["Git Checkpoint", 520],
    ["Next Action", 320],
    ["Files To Re-read First", 420],
    ["Open Questions And Assumptions", 360],
    ["Verification Evidence", 420]
  ];
  const selected = sections
    .map(([heading, max]) => sectionExcerpt(markdown, heading, max))
    .filter(Boolean);
  if (selected.length) return selected.join("\n\n");
  return excerpt(ctx, REQUIRED_FILES.handoff, 1800);
}

function sessionRecoveryContext(root, ctx, eventName) {
  const learning = learningStatus(ctx);
  const learningSummary = learning.ok
    ? "No pending learning review."
    : `Pending learning review: ${learning.issues.join("; ")}.`;
  const checkpointSummary = gitCheckpointStatus(root, ctx, 0).summary;

  const parts = [
    "Codex Project Ops hooks are active.",
    "Recovery order: handoff-summary.md -> current-state.md -> project-map.md -> spec.md -> plan-progress.md -> artifact-index.md -> learned-instincts.md -> latest user instruction.",
    "Before editing, keep artifact-index.md current. Before completion, update verification.md, Git Checkpoint, and handoff-summary.md.",
    learningSummary,
    checkpointSummary,
    "",
    "Handoff excerpt:",
    handoffRecoveryExcerpt(ctx),
    "",
    "Current state excerpt:",
    excerpt(ctx, REQUIRED_FILES.current, 1000),
    "",
    "Plan excerpt:",
    excerpt(ctx, REQUIRED_FILES.plan, 700),
    "",
    "Learned instincts excerpt:",
    excerpt(ctx, REQUIRED_FILES.instincts, 900)
  ].filter((part) => part !== "");

  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: parts.join("\n")
    }
  };
}

function sessionStart(input, root, ctx) {
  writeJson(sessionRecoveryContext(root, ctx, "SessionStart"));
}

function postCompact(input, root, ctx) {
  writeJson(sessionRecoveryContext(root, ctx, "PostCompact"));
}

function userPromptSubmit(input, root, ctx) {
  const prompt = extractPromptText(input);
  const cue = classifyLearningCue(prompt);
  if (!cue) return;

  const saved = appendLearningObservation(root, ctx, input, cue, prompt);
  if (!saved) return;

  const message = [
    "Codex Project Ops captured a raw learning observation.",
    "Do not treat it as active memory yet.",
    "Before compaction or stopping, evaluate it with codex-learning-memory and refresh learned-instincts.md."
  ].join(" ");

  writeJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: message
    }
  });
}

function postToolUse(input, root, ctx) {
  const changed = gitChangedFiles(root);
  if (changed.length === 0) return;

  const latest = latestChangedMtime(root, changed);
  if (fileFresh(ctx, REQUIRED_FILES.artifacts, latest)) return;

  const reason = [
    "Codex Project Ops: non-context files changed, but .codex-context/artifact-index.md is not fresh.",
    `Changed files: ${shortList(changed)}.`,
    "Update artifact-index.md with created/modified/read files and why they matter before continuing.",
    "Also update current-state.md if phase, assumption, or next action changed."
  ].join("\n");

  writeJson({
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: reason
    }
  });
}

function preCompact(input, root, ctx) {
  const changed = gitChangedFiles(root);
  const statusFiles = gitStatusFiles(root);
  const latest = latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
  const issues = [];

  for (const [key, label] of [
    [REQUIRED_FILES.current, "current-state.md"],
    [REQUIRED_FILES.plan, "plan-progress.md"],
    [REQUIRED_FILES.artifacts, "artifact-index.md"]
  ]) {
    const status = markdownStatus(ctx, key, latest, label);
    if (!status.ok) issues.push(status.issue);
  }

  const handoff = handoffStatus(ctx, latest);
  if (!handoff.ok) {
    if (handoff.stale) issues.push("handoff-summary.md is older than changed project files");
    if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
  }

  const learning = learningStatus(ctx);
  issues.push(...learning.issues);

  const checkpoint = gitCheckpointStatus(root, ctx, latest);
  if (!checkpoint.ok) issues.push(checkpoint.summary);

  if (issues.length === 0) return;

  writeJson({
    continue: false,
    stopReason: "codex-project-ops-handoff-not-ready",
    systemMessage: [
      "Codex Project Ops blocked compaction.",
      `Issues: ${issues.join("; ")}.`,
      "Refresh current-state.md, plan-progress.md, artifact-index.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. Then compact again."
    ].join("\n")
  });
}

function stop(input, root, ctx) {
  if (input.stop_hook_active) {
    writeJson({ continue: true });
    return;
  }

  const changed = gitChangedFiles(root);
  const learning = learningStatus(ctx);
  const statusFiles = gitStatusFiles(root);
  const latest = latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
  const checkpoint = gitCheckpointStatus(root, ctx, latest);

  if (changed.length === 0 && learning.ok && checkpoint.ok) {
    writeJson({ continue: true });
    return;
  }

  const issues = [];

  if (changed.length > 0) {
    for (const [key, label] of [
      [REQUIRED_FILES.current, "current-state.md"],
      [REQUIRED_FILES.artifacts, "artifact-index.md"]
    ]) {
      const status = markdownStatus(ctx, key, latest, label);
      if (!status.ok) issues.push(status.issue);
    }

    const verification = verificationStatus(ctx, latest);
    if (verification.stale) issues.push("verification.md is older than changed files");
    if (!verification.hasEvidence) issues.push("verification.md has neither command evidence nor explicit unverified gaps");

    const handoff = handoffStatus(ctx, latest);
    if (!handoff.ok) {
      if (handoff.stale) issues.push("handoff-summary.md is older than changed files");
      if (handoff.missing.length) issues.push(`handoff-summary.md missing: ${handoff.missing.join(", ")}`);
    }
  }

  issues.push(...learning.issues);
  if (!checkpoint.ok) issues.push(checkpoint.summary);

  if (issues.length === 0) {
    writeJson({ continue: true });
    return;
  }

  writeJson({
    decision: "block",
    reason: [
      "Before stopping, refresh Codex Project Ops state.",
      changed.length ? `Changed files: ${shortList(changed)}.` : "No non-context files changed.",
      `Issues: ${issues.join("; ")}.`,
      "Update artifact-index.md, current-state.md, verification.md, handoff-summary.md, Git Checkpoint, and learned-instincts.md as applicable. If verification was not run, record the explicit gap instead of claiming success."
    ].join("\n")
  });
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

function contextBudget(root) {
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

function hookDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function findInstinctScript(root) {
  const candidates = [
    path.join(root, ".codex", "scripts", "instincts.mjs"),
    path.resolve(hookDir(), "..", "scripts", "instincts.mjs"),
    path.resolve(hookDir(), "..", "..", "scripts", "instincts.mjs")
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function findProjectOpsScript(root, scriptName) {
  const candidates = [
    path.join(root, ".codex", "scripts", scriptName),
    path.resolve(hookDir(), "..", "scripts", scriptName),
    path.resolve(hookDir(), "..", "..", "scripts", scriptName)
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function runInstinctCommand(root, command, extraArgs) {
  const script = findInstinctScript(root);
  if (!script) {
    process.stderr.write("Cannot find instincts.mjs. Reinstall Codex Project Ops Kit or run scripts/instincts.mjs from the kit.\n");
    process.exit(1);
  }
  try {
    const out = execFileSync(process.execPath, [script, command, root, ...extraArgs], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    process.stdout.write(out);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    process.exit(error.status || 1);
  }
}

function runProjectOpsScript(root, scriptName, extraArgs) {
  const script = findProjectOpsScript(root, scriptName);
  if (!script) {
    process.stderr.write(`Cannot find ${scriptName}. Reinstall Codex Project Ops Kit.\n`);
    process.exit(1);
  }
  try {
    const out = execFileSync(process.execPath, [script, root, ...extraArgs], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    process.stdout.write(out);
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    process.exit(error.status || 1);
  }
}

const cliMode = process.argv[2];
if (cliMode === "context-budget") {
  const rootArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
  const root = gitRoot(rootArg);
  process.stdout.write(`${contextBudget(root)}\n`);
  process.exit(0);
}
if (cliMode === "learning-status") {
  const rootArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
  const root = gitRoot(rootArg);
  const ctx = ensureContext(root);
  process.stdout.write(`${learningStatusText(root, ctx)}\n`);
  process.exit(0);
}
if (cliMode && cliMode.startsWith("instinct-")) {
  const rootArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
  const extraArgs = rootArg === process.cwd() ? process.argv.slice(3) : process.argv.slice(4);
  const root = gitRoot(rootArg);
  const command = cliMode.replace(/^instinct-/, "");
  const mapped = command === "promotion" ? "promotion-candidates" : command;
  runInstinctCommand(root, mapped, extraArgs);
  process.exit(0);
}
if (cliMode === "health-check") {
  const rootArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
  const extraArgs = rootArg === process.cwd() ? process.argv.slice(3) : process.argv.slice(4);
  const root = gitRoot(rootArg);
  runProjectOpsScript(root, "project-ops-health.mjs", extraArgs);
  process.exit(0);
}
if (cliMode === "release-check") {
  const rootArg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
  const extraArgs = rootArg === process.cwd() ? process.argv.slice(3) : process.argv.slice(4);
  const root = gitRoot(rootArg);
  runProjectOpsScript(root, "release-check.mjs", extraArgs);
  process.exit(0);
}

const input = readStdinJson();
const cwd = input.cwd || process.cwd();
const root = gitRoot(cwd);
const ctx = ensureContext(root);

switch (input.hook_event_name) {
  case "SessionStart":
    sessionStart(input, root, ctx);
    break;
  case "UserPromptSubmit":
    userPromptSubmit(input, root, ctx);
    break;
  case "PostToolUse":
    postToolUse(input, root, ctx);
    break;
  case "PreCompact":
    preCompact(input, root, ctx);
    break;
  case "PostCompact":
    postCompact(input, root, ctx);
    break;
  case "Stop":
    stop(input, root, ctx);
    break;
  default:
    break;
}
