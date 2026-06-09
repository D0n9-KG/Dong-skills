import path from "node:path";
import { mtimeMs, readText } from "./core.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export function sectionContent(markdown, heading) {
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

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkpointField(checkpoint, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegex(label)}\\s*:\\s*(.*)$`, "im");
    const match = checkpoint.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

export function validateGitCheckpointSection(checkpoint) {
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

export function meaningful(text) {
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

export function markdownStatus(ctx, name, latest, label = name) {
  const file = path.join(ctx, name);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  return {
    ok: !stale,
    stale,
    issue: stale ? `${label} is older than changed project files` : ""
  };
}

export function handoffStatus(ctx, latest) {
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

export function verificationStatus(ctx, latest) {
  const file = path.join(ctx, REQUIRED_FILES.verification);
  const markdown = readText(file);
  const stale = latest ? mtimeMs(file) < latest - 1000 : false;
  const commands = sectionContent(markdown, "Commands Run");
  const gaps = sectionContent(markdown, "Not Yet Verified");
  const hasEvidence = meaningful(commands) || meaningful(gaps);
  return { ok: !stale && hasEvidence, stale, hasEvidence };
}
