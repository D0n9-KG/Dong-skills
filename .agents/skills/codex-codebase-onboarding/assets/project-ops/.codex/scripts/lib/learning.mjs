import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  newestMtime,
  normalizeWhitespace,
  readText,
  relativeCwd,
  truncate,
  walkMdFiles
} from "./core.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

function fingerprint(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex").slice(0, 16);
}

export function containsPotentialSecret(text) {
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

export function sanitizeLearningExcerpt(text) {
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

export function extractPromptText(input) {
  for (const key of ["user_prompt", "prompt", "message", "text"]) {
    if (typeof input[key] === "string" && input[key].trim()) return input[key];
  }
  if (input.payload && typeof input.payload.prompt === "string") return input.payload.prompt;
  return "";
}

export function classifyLearningCue(prompt) {
  const text = normalizeWhitespace(prompt);
  if (!text || text.length < 6) return null;

  const rules = [
    {
      category: "explicit-learning-request",
      signal: "explicit memory or learning request",
      pattern: /(记住|记下来|记录一个|沉淀|作为规则|以后都|今后都|以后默认|长期|global rule|memory|learn this|remember this|save this)/i
    },
    {
      category: "user-correction",
      signal: "user correction or rejected assumption",
      pattern: /(不对|错了|不是这个|不是这样|我说的是|你误解|理解错|已经弄好|不要假设|别假设|correction|you misunderstood|that's wrong|not what I meant)/i
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

export function observationsFile(ctx) {
  return path.join(ctx, "raw", "observations.jsonl");
}

export function dongSkillsOutboxFile(ctx) {
  return path.join(ctx, REQUIRED_FILES.dongSkillsOutbox);
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function normalizePathCandidate(value) {
  if (!value || typeof value !== "string") return "";
  try {
    return path.resolve(value);
  } catch {
    return "";
  }
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function installedSkillRoots() {
  const home = os.homedir();
  return [
    path.join(home, ".agents", "skills"),
    path.join(home, ".codex", "skills")
  ];
}

function isInstalledSkillCopy(candidate) {
  const resolved = normalizePathCandidate(candidate);
  return installedSkillRoots().some((skillsRoot) => isInside(skillsRoot, resolved));
}

function dongSkillsBacklog(candidate) {
  return path.join(candidate, "docs", "improvements", "backlog.md");
}

function isDongSkillsSourceRepo(candidate) {
  const resolved = normalizePathCandidate(candidate);
  if (!resolved || isInstalledSkillCopy(resolved)) return false;
  return fs.existsSync(dongSkillsBacklog(resolved)) &&
    fs.existsSync(path.join(resolved, ".agents", "skills", "codex-learning-memory", "SKILL.md"));
}

function sourceMarkerCandidates() {
  const markers = [];
  for (const skillsRoot of installedSkillRoots()) {
    markers.push(path.join(skillsRoot, ".dong-skills-source.json"));
  }
  return markers;
}

function markerRepoCandidates(env = process.env) {
  if (env.DONG_SKILLS_DISABLE_SOURCE_MARKER === "1") return [];
  const candidates = [];
  for (const marker of sourceMarkerCandidates()) {
    const data = readJsonFile(marker);
    if (!data) continue;
    for (const key of ["source_repo", "sourceRepo", "repo", "root"]) {
      if (typeof data[key] === "string") candidates.push({ path: data[key], source: `source marker ${path.basename(marker)}` });
    }
  }
  return candidates;
}

function parentCandidates(root) {
  const candidates = [];
  let current = normalizePathCandidate(root);
  for (let depth = 0; current && depth < 5; depth += 1) {
    candidates.push({ path: current, source: depth === 0 ? "current repo" : "parent repo" });
    candidates.push({ path: path.join(current, "outputs", "codex-project-ops-kit"), source: "known checkout candidate" });
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates;
}

export function findDongSkillsRepo(root, env = process.env) {
  const candidates = [
    { path: env.DONG_SKILLS_REPO, source: "DONG_SKILLS_REPO" },
    { path: env.DONG_SKILLS_HOME, source: "DONG_SKILLS_HOME" },
    ...markerRepoCandidates(env),
    ...parentCandidates(root)
  ];

  const seen = new Set();
  const rejectedInstalledCopies = [];
  for (const candidate of candidates) {
    const resolved = normalizePathCandidate(candidate.path);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    if (isInstalledSkillCopy(resolved)) {
      rejectedInstalledCopies.push(resolved);
      continue;
    }
    if (isDongSkillsSourceRepo(resolved)) {
      return {
        found: true,
        root: resolved,
        backlogFile: dongSkillsBacklog(resolved),
        source: candidate.source,
        rejectedInstalledCopies
      };
    }
  }

  return {
    found: false,
    root: "",
    backlogFile: "",
    source: "fallback outbox",
    rejectedInstalledCopies
  };
}

function pendingOutboxItems(outboxFile) {
  const text = readText(outboxFile);
  if (!text.trim()) return [];
  const blocks = text.split(/\n(?=###\s+)/).filter((block) => /^###\s+/m.test(block));
  return blocks.filter((block) => !/Status:\s*(done|migrated|rejected)/i.test(block));
}

export function dongSkillsMetaLearningStatus(root, ctx, env = process.env) {
  const repo = findDongSkillsRepo(root, env);
  const outboxFile = dongSkillsOutboxFile(ctx);
  const pendingOutbox = pendingOutboxItems(outboxFile);
  return {
    repo,
    outboxFile,
    pendingOutbox,
    pendingOutboxCount: pendingOutbox.length,
    target: repo.found ? repo.backlogFile : outboxFile,
    targetKind: repo.found ? "source-backlog" : "fallback-outbox"
  };
}

export function parseJsonLines(file) {
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

export function appendLearningObservation(root, ctx, input, cue, prompt) {
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

export function learningStatus(ctx) {
  const indexFile = path.join(ctx, REQUIRED_FILES.instincts);
  const indexMtime = fs.existsSync(indexFile) ? fs.statSync(indexFile).mtimeMs : 0;
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
  const observationFilePending = fs.existsSync(obsFile) && fs.statSync(obsFile).mtimeMs > indexMtime + 1000;

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

export function learningStatusText(root, ctx) {
  const status = learningStatus(ctx);
  const meta = dongSkillsMetaLearningStatus(root, ctx);
  const lines = [
    "Codex learning memory status",
    `Root: ${root}`,
    `Raw observations: ${status.observations.length}`,
    `Pending observations: ${status.pendingObservations.length}`,
    `Candidate instincts: ${status.candidateCount}`,
    `Index freshness: ${status.indexStale ? "stale" : "fresh"}`,
    "",
    "Dong Skills meta-learning:",
    `Target: ${meta.repo.found ? meta.repo.backlogFile : "not found; use fallback outbox"}`,
    `Target source: ${meta.repo.found ? meta.repo.source : "fallback outbox"}`,
    `Fallback outbox: ${path.relative(root, meta.outboxFile).replace(/\\/g, "/")}`,
    `Pending outbox items: ${meta.pendingOutboxCount}`,
    "Installed skill copies are not treated as the Dong Skills source repo.",
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
