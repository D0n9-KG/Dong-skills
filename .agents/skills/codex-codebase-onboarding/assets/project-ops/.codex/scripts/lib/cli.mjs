import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function hookDir(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl));
}

function findProjectOpsScript(root, scriptName, metaUrl) {
  const base = hookDir(metaUrl);
  const candidates = [
    path.join(root, ".codex", "scripts", scriptName),
    path.resolve(base, "..", "scripts", scriptName),
    path.resolve(base, "..", "..", "scripts", scriptName)
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function runNodeScript(root, scriptName, args, metaUrl) {
  const script = findProjectOpsScript(root, scriptName, metaUrl);
  if (!script) {
    process.stderr.write(`Cannot find ${scriptName}. Reinstall Codex Project Ops Kit.\n`);
    process.exit(1);
  }
  try {
    const out = execFileSync(process.execPath, [script, ...args], {
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

export function runProjectOpsScript(root, scriptName, extraArgs, metaUrl) {
  runNodeScript(root, scriptName, [root, ...extraArgs], metaUrl);
}

export function runInstinctCommand(root, command, extraArgs, metaUrl) {
  runNodeScript(root, "instincts.mjs", [command, root, ...extraArgs], metaUrl);
}
