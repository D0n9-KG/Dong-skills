import { execFileSync } from "node:child_process";
import path from "node:path";
import { latestChangedMtime, mtimeMs, readText } from "./core.mjs";
import { meaningful, sectionContent, validateGitCheckpointSection } from "./markdown.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export function isGovernancePath(relPath) {
  return relPath === ".codex" ||
    relPath.startsWith(".codex/") ||
    relPath === ".codex-context" ||
    relPath.startsWith(".codex-context/") ||
    relPath === "AGENTS.md";
}

export function gitChangedFiles(root) {
  return gitStatusFiles(root).filter((name) => !isGovernancePath(name));
}

export function gitStatusFiles(root) {
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

export function gitCurrentBranch(root) {
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

export function gitHasRemote(root) {
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

export function gitAheadBehind(root) {
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

export function gitCheckpointStatus(root, ctx, latest) {
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

export function latestProjectMtime(root) {
  const statusFiles = gitStatusFiles(root);
  const changed = statusFiles.filter((file) => !isGovernancePath(file));
  return latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
}
