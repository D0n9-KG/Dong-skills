#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
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
  const options = {};
  let apply = false;

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const value = flags[index + 1];
    if (flag === "--apply") apply = true;
    else if (flag === "--dry-run") apply = false;
    else if (flag === "--keep-verification") {
      options.verificationKeep = Number.parseInt(value || "", 10);
      index += 1;
    } else if (flag.startsWith("--keep-verification=")) {
      options.verificationKeep = Number.parseInt(flag.slice("--keep-verification=".length), 10);
    } else if (flag === "--verification-issue-threshold") {
      options.verificationIssueThreshold = Number.parseInt(value || "", 10);
      index += 1;
    } else if (flag.startsWith("--verification-issue-threshold=")) {
      options.verificationIssueThreshold = Number.parseInt(flag.slice("--verification-issue-threshold=".length), 10);
    } else if (flag === "--keep-precompact") {
      options.rawPrecompactKeep = Number.parseInt(value || "", 10);
      index += 1;
    } else if (flag.startsWith("--keep-precompact=")) {
      options.rawPrecompactKeep = Number.parseInt(flag.slice("--keep-precompact=".length), 10);
    } else if (flag === "--raw-days") {
      options.rawMaxAgeDays = Number.parseInt(value || "", 10);
      index += 1;
    } else if (flag.startsWith("--raw-days=")) {
      options.rawMaxAgeDays = Number.parseInt(flag.slice("--raw-days=".length), 10);
    } else if (flag === "--raw-total-warn-mb") {
      options.rawTotalWarnBytes = Number.parseInt(value || "", 10) * 1024 * 1024;
      index += 1;
    } else if (flag.startsWith("--raw-total-warn-mb=")) {
      options.rawTotalWarnBytes = Number.parseInt(flag.slice("--raw-total-warn-mb=".length), 10) * 1024 * 1024;
    } else if (flag === "--raw-largest-warn-mb") {
      options.rawLargestWarnBytes = Number.parseInt(value || "", 10) * 1024 * 1024;
      index += 1;
    } else if (flag.startsWith("--raw-largest-warn-mb=")) {
      options.rawLargestWarnBytes = Number.parseInt(flag.slice("--raw-largest-warn-mb=".length), 10) * 1024 * 1024;
    }
  }

  for (const [key, value] of Object.entries(options)) {
    if (!Number.isFinite(value) || value < 1) delete options[key];
  }

  return { root: gitRoot(maybeRoot), options, apply };
}

async function loadAssetsLib() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(scriptDir, "lib", "assets.mjs"),
    path.resolve(scriptDir, "..", ".codex", "scripts", "lib", "assets.mjs")
  ];
  const lib = candidates.find((file) => fs.existsSync(file));
  if (!lib) {
    throw new Error("Cannot find Dong Skills assets runtime library. Reinstall project ops assets.");
  }
  return import(pathToFileURL(lib).href);
}

const { root, options, apply } = parseArgs(process.argv.slice(2));
const ctx = path.join(root, ".codex-context");
const { assetGovernanceReport } = await loadAssetsLib();
const result = assetGovernanceReport(root, ctx, options, apply);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
