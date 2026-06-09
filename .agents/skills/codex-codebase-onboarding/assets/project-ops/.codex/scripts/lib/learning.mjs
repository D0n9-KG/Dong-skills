import fs from "node:fs";
import path from "node:path";
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
