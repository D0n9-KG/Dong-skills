import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function readStdinJson() {
  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid hook input JSON: ${error.message}`);
  }
}

export function validateHookInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Hook input must be a JSON object");
  }
  const eventName = String(input.hook_event_name || "").trim();
  if (!eventName) throw new Error("Hook input requires hook_event_name");

  if (eventName === "PreToolUse") {
    const name = String(input.tool_name || input.toolName || input.tool || input.name || "").trim();
    if (!name) throw new Error("PreToolUse requires tool_name");
  }
  if (eventName === "SubagentStart" || eventName === "SubagentStop") {
    const agentId = String(input.agent_id || input.agentId || "").trim();
    if (!agentId) throw new Error(`${eventName} requires agent_id`);
  }
  return input;
}

export function writeJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

export function writeTextAtomic(file, text) {
  const directory = path.dirname(file);
  const temp = path.join(
    directory,
    `.${path.basename(file)}.${process.pid}.${process.hrtime.bigint()}.tmp`
  );
  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temp, String(text), "utf8");
    fs.renameSync(temp, file);
  } catch (error) {
    try {
      fs.rmSync(temp, { force: true });
    } catch {}
    throw error;
  }
}

export function gitRoot(cwd) {
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

export function mtimeMs(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

export function latestChangedMtime(root, files) {
  let latest = 0;
  for (const file of files) {
    const abs = path.join(root, file);
    if (fs.existsSync(abs)) latest = Math.max(latest, mtimeMs(abs));
    else latest = Math.max(latest, nearestExistingAncestorMtime(abs));
  }
  return latest;
}

function nearestExistingAncestorMtime(file) {
  let current = path.dirname(file);
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(current)) return mtimeMs(current);
    current = path.dirname(current);
  }
  return 0;
}

export function fileFresh(ctx, name, latest) {
  if (!latest) return true;
  return mtimeMs(path.join(ctx, name)) >= latest - 1000;
}

export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function shortList(files, max = 8) {
  if (files.length <= max) return files.join(", ");
  return `${files.slice(0, max).join(", ")} and ${files.length - max} more`;
}

export function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function truncate(text, max) {
  const value = normalizeWhitespace(text);
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export function relativeCwd(root, cwd) {
  if (!cwd) return ".";
  const rel = path.relative(root, path.resolve(cwd)).replace(/\\/g, "/");
  if (!rel || rel === ".") return ".";
  if (rel.startsWith("../") || rel === ".." || path.isAbsolute(rel)) return "[outside-project]";
  return rel;
}

export function walkMdFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMdFiles(full, out);
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

export function newestMtime(files) {
  return files.reduce((latest, file) => Math.max(latest, mtimeMs(file)), 0);
}

export function walkFiles(root, relDir, out = []) {
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
