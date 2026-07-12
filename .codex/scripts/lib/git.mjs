import { execFileSync } from "node:child_process";
import path from "node:path";
import { latestChangedInfo, latestChangedMtime, mtimeMs, readText } from "./core.mjs";
import { meaningful, sectionContent, validateGitCheckpointSection } from "./markdown.mjs";
import { REQUIRED_FILES } from "./templates.mjs";

export function isGovernancePath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").toLowerCase();
  return normalized === ".codex-context" ||
    normalized.startsWith(".codex-context/");
}

function isProjectOpsRuntimePath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  return normalized === ".codex-context/raw/project-ops-runtime" ||
    normalized.startsWith(".codex-context/raw/project-ops-runtime/");
}

export function gitChangedFiles(root) {
  return gitStatusFiles(root).filter((name) => !isGovernancePath(name));
}

export function isVerificationRelevantPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").toLowerCase();
  if (!normalized) return false;
  if (isGovernancePath(normalized)) return false;
  if (normalized === "agents.md" || /^\.agents\/skills\/.+\/skill\.md$/.test(normalized)) return true;
  if (/(?:^|\/)(?:readme|changelog|license)(?:\.[^/]*)?$/i.test(normalized)) return false;
  if (/\.(?:md|txt|rst|adoc)$/i.test(normalized)) return false;
  return true;
}

export function changedPathsNeedVerification(files) {
  return files.some((file) => isVerificationRelevantPath(file));
}

export function gitStatusResult(root) {
  try {
    const out = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const records = out.split("\0");
    const files = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (!record || record.length < 4) continue;
      const status = record.slice(0, 2);
      const name = record.slice(3);
      if (name) files.push(name);
      if (/[RC]/.test(status)) index += 1;
    }
    return {
      ok: true,
      files: [...new Set(files)],
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      files: [],
      error: String(error.stderr || error.message || error).trim()
    };
  }
}

export function gitStatusFiles(root) {
  return gitStatusResult(root).files;
}

export function gitHeadResult(root) {
  try {
    return {
      ok: true,
      head: execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }).trim(),
      error: ""
    };
  } catch (error) {
    const status = gitStatusResult(root);
    if (status.ok) return { ok: true, head: "", error: "" };
    return {
      ok: false,
      head: "",
      error: String(error.stderr || error.message || error).trim()
    };
  }
}

export function gitDiffFilesResult(root, fromHead, toHead) {
  if (!toHead || fromHead === toHead) {
    return { ok: true, files: [], error: "" };
  }
  const args = fromHead
    ? ["diff", "--name-only", "-z", fromHead, toHead]
    : ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", toHead];
  try {
    const out = execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return {
      ok: true,
      files: [...new Set(out.split("\0").filter(Boolean))],
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      files: [],
      error: String(error.stderr || error.message || error).trim()
    };
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

function latestFileMtime(root, files) {
  let latest = { file: "", mtime: 0 };
  for (const file of files) {
    const abs = path.join(root, file);
    const current = mtimeMs(abs);
    if (current > latest.mtime) latest = { file, mtime: current };
  }
  return latest;
}

function formatMtime(ms) {
  if (!ms) return "missing";
  return new Date(ms).toISOString();
}

export function gitCheckpointStatus(root, ctx, latest, freshnessFiles = []) {
  const statusResult = gitStatusResult(root);
  const statusFiles = statusResult.files.filter((file) => !isProjectOpsRuntimePath(file));
  const branch = gitCurrentBranch(root);
  const remote = gitHasRemote(root);
  const aheadBehind = gitAheadBehind(root);
  const issues = [];
  const checkpointDetails = [];

  if (!statusResult.ok) issues.push(`Git status unavailable: ${statusResult.error || "unknown error"}`);
  if (statusFiles.length > 0) issues.push(`${statusFiles.length} uncommitted file(s)`);
  if (aheadBehind.ahead > 0) issues.push(`${aheadBehind.ahead} unpushed commit(s)`);
  if (remote && branch && !aheadBehind.hasUpstream) issues.push(`branch '${branch}' has no upstream`);

  const needsCheckpoint = issues.length > 0;
  const handoffFile = path.join(ctx, REQUIRED_FILES.handoff);
  const handoff = readText(handoffFile);
  const checkpoint = sectionContent(handoff, "Git Checkpoint");
  const handoffMtime = mtimeMs(handoffFile);
  const suppliedFreshness = freshnessFiles.length
    ? latestChangedInfo(root, freshnessFiles)
    : { file: "", mtime: latest || 0 };
  const freshnessLatest = suppliedFreshness.mtime || latest || 0;
  const checkpointFresh = freshnessLatest ? handoffMtime >= freshnessLatest - 1000 : true;
  const checkpointValidation = validateGitCheckpointSection(checkpoint);
  const checkpointRecorded = meaningful(checkpoint) && checkpointFresh && checkpointValidation.ok;
  const nonGovernanceStatusFiles = statusFiles.filter((file) => !isGovernancePath(file));
  const latestChanged = freshnessFiles.length
    ? suppliedFreshness
    : latestFileMtime(root, nonGovernanceStatusFiles.length ? nonGovernanceStatusFiles : statusFiles);

  if (needsCheckpoint && meaningful(checkpoint) && !checkpointFresh) {
    checkpointDetails.push([
      "handoff-summary.md is older than changed files",
      `latest changed file: ${latestChanged.file || "unknown"}`,
      `latest mtime: ${formatMtime(freshnessLatest)}`,
      `handoff mtime: ${formatMtime(handoffMtime)}`,
      "refresh handoff-summary.md after verification/artifact/current-state updates"
    ].join("; "));
  }
  if (needsCheckpoint && checkpointValidation.missing.length) {
    issues.push(`Git Checkpoint missing field(s): ${checkpointValidation.missing.join(", ")}`);
  }

  const onlyGovernanceChanges = statusFiles.length > 0 && nonGovernanceStatusFiles.length === 0;
  if (needsCheckpoint && onlyGovernanceChanges) {
    checkpointDetails.push("Only governance/context files changed; a structured deferred reason is acceptable when no code checkpoint is needed.");
  }
  const checkpointTailAccepted = needsCheckpoint && onlyGovernanceChanges && checkpointRecorded;

  const detailText = checkpointDetails.length ? ` Details: ${checkpointDetails.join(" ")}` : "";

  return {
    ok: statusResult.ok && (!needsCheckpoint || checkpointRecorded),
    gitAvailable: statusResult.ok,
    gitError: statusResult.error,
    needsCheckpoint,
    checkpointTailAccepted,
    checkpointRecorded,
    checkpointValidation,
    checkpointFresh,
    checkpointDetails,
    statusFiles,
    issues,
    summary: needsCheckpoint && checkpointRecorded
      ? `Git checkpoint ok: handoff-summary.md has a fresh structured Git Checkpoint.${checkpointTailAccepted ? " Checkpoint finalize tail accepted for governance/context-only changes." : ""}${detailText}`
      : needsCheckpoint
        ? `Git checkpoint needs review: ${issues.join("; ")}.${detailText} Use codex-git-checkpoint to commit/push or record the deferred reason in handoff-summary.md -> Git Checkpoint.`
      : "Git checkpoint ok: worktree has no uncommitted files and no unpushed commits."
  };
}

export function latestProjectMtime(root) {
  const statusFiles = gitStatusFiles(root);
  const changed = statusFiles.filter((file) => !isGovernancePath(file));
  return latestChangedMtime(root, [...new Set([...changed, ...statusFiles])]);
}
