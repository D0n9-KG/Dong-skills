import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function runGit(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function resolveGitPath(root, value) {
  if (!value) return "";
  if (path.isAbsolute(value)) return path.resolve(value);
  return path.resolve(root, value);
}

function normalizedPath(value) {
  return path.resolve(value || "").replace(/\\/g, "/").toLowerCase();
}

function pathContainsSegment(value, segments) {
  const normalized = normalizedPath(value);
  return segments.some((segment) => normalized.includes(segment));
}

function dongManagedWorktree(root) {
  const marker = path.join(root, ".codex-context", "dong-worktree.json");
  try {
    const payload = JSON.parse(fs.readFileSync(marker, "utf8"));
    return payload.managed_by === "Dong Skills" && payload.role === "dong-managed-worktree";
  } catch {
    return false;
  }
}

export function detectWorktree(cwd) {
  const root = runGit(cwd, ["rev-parse", "--show-toplevel"]) || path.resolve(cwd);
  const gitDirRaw = runGit(cwd, ["rev-parse", "--git-dir"]);
  const gitCommonRaw = runGit(cwd, ["rev-parse", "--git-common-dir"]);
  const gitDir = resolveGitPath(root, gitDirRaw);
  const gitCommonDir = resolveGitPath(root, gitCommonRaw);
  const branch = runGit(cwd, ["branch", "--show-current"]);
  const superproject = runGit(cwd, ["rev-parse", "--show-superproject-working-tree"]);
  const isGitRepo = Boolean(gitDirRaw && gitCommonRaw);
  const isSubmodule = Boolean(superproject);
  const isLinkedWorktree = isGitRepo &&
    !isSubmodule &&
    Boolean(gitDir && gitCommonDir) &&
    normalizedPath(gitDir) !== normalizedPath(gitCommonDir);

  let role = "unknown";
  let cleanupOwner = "unknown";
  if (isSubmodule) {
    role = "submodule";
    cleanupOwner = "none";
  } else if (!isGitRepo) {
    role = "unknown";
    cleanupOwner = "unknown";
  } else if (!isLinkedWorktree) {
    role = "primary-checkout";
    cleanupOwner = "none";
  } else if (pathContainsSegment(root, ["/.codex/worktrees/"])) {
    role = "codex-managed-worktree";
    cleanupOwner = "host";
  } else if (dongManagedWorktree(root)) {
    role = "dong-managed-worktree";
    cleanupOwner = "dong-skills";
  } else {
    role = "manual-worktree";
    cleanupOwner = "user";
  }

  return {
    root,
    gitDir,
    gitCommonDir,
    branch,
    detached: isGitRepo && !branch,
    isGitRepo,
    isLinkedWorktree,
    isSubmodule,
    superproject,
    role,
    cleanupOwner
  };
}

export function worktreeSummary(info) {
  const branch = info.detached ? "detached HEAD" : (info.branch || "none");
  return `Worktree: role=${info.role}; branch=${branch}; linked=${info.isLinkedWorktree ? "yes" : "no"}; cleanup=${info.cleanupOwner}.`;
}

export function worktreeHealthLines(info) {
  return [
    "Worktree:",
    `- Role: ${info.role}`,
    `- Root: ${info.root}`,
    `- Git dir: ${info.gitDir || "not detected"}`,
    `- Git common dir: ${info.gitCommonDir || "not detected"}`,
    `- Branch: ${info.detached ? "detached HEAD" : (info.branch || "none")}`,
    `- Linked worktree: ${info.isLinkedWorktree ? "yes" : "no"}`,
    `- Submodule: ${info.isSubmodule ? "yes" : "no"}`,
    `- Cleanup owner: ${info.cleanupOwner}`
  ];
}
