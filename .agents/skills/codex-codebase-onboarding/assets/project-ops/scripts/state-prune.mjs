#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

function parseArgs(argv) {
  const maybeRoot = argv[0] && !argv[0].startsWith("--") ? argv[0] : process.cwd();
  const flags = argv[0] && !argv[0].startsWith("--") ? argv.slice(1) : argv;
  let keep = 8;
  let apply = false;

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--apply") apply = true;
    if (flag === "--dry-run") apply = false;
    if (flag === "--keep") {
      keep = Number.parseInt(flags[index + 1] || "", 10);
      index += 1;
    } else if (flag.startsWith("--keep=")) {
      keep = Number.parseInt(flag.slice("--keep=".length), 10);
    }
  }

  if (!Number.isFinite(keep) || keep < 1) keep = 8;
  return { root: gitRoot(maybeRoot), keep, apply };
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function sectionBody(markdown, heading) {
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

function replaceSection(markdown, heading, body) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return `${markdown.trimEnd()}\n\n## ${heading}\n${body.trimEnd()}\n`;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }

  const next = [
    ...lines.slice(0, start + 1),
    ...body.trimEnd().split(/\r?\n/),
    ...lines.slice(end)
  ];
  return `${next.join("\n").trimEnd()}\n`;
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

function archiveFile(ctx) {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join(ctx, "archive", `verification-${stamp}.md`);
}

function appendArchive(file, archivedItems) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const now = new Date().toISOString();
  const existing = readText(file).trimEnd();
  const block = [
    existing || `# Verification Archive ${new Date().toISOString().slice(0, 10)}`,
    "",
    `## Archived ${now}`,
    "",
    ...archivedItems,
    ""
  ].join("\n");
  fs.writeFileSync(file, `${block.trimEnd()}\n`, "utf8");
}

function pruneVerification(root, keep, apply) {
  const ctx = path.join(root, ".codex-context");
  const verification = path.join(ctx, "verification.md");
  const markdown = readText(verification);
  if (!markdown.trim()) {
    return { changed: false, text: "No .codex-context/verification.md found or file is empty." };
  }

  const commands = splitCommandItems(sectionBody(markdown, "Commands Run"));
  if (commands.length <= keep) {
    return {
      changed: false,
      text: `No pruning needed. Commands Run has ${commands.length} item(s), keep threshold is ${keep}.`
    };
  }

  const archived = commands.slice(0, commands.length - keep);
  const kept = commands.slice(commands.length - keep);
  const targetArchive = archiveFile(ctx);
  const nextMarkdown = replaceSection(markdown, "Commands Run", kept.join("\n"));

  if (apply) {
    appendArchive(targetArchive, archived);
    fs.writeFileSync(verification, nextMarkdown, "utf8");
  }

  const relArchive = path.relative(root, targetArchive).replace(/\\/g, "/");
  return {
    changed: true,
    text: [
      "Codex state prune report",
      `Root: ${root}`,
      `Mode: ${apply ? "apply" : "dry-run"}`,
      `Commands Run items: ${commands.length}`,
      `Keep: ${keep}`,
      `Archive: ${archived.length} item(s) -> ${relArchive}`,
      `Remain: ${kept.length} item(s) in .codex-context/verification.md`,
      apply ? "Result: verification history archived." : "Result: no files changed. Pass --apply to archive."
    ].join("\n")
  };
}

const { root, keep, apply } = parseArgs(process.argv.slice(2));
const result = pruneVerification(root, keep, apply);
console.log(result.text);
