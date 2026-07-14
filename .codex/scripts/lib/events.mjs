import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readText, shortList, writeJson, writeTextAtomic } from "./core.mjs";
import { gitStatusResult } from "./git.mjs";
import { redactSensitiveText } from "./learning.mjs";
import { writeHookLiveness } from "./runtime.mjs";
import { workflowStatus } from "./workflow.mjs";

const POWERSHELL_READ_ONLY_VERBS = new Set([
  "compare",
  "format",
  "get",
  "group",
  "measure",
  "resolve",
  "select",
  "sort",
  "test",
  "where"
]);

function recordHookLiveness(root, ctx, eventName) {
  try {
    writeHookLiveness(root, ctx, eventName, { minIntervalMs: 60_000 });
  } catch {
    // Liveness is diagnostic evidence and must never make a hook fail.
  }
}

export function sessionStart(input, root, ctx) {
  recordHookLiveness(root, ctx, "SessionStart");
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const lines = [
    "Dong Skills project context:",
    `- Root: ${root}`,
    `- Workflow: phase=${state.phase || "unknown"}; next=${state.next_skill || "unknown"}; decision=${state.decision_required || "none"}`,
    "- Recover from .codex-context/handoff-summary.md, workflow-state.yaml, and current-state.md.",
    "- Load only the next named skill; treat older notes as lower-priority evidence."
  ];
  if (!workflow.ok) lines.push(`- Workflow issues: ${shortList(workflow.issues, 4)}`);
  if (fs.existsSync(path.join(ctx, "raw", "precompact-latest.md"))) {
    lines.push("- A compact snapshot is available at .codex-context/raw/precompact-latest.md; read it only if the core state is insufficient.");
  }
  writeJson({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n")
    }
  });
}

function allowStop(systemMessage = "") {
  writeJson(systemMessage ? { systemMessage } : {});
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function truncateUtf8Bytes(value, maxBytes) {
  const buffer = Buffer.from(String(value || ""), "utf8");
  if (buffer.length <= maxBytes) return buffer.toString("utf8");
  let end = Math.max(0, maxBytes);
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
  return buffer.subarray(0, end).toString("utf8");
}

function clipUtf8Bytes(value, maxBytes) {
  const text = String(value || "");
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  const marker = "\n[truncated]\n";
  return truncateUtf8Bytes(text, maxBytes - Buffer.byteLength(marker, "utf8")) + marker;
}

function toolName(input) {
  return String(input?.tool_name || input?.toolName || input?.tool || input?.name || input?.matcher || "").trim();
}

function normalizedToolName(input) {
  return toolName(input).toLowerCase();
}

function toolInputText(input) {
  const candidates = [
    input?.tool_input,
    input?.toolInput,
    input?.input,
    input?.arguments,
    input?.payload
  ];
  return candidates
    .map((candidate) => typeof candidate === "string" ? candidate : JSON.stringify(candidate || {}))
    .join(" ");
}

function shellCommandText(input) {
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  return typeof payload === "string"
    ? payload.trim()
    : String(payload.command || payload.cmd || payload.script || "").trim();
}

function controlPlaneOperation(input, root) {
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return null;
  const command = shellCommandText(input);
  if (!command) return null;
  if (/\$\(|<\(|>\(/.test(command)) return null;

  const syntax = shellSyntax(command);
  if (syntax.redirections.length > 0) return null;
  if (syntax.segments.length > 1) {
    const operations = syntax.segments.map((segment) =>
      readOnlyShellSegment(segment) ? { kind: "read-only" } : singleControlPlaneOperation(segment, root));
    if (operations.some((operation) => !operation)) {
      return null;
    }
    const activeOperations = operations.filter((operation) => operation.kind !== "read-only");
    if (activeOperations.length === 0) return { kind: "read-only", compound: true };
    const forbidden = activeOperations.find((operation) => operation.kind === "forbidden");
    if (forbidden) return { ...forbidden, compound: true };
    if (activeOperations.length === 1) return { ...activeOperations[0], compound: true };
    if (activeOperations.every((operation) => operation.kind === "recovery")) {
      return { kind: "recovery", compound: true };
    }
    return { kind: "forbidden", command: "compound" };
  }

  return singleControlPlaneOperation(command, root);
}

function singleControlPlaneOperation(command, root) {
  if (!command || /[;&|`\r\n]/.test(command)) return null;

  const match = command.match(/^\s*node(?:\.exe)?\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+(.*))?\s*$/i);
  if (!match) return null;
  const script = String(match[1] || match[2] || match[3] || "");
  const absoluteScript = path.isAbsolute(script) ? path.resolve(script) : path.resolve(root, script);
  const allowedScripts = new Set([
    path.resolve(root, ".codex", "hooks", "project-ops.mjs"),
    path.resolve(root, ".codex", "scripts", "context-recovery-eval.mjs"),
    path.resolve(root, ".codex", "scripts", "asset-governance.mjs"),
    path.resolve(root, ".codex", "scripts", "project-ops-health.mjs"),
    path.resolve(root, ".codex", "scripts", "workflow-state.mjs"),
    path.resolve(root, "scripts", "context-recovery-eval.mjs"),
    path.resolve(root, "scripts", "asset-governance.mjs"),
    path.resolve(root, "scripts", "project-ops-health.mjs"),
    path.resolve(root, "scripts", "workflow-state.mjs")
  ]);
  if (!allowedScripts.has(absoluteScript)) return null;
  const basename = path.basename(absoluteScript).toLowerCase();
  const args = String(match[4] || "").trim();

  if (basename === "project-ops.mjs") {
    if (/^context-recovery-eval(?:\s|$)/i.test(args)) return { kind: "recovery" };
    if (/^health-check(?:\s|$)/i.test(args)) return { kind: "read-only" };
    const assetGovernance = args.match(/^asset-governance(?:\s+(.*))?$/i);
    if (assetGovernance) return assetGovernanceOperation(String(assetGovernance[1] || ""));
    const workflow = args.match(/^workflow-state(?:\s+(.*))?$/i);
    if (!workflow) return null;
    return workflowStateOperation(String(workflow[1] || ""));
  }
  if (basename === "context-recovery-eval.mjs") return { kind: "recovery" };
  if (basename === "asset-governance.mjs") return assetGovernanceOperation(args);
  if (basename === "project-ops-health.mjs") return { kind: "read-only" };
  if (basename === "workflow-state.mjs") return workflowStateOperation(args);
  return null;
}

function assetGovernanceOperation(args) {
  const tokens = String(args || "").trim().split(/\s+/).filter(Boolean);
  return { kind: tokens.includes("--apply") ? "repair" : "read-only", command: "asset-governance" };
}

function workflowStateOperation(args) {
  const tokens = String(args || "").trim().split(/\s+/).filter(Boolean);
  const command = String(tokens[0] || "help").toLowerCase();
  if (["status", "get", "check", "next", "recover", "help", "--help", "-h"].includes(command)) {
    return { kind: "read-only", command };
  }
  if (command === "hash") {
    return { kind: tokens.includes("--write") ? "repair" : "read-only", command };
  }
  if (command === "transition") {
    return { kind: "transition", command, event: String(tokens[1] || "") };
  }
  if (command === "decision") {
    return { kind: "decision", command, event: String(tokens[1] || "") };
  }
  if (["init", "migrate"].includes(command)) return { kind: "repair", command };
  return { kind: "forbidden", command };
}

function explicitToolTargets(input) {
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  const targets = [];
  const patchTexts = [];

  if (typeof payload === "string") {
    patchTexts.push(payload);
  } else if (payload && typeof payload === "object") {
    for (const key of [
      "file_path",
      "filePath",
      "path",
      "target",
      "target_path",
      "targetPath",
      "destination",
      "destination_path",
      "destinationPath"
    ]) {
      if (typeof payload[key] === "string") targets.push(payload[key]);
    }
    for (const key of ["patch", "command", "input"]) {
      if (typeof payload[key] === "string" && payload[key].includes("***")) {
        patchTexts.push(payload[key]);
      }
    }
  }

  for (const text of patchTexts) {
    for (const match of text.matchAll(/^\*\*\*\s+(?:(?:Add|Update|Delete)\s+File|Move to):\s*(.+?)\s*$/gmi)) {
      targets.push(match[1]);
    }
  }
  return unique(targets.map((target) => String(target).trim()).filter(Boolean));
}

function explicitToolWorkdir(input) {
  const direct = String(
    input?.workdir || input?.working_directory || input?.workingDirectory || ""
  ).trim();
  if (direct) return direct;
  const payload = input?.tool_input || input?.toolInput || input?.input || input?.arguments || input?.payload || {};
  if (!payload || typeof payload !== "object") return "";
  return String(payload.workdir || payload.cwd || payload.working_directory || payload.workingDirectory || "").trim();
}

function resolvedToolWorkdir(input, root) {
  const requested = explicitToolWorkdir(input);
  if (!requested) return root;
  return path.isAbsolute(requested) ? path.resolve(requested) : path.resolve(root, requested);
}

function pathOutsideProject(target, root, base = root) {
  const cleaned = String(target || "").replace(/^["']|["']$/g, "");
  if (!cleaned) return false;
  const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(base, cleaned);
  const realRoot = realPathWithMissingTail(root);
  const realTarget = realPathWithMissingTail(absolute);
  const relative = path.relative(realRoot, realTarget).replace(/\\/g, "/");
  if (!relative || (!relative.startsWith("../") && !path.isAbsolute(relative))) return false;
  const rootFromTarget = path.relative(realTarget, realRoot).replace(/\\/g, "/");
  return Boolean(rootFromTarget && (rootFromTarget.startsWith("../") || path.isAbsolute(rootFromTarget)));
}

function realPathWithMissingTail(target) {
  let cursor = path.resolve(target);
  const tail = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) return path.resolve(target);
    tail.unshift(path.basename(cursor));
    cursor = parent;
  }
  try {
    return path.join(fs.realpathSync.native(cursor), ...tail);
  } catch {
    return path.resolve(target);
  }
}

function repositoryLocalGitOperation(command) {
  const syntax = semanticShellSyntax(command);
  if (!syntax.segments.length || syntax.redirections.length > 0) return false;
  const allowed = new Set([
    "add",
    "apply",
    "branch",
    "checkout",
    "cherry-pick",
    "clean",
    "commit",
    "diff",
    "log",
    "ls-files",
    "merge",
    "pull",
    "push",
    "rebase",
    "remote",
    "reset",
    "restore",
    "rev-parse",
    "show",
    "stash",
    "status",
    "switch",
    "tag"
  ]);
  return syntax.segments.every((segment) => {
    if (/\$\(|<\(|>\(|[{}]|`|(?:^|\s)&(?:\s|$)/.test(segment)) return false;
    if (/(?:^|\s)(?:-C|--git-dir(?:=|\s)|--work-tree(?:=|\s))/i.test(segment)) return false;
    const match = segment.match(/^\s*git(?:\.exe)?\s+([A-Za-z][A-Za-z-]*)(?:\s|$)/i);
    return Boolean(match && allowed.has(match[1].toLowerCase()));
  });
}

function verifiedExternalGitOperation(command, root, base = root) {
  const syntax = semanticShellSyntax(command);
  if (!syntax.segments.length || syntax.redirections.length > 0) return false;
  return syntax.segments.every((segment) => {
    if (/\$\(|<\(|>\(|[{}]|`|(?:^|\s)&(?:\s|$)/.test(segment)) return false;
    const tokens = shellLiteralTokens(segment);
    const subcommandIndex = gitSubcommandIndex(tokens);
    if (subcommandIndex < 0) return false;
    const routing = gitRoutingPaths(tokens, subcommandIndex, base);
    const explicitPaths = [routing.cwd, routing.workTree, routing.gitDir].filter(Boolean);
    if (explicitPaths.length === 0 || explicitPaths.some((target) => !pathOutsideProject(target, root))) {
      return false;
    }
    if (!routing.hadC && !(routing.workTree && routing.gitDir)) return false;
    try {
      const repositoryRoot = execFileSync("git", [
        ...tokens.slice(1, subcommandIndex),
        "rev-parse",
        "--show-toplevel"
      ], {
        cwd: base,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
      const realRepositoryRoot = fs.realpathSync.native(repositoryRoot);
      return pathOutsideProject(realRepositoryRoot, root);
    } catch {
      return false;
    }
  });
}

function toolExplicitlyOutsideProject(input, root) {
  const name = normalizedToolName(input);
  const targets = explicitToolTargets(input);
  const targetBase = resolvedToolWorkdir(input, root);
  if (targets.length > 0 && targets.every((target) => pathOutsideProject(target, root, targetBase))) {
    return true;
  }
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return false;
  const commandText = shellCommandText(input);
  const workdir = resolvedToolWorkdir(input, root);
  if (verifiedExternalGitOperation(commandText, root, workdir)) return true;
  const outsideWorkdir = pathOutsideProject(workdir, root);
  if (outsideWorkdir && repositoryLocalGitOperation(commandText)) return true;
  const mutation = shellFileMutation(input);
  if (mutation.mutates) {
    if (mutation.opaque || mutation.targets.length === 0) return false;
    return mutation.targets.every((target) => pathOutsideProject(target, root, workdir));
  }
  if (!outsideWorkdir) return false;
  if (["read-only", "verification"].includes(shellCommandClass(input))) return true;
  const externalControl = controlPlaneOperation(input, path.resolve(workdir));
  return Boolean(externalControl && externalControl.kind !== "forbidden");
}

function shellLiteralTokens(segment) {
  const tokens = [];
  let current = "";
  let quote = "";
  const text = String(segment || "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) {
        quote = "";
      } else if (char === "`" && quote === '"' && index + 1 < text.length) {
        current += text[index + 1];
        index += 1;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (quote) return [];
  if (current) tokens.push(current);
  return tokens;
}

function gitSubcommandIndex(tokens) {
  if (!/^(?:git|git\.exe)$/i.test(tokens[0] || "")) return -1;
  const optionsWithValues = new Set([
    "-c",
    "-C",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--config-env"
  ]);
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (optionsWithValues.has(token)) {
      index += 1;
      continue;
    }
    if (/^--(?:git-dir|work-tree|namespace|super-prefix|config-env)=/.test(token)) continue;
    if (token.startsWith("-")) continue;
    return index;
  }
  return -1;
}

function gitRoutingPaths(tokens, subcommandIndex, base) {
  let cwd = path.resolve(base);
  let hadC = false;
  let workTree = "";
  let gitDir = "";
  for (let index = 1; index < subcommandIndex; index += 1) {
    const token = tokens[index];
    const attached = token.match(/^(--(?:work-tree|git-dir))=(.+)$/i);
    if (attached) {
      const resolved = path.resolve(cwd, attached[2]);
      if (attached[1].toLowerCase() === "--work-tree") workTree = resolved;
      else gitDir = resolved;
      continue;
    }
    if (token === "-C" && index + 1 < subcommandIndex) {
      cwd = path.resolve(cwd, tokens[index + 1]);
      hadC = true;
      index += 1;
      continue;
    }
    if (/^--(?:work-tree|git-dir)$/i.test(token) && index + 1 < subcommandIndex) {
      const resolved = path.resolve(cwd, tokens[index + 1]);
      if (token.toLowerCase() === "--work-tree") workTree = resolved;
      else gitDir = resolved;
      index += 1;
    }
  }
  return { cwd: hadC ? cwd : "", hadC, workTree, gitDir };
}

const GIT_MUTATING_SUBCOMMANDS = new Set([
  "add",
  "apply",
  "checkout",
  "cherry-pick",
  "clean",
  "commit",
  "merge",
  "pull",
  "push",
  "rebase",
  "reset",
  "restore",
  "stash",
  "switch",
  "tag"
]);

function shellPathArguments(segment) {
  const tokens = shellLiteralTokens(segment);
  if (tokens.length === 0) return [];
  const command = String(tokens[0] || "").toLowerCase();
  const pathOptions = new Set([
    "-literalpath",
    "-path",
    "-filepath",
    "-destination",
    "-destinationpath",
    "-target",
    "-targetpath",
    "-newname",
    "--target-directory"
  ]);
  const optionValues = [];
  const positionals = [];
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const attached = token.match(/^(-{1,2}[A-Za-z][A-Za-z-]*)(?::|=)(.+)$/);
    if (attached && pathOptions.has(attached[1].toLowerCase())) {
      optionValues.push({ option: attached[1].toLowerCase(), value: attached[2] });
      continue;
    }
    if (pathOptions.has(token.toLowerCase()) && index + 1 < tokens.length) {
      optionValues.push({ option: token.toLowerCase(), value: tokens[index + 1] });
      index += 1;
      continue;
    }
    if (!token.startsWith("-") && !/^\/[A-Za-z]+$/.test(token)) positionals.push(token);
  }

  const gitIndex = gitSubcommandIndex(tokens);
  if (gitIndex > 0) {
    if (/^(?:apply|checkout|restore|switch)$/i.test(tokens[gitIndex])) {
      const separator = tokens.indexOf("--", gitIndex + 1);
      if (separator >= 0) return tokens.slice(separator + 1).filter(Boolean);
      if (/^(?:checkout|restore)$/i.test(tokens[gitIndex])) {
        return tokens.slice(gitIndex + 1).filter((token) => token && !token.startsWith("-"));
      }
    }
    return [];
  }

  const copies = new Set(["copy-item", "cpi", "copy", "cp"]);
  if (copies.has(command)) {
    const destinations = optionValues
      .filter(({ option }) => ["-destination", "-destinationpath", "-target", "-targetpath", "--target-directory"].includes(option))
      .map(({ value }) => value);
    if (destinations.length > 0) return unique(destinations);
    const hasSourceOption = optionValues.some(({ option }) =>
      ["-literalpath", "-path", "-filepath"].includes(option)
    );
    return positionals.length >= 2 || (hasSourceOption && positionals.length >= 1)
      ? [positionals[positionals.length - 1]]
      : [];
  }

  const moves = new Set(["move-item", "mi", "move", "mv"]);
  if (moves.has(command)) {
    return unique([...optionValues.map(({ value }) => value), ...positionals]);
  }

  const renames = new Set(["rename-item", "rni", "ren", "rename"]);
  if (renames.has(command)) {
    const sources = optionValues
      .filter(({ option }) => ["-literalpath", "-path", "-filepath", "-target", "-targetpath"].includes(option))
      .map(({ value }) => value);
    if (sources.length === 0 && positionals[0]) sources.push(positionals[0]);
    const namedDestination = optionValues.find(({ option }) =>
      ["-newname", "-destination", "-destinationpath"].includes(option)
    )?.value;
    const destination = namedDestination || (
      positionals.length >= 2 || (sources.length > 0 && positionals.length >= 1)
        ? positionals[positionals.length - 1]
        : ""
    );
    const resolvedDestinations = destination
      ? sources.map((source) => path.isAbsolute(destination)
        ? destination
        : path.join(path.dirname(source), destination))
      : [];
    return unique([...sources, ...resolvedDestinations]);
  }

  const optionTargets = optionValues.map(({ value }) => value);
  if (optionTargets.length > 0) return unique(optionTargets);
  return positionals[0] ? [positionals[0]] : [];
}

function gitWorktreeMutationSegment(segment) {
  const tokens = shellLiteralTokens(segment);
  const index = gitSubcommandIndex(tokens);
  return index > 0 && GIT_MUTATING_SUBCOMMANDS.has(String(tokens[index]).toLowerCase());
}

function mutatingShellSegment(segment) {
  const text = String(segment || "");
  return /^(?:set-content|add-content|clear-content|out-file|remove-item|move-item|copy-item|rename-item|new-item|sc|ac|clc|ni|ri|mi|cpi|rni)\b/i.test(text) ||
    /^\[System\.IO\.(?:File|Directory)\]::(?:WriteAllText|WriteAllBytes|AppendAllText|Create|Delete|Move|Copy|CreateDirectory|Delete)\b/i.test(text) ||
    /^(?:rm|del|erase|move|copy|ren|rename|mv|cp|touch|mkdir|rmdir|tee|truncate)\b/i.test(text) ||
    /^sed\s+-i\b/i.test(text) ||
    gitWorktreeMutationSegment(text) ||
    /^node(?:\.exe)?\s+(?:--eval|-e)\b[\s\S]*\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|copyFile(?:Sync)?|rename(?:Sync)?|unlink(?:Sync)?|rmSync|mkdirSync|rmdirSync)\s*\(/i.test(text) ||
    /^python(?:\.exe)?\s+-c\b[\s\S]*(?:\bopen\s*\([^)]*["'][wa+]|write_(?:text|bytes)\s*\(|unlink\s*\(|rename\s*\(|mkdir\s*\(|rmdir\s*\(|shutil\.(?:copy|copyfile|copytree|move|rmtree))/i.test(text);
}

function embeddedMutatingShellExpression(command) {
  return /(?:\$\(|\{|(?:^|\s)&\s*)\s*(?:set-content|add-content|clear-content|out-file|remove-item|move-item|copy-item|rename-item|new-item|sc|ac|clc|ni|ri|mi|cpi|rni|rm|move|copy|ren|rename|mv|cp|touch|mkdir|rmdir|tee|truncate)\b/i
    .test(String(command || ""));
}

function gitMutationSegment(segment) {
  return gitWorktreeMutationSegment(segment);
}

function shellFileMutation(input) {
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    return { mutates: false, targets: [], opaque: false };
  }
  const command = shellCommandText(input);
  const syntax = semanticShellSyntax(command);
  const mutatingSegments = syntax.segments.filter((segment) => mutatingShellSegment(segment));
  const embeddedMutation = embeddedMutatingShellExpression(command);
  if (mutatingSegments.length === 0 && syntax.redirections.length === 0 && !embeddedMutation) {
    return { mutates: false, targets: [], opaque: false };
  }

  const targets = [];
  for (const segment of mutatingSegments) targets.push(...shellPathArguments(segment));
  targets.push(...syntax.redirections);
  return {
    mutates: true,
    targets: unique(targets.map((target) => String(target || "").trim()).filter(Boolean)),
    opaque: targets.length === 0
  };
}

function projectRelativeTarget(target, root, base = root) {
  const cleaned = String(target || "").replace(/^["']|["']$/g, "");
  const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(base, cleaned);
  const relative = path.relative(
    realPathWithMissingTail(root),
    realPathWithMissingTail(absolute)
  ).replace(/\\/g, "/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) return "";
  return relative;
}

function governanceArtifactPath(relative) {
  const normalized = String(relative || "").toLowerCase();
  if (normalized === ".codex-context/raw" ||
      normalized.startsWith(".codex-context/raw/")) {
    return false;
  }
  return normalized.startsWith(".codex-context/") ||
    normalized === "strategy.md" ||
    normalized.startsWith("docs/codex/plans/") ||
    normalized.startsWith("docs/codex/specs/") ||
    normalized.startsWith("docs/codex/wayfinder/");
}

function governanceRepairMutation(input, root) {
  const name = normalizedToolName(input);
  const base = resolvedToolWorkdir(input, root);
  if (/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    const shellMutation = shellFileMutation(input);
    return shellMutation.mutates &&
      !shellMutation.opaque &&
      shellMutation.targets.length > 0 &&
      shellMutation.targets.every((target) => governanceArtifactPath(projectRelativeTarget(target, root, base)));
  }
  if (!/apply_patch/.test(name) && !explicitWriteToolName(name)) {
    return false;
  }
  const targets = explicitToolTargets(input);
  if (targets.length === 0) return false;
  return targets.every((target) => governanceArtifactPath(projectRelativeTarget(target, root, base)));
}

function globMatchesPath(pattern, candidate) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") index += 1;
      source += ".*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`, "i").test(candidate);
}

function mutationTargetCoversWorkflowState(target, root, base) {
  const cleaned = String(target || "").replace(/^["']|["']$/g, "");
  if (!cleaned) return false;
  const realRoot = realPathWithMissingTail(root);
  const absolute = path.isAbsolute(cleaned) ? path.resolve(cleaned) : path.resolve(base, cleaned);
  if (/[*?]/.test(cleaned)) {
    const relativePattern = path.relative(realRoot, absolute).replace(/\\/g, "/");
    if (relativePattern.startsWith("../") || path.isAbsolute(relativePattern)) return false;
    return globMatchesPath(relativePattern, ".codex-context") ||
      globMatchesPath(relativePattern, ".codex-context/workflow-state.yaml");
  }
  const realTarget = realPathWithMissingTail(absolute);
  const workflowState = realPathWithMissingTail(
    path.join(realRoot, ".codex-context", "workflow-state.yaml")
  );
  const relative = path.relative(realTarget, workflowState).replace(/\\/g, "/");
  return !relative || (!relative.startsWith("../") && !path.isAbsolute(relative));
}

function protectedWorkflowStateMutation(input, root) {
  const base = resolvedToolWorkdir(input, root);
  const targets = explicitToolTargets(input);
  if (targets.some((target) => mutationTargetCoversWorkflowState(target, root, base))) {
    return true;
  }
  const name = normalizedToolName(input);
  if (!/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) return false;
  const shellMutation = shellFileMutation(input);
  if (shellMutation.targets.some((target) => mutationTargetCoversWorkflowState(target, root, base))) {
    return true;
  }
  if (!shellMutation.opaque) return false;
  return shellSyntax(shellCommandText(input)).segments
    .filter((segment) => mutatingShellSegment(segment))
    .some((segment) =>
      /(?:^|[\s"'`(])\.codex-context[\\/]workflow-state\.yaml(?:[\s"',)`]|$)/i.test(segment));
}

function shellSyntax(command) {
  const text = String(command || "");
  const segments = [];
  const redirections = [];
  let start = 0;
  let quote = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if ((char === "\\" || char === "`") && quote === '"') {
        index += 1;
      } else if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") index += 1;
        else quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      const tail = text.slice(index + (text[index + 1] === ">" ? 2 : 1));
      const target = tail.match(/^\s*(?:"([^"]+)"|'([^']+)'|([^\s;|]+))/);
      if (target) {
        const destination = target[1] || target[2] || target[3];
        if (!/^(?:\$null|nul|\/dev\/null|&[012])$/i.test(destination)) {
          redirections.push(destination);
        }
      }
      continue;
    }
    const paired = (char === "&" && text[index + 1] === "&") ||
      (char === "|" && text[index + 1] === "|");
    if (char === ";" || char === "|" || char === "\r" || char === "\n" || paired) {
      segments.push(text.slice(start, index).trim());
      if (paired) index += 1;
      start = index + 1;
    }
  }
  segments.push(text.slice(start).trim());
  return {
    segments: segments.filter(Boolean),
    redirections: unique(redirections.filter(Boolean))
  };
}

function shellSegments(command) {
  return semanticShellSyntax(command).segments;
}

function literalWrappedCommand(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.length >= 2 &&
      ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
       (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function decodedPowerShellCommand(text) {
  const tokens = shellLiteralTokens(text);
  if (!/^(?:powershell|pwsh)(?:\.exe)?$/i.test(tokens[0] || "")) return "";
  const optionIndex = tokens.findIndex((token, index) =>
    index > 0 && /^(?:-encodedcommand|-enc|-e)$/i.test(token)
  );
  if (optionIndex < 0 || optionIndex + 1 >= tokens.length) return "";
  const encoded = tokens[optionIndex + 1];
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return "";
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length % 2 !== 0) return "";
  return bytes.toString("utf16le").trim();
}

function wrappedShellCommand(segment) {
  const text = String(segment || "").trim();
  const cmd = text.match(/^cmd(?:\.exe)?\b[\s\S]*?(?:^|\s)\/(?:c|k)\s+([\s\S]+)$/i);
  if (cmd) return literalWrappedCommand(cmd[1]);
  const encodedPowerShell = decodedPowerShellCommand(text);
  if (encodedPowerShell) return encodedPowerShell;
  const powershell = text.match(/^(?:powershell|pwsh)(?:\.exe)?\b[\s\S]*?(?:^|\s)-(?:command|c)\s+([\s\S]+)$/i);
  if (powershell) return literalWrappedCommand(powershell[1]);
  const posix = text.match(/^(?:sh|bash|zsh)(?:\.exe)?\b[\s\S]*?(?:^|\s)-(?:c|lc)\s+([\s\S]+)$/i);
  if (posix) return literalWrappedCommand(posix[1]);
  return "";
}

function semanticShellSyntax(command, depth = 0) {
  const syntax = shellSyntax(command);
  if (depth >= 3) return syntax;
  const segments = [];
  const redirections = [...syntax.redirections];
  for (const segment of syntax.segments) {
    const inner = wrappedShellCommand(segment);
    if (!inner) {
      segments.push(segment);
      continue;
    }
    const nested = semanticShellSyntax(inner, depth + 1);
    segments.push(...nested.segments);
    redirections.push(...nested.redirections);
  }
  return { segments, redirections: unique(redirections) };
}

function skipPowerShellWhitespace(text, index) {
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

function readPowerShellQuotedLiteral(text, index) {
  const quote = text[index];
  let cursor = index + 1;
  while (cursor < text.length) {
    const char = text[cursor];
    if (quote === "'" && char === "'" && text[cursor + 1] === "'") {
      cursor += 2;
      continue;
    }
    if (quote === '"' && char === "`") {
      cursor += 2;
      continue;
    }
    if (quote === '"' && char === "$") return -1;
    if (char === quote) return cursor + 1;
    cursor += 1;
  }
  return -1;
}

function readPowerShellLiteralToken(text, index) {
  const start = skipPowerShellWhitespace(text, index);
  if (start >= text.length) return -1;
  if (text[start] === "'" || text[start] === '"') {
    return readPowerShellQuotedLiteral(text, start);
  }
  const tail = text.slice(start);
  const constant = tail.match(/^\$(?:true|false|null)\b/i);
  if (constant) return start + constant[0].length;
  const number = tail.match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)\b/);
  if (number) return start + number[0].length;
  return -1;
}

function powerShellLiteralList(text) {
  let value = String(text || "").trim();
  if (!value) return false;
  if (value.startsWith("@(")) {
    if (!value.endsWith(")")) return false;
    value = value.slice(2, -1);
  }
  let cursor = skipPowerShellWhitespace(value, 0);
  if (cursor === value.length) return true;
  while (cursor < value.length) {
    const end = readPowerShellLiteralToken(value, cursor);
    if (end < 0) return false;
    cursor = skipPowerShellWhitespace(value, end);
    if (cursor === value.length) return true;
    if (value[cursor] !== ",") return false;
    cursor = skipPowerShellWhitespace(value, cursor + 1);
    if (cursor === value.length) return false;
  }
  return true;
}

function readOnlyPowerShellLiteralAssignment(segment) {
  const match = String(segment || "").match(/^\s*\$[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]+?)\s*$/);
  return Boolean(match && powerShellLiteralList(match[1]));
}

function readOnlyPowerShellCommand(segment) {
  const match = String(segment || "").match(/^\s*([A-Za-z]+)-[A-Za-z][A-Za-z0-9-]*(?:\s|$)/);
  return Boolean(match && POWERSHELL_READ_ONLY_VERBS.has(match[1].toLowerCase()));
}

function readOnlyShellSegment(segment) {
  if (readOnlyPowerShellLiteralAssignment(segment)) return true;
  if (/\$\(|<\(|>\(|[{}]|(?:^|\s)&(?:\s|$)/.test(segment)) return false;
  if (/^git\s+remote\s*$/i.test(segment) ||
      /^git\s+remote\s+(?:-v|--verbose|show|get-url)(?:\s|$)/i.test(segment)) {
    return true;
  }
  if (readOnlyPowerShellCommand(segment)) return true;
  return /^(?:git\s+(?:status|diff|log|show|rev-parse|ls-files)|git\s+branch\s+(?:--show-current|--list|-l)|git\s+worktree\s+list|rg|grep|findstr|select-string|get-content|get-childitem|get-filehash|select-object|sort-object|measure-object|format-table|format-list|out-string|cat|type|ls|dir|tree|head|tail|wc)(?:\s|$)/i.test(segment);
}

function verificationShellSegment(segment) {
  return /^(?:node(?:\.exe)?\s+(?:--test|--check|(?:\.?[\\/])?scripts[\\/](?:run-domain-tests|release-check)\.mjs)|npm(?:\.cmd)?\s+(?:test|run\s+(?:test|lint|typecheck|check|build|format:check|format-check))|npx(?:\.cmd)?\s+(?:eslint|tsc|prettier\s+--check)|pnpm\s+(?:test|lint|typecheck|check|build)|yarn\s+(?:test|lint|typecheck|check|build)|pytest|python(?:\.exe)?\s+-m\s+pytest|go\s+test|cargo\s+(?:test|check|clippy|build)|dotnet\s+(?:test|build)|mvn\s+(?:test|verify)|gradle\s+(?:test|check|build)|\.\/gradlew\s+(?:test|check|build))(?:\s|$)/i.test(segment);
}

function shellCommandClass(input) {
  const command = shellCommandText(input);
  if (!command || shellFileMutation(input).mutates) return "";
  const segments = shellSegments(command);
  if (!segments.length) return "";
  if (segments.every((segment) => readOnlyShellSegment(segment))) return "read-only";
  if (segments.every((segment) => readOnlyShellSegment(segment) || verificationShellSegment(segment)) &&
      segments.some((segment) => verificationShellSegment(segment))) {
    return "verification";
  }
  return "";
}

function explicitWriteToolName(name) {
  return /(^|[._:])(?:add|append|apply|clear|commit|copy|create|dispatch|edit|insert|install|invoke|merge|move|patch|publish|push|rename|replace|save|send|set|submit|trigger|update|upload|upsert|write)(?:$|[._:])/i.test(name) ||
    /(^|[._:])(?:add|append|copy|create|edit|move|patch|rename|replace|save|update|upload|write)(?:file|files|document|documents|path|paths|record|records|resource|resources)(?:$|[._:])/i.test(name);
}

function explicitDestructiveToolName(name) {
  return /(^|[._:])(?:delete|remove|reset|drop|truncate|destroy|purge|prune)(?:$|[._:])/i.test(name) ||
    /(^|[._:])(?:delete|remove|truncate|destroy|purge)(?:file|files|document|documents|path|paths|record|records|resource|resources)(?:$|[._:])/i.test(name);
}

function toolControlClass(input, root = "") {
  const name = normalizedToolName(input);
  if (!name) return "unknown";
  const controlPlane = root ? controlPlaneOperation(input, root) : null;
  if (controlPlane?.kind === "transition") return "workflow-transition";
  if (controlPlane?.kind === "decision") return "workflow-decision";
  if (controlPlane?.kind === "forbidden") return "workflow-admin";
  if (controlPlane) return "control-plane";

  if (/shell|bash|powershell|cmd|exec_command|shell_command/.test(name)) {
    const command = shellCommandText(input);
    if (embeddedMutatingShellExpression(command)) {
      return "destructive";
    }
    if (shellSegments(command).some((segment) =>
      /^(?:rm|remove-item|ri|del|erase|rmdir|drop|truncate)\b|^git\s+(?:reset|clean)\b/i.test(segment))) {
      return "destructive";
    }
    const shellClass = shellCommandClass(input);
    if (shellClass) return shellClass;
    if (shellFileMutation(input).mutates ||
        shellSegments(command).some((segment) => gitMutationSegment(segment)) ||
        /\bgit\s+worktree\s+(?:add|remove|move|prune|lock|unlock)\b/i.test(command) ||
        /\bgit\s+branch\s+(?:-[dDmM]|--delete|--move|--copy|--edit-description)\b/i.test(command) ||
        /\b(?:npm|pnpm|yarn)\s+(?:install|add|remove|publish)\b/i.test(command)) {
      return "mutating";
    }
    return "opaque";
  }

  if (explicitDestructiveToolName(name)) {
    return "destructive";
  }
  if (/apply_patch/.test(name) || explicitWriteToolName(name)) {
    return "mutating";
  }
  if (/^(?:mcp__|ext__)/.test(name) &&
      /(^|__|_)(?:execute|restart|run|start|stop)(?:_|$)/.test(name)) {
    return "mutating";
  }
  if (/(^|[._:])(?:describe|fetch|find|get|glob|grep|inspect|list|lookup|open|query|read|resolve|search|show|status|view)(?:$|[._:])/.test(name)) {
    return "read-only";
  }
  if (/^(?:mcp__|ext__)/.test(name)) return "external";
  return "unknown";
}

function denyPreToolUse(reason) {
  writeJson({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  });
}

export function preToolUse(input, root, ctx) {
  recordHookLiveness(root, ctx, "PreToolUse");
  if (toolExplicitlyOutsideProject(input, root)) return;
  const controlClass = toolControlClass(input, root);
  if (["mutating", "destructive"].includes(controlClass) &&
      protectedWorkflowStateMutation(input, root)) {
    denyPreToolUse("Direct edits to .codex-context/workflow-state.yaml are not allowed. Use a validated workflow-state transition.");
    return;
  }
  if (controlClass === "workflow-admin") {
    denyPreToolUse("Arbitrary workflow-state mutation is not allowed. Use a validated workflow-state transition.");
    return;
  }
  if (["workflow-decision", "workflow-transition", "control-plane", "verification", "external", "unknown", "opaque", "read-only"].includes(controlClass)) return;
  if (!["mutating", "destructive"].includes(controlClass)) return;
  if (governanceRepairMutation(input, root)) return;

  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  if (!workflow.ok) {
    denyPreToolUse(`Workflow state is not valid: ${workflow.issues.join("; ")}`);
    return;
  }
  if (state.phase === "complete") {
    denyPreToolUse("The previous workflow is complete. Start a new task before modifying the project.");
    return;
  }
  if (state.decision_required && state.decision_required !== "none") {
    denyPreToolUse(`A user decision is still required: ${state.decision_required}.`);
    return;
  }
  if (["discovery", "wayfinding", "brainstorming", "spec", "planning"].includes(state.phase)) {
    const laneLabel = `Lane ${String(state.work_lane || "lane-1").slice(-1)}`;
    denyPreToolUse(`${laneLabel} project modifications require the execution phase and explicit execution approval.`);
    return;
  }
  if (["execution", "debugging", "verification", "review", "delivery", "handoff"].includes(state.phase) &&
      !["approved", "skipped", "mechanical-exception"].includes(state.spec_status)) {
    denyPreToolUse(`The ${state.phase} phase requires approved scope before modification.`);
    return;
  }
  if (["execution", "debugging", "verification", "review", "delivery", "handoff"].includes(state.phase) &&
      !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(state.execution_approval)) {
    denyPreToolUse(`The ${state.phase} phase requires explicit execution approval before modification.`);
    return;
  }
  if (state.work_lane === "lane-3" &&
      !["approved-traditional", "approved-goal", "plan-then-execute-traditional"].includes(state.execution_approval)) {
    denyPreToolUse("Lane 3 modifications require explicit execution approval.");
    return;
  }

}

function compactTrigger(input) {
  const candidates = [
    input?.trigger,
    input?.compaction_trigger,
    input?.compactionTrigger,
    input?.compact_trigger,
    input?.compactTrigger,
    input?.matcher,
    input?.source,
    input?.reason,
    input?.event?.trigger,
    input?.event?.compaction_trigger,
    input?.event?.compactionTrigger
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || "").toLowerCase();
    if (normalized === "manual" || normalized.includes("manual")) return "manual";
    if (normalized === "auto" || normalized.includes("automatic")) return "auto";
  }

  return "auto";
}

export function preCompact(input, root, ctx) {
  recordHookLiveness(root, ctx, "PreCompact");
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const sections = [
    ["handoff-summary.md", 32 * 1024],
    ["workflow-state.yaml", 8 * 1024],
    ["current-state.md", 12 * 1024],
    ["working-notes.md", 8 * 1024]
  ];
  const body = sections.map(([name, limit]) => {
    const text = readText(path.join(ctx, name));
    const clipped = clipUtf8Bytes(text, limit);
    return `## ${name}\n\n${clipped.trim() || "[empty]"}`;
  }).join("\n\n");
  const snapshot = truncateUtf8Bytes(
    redactSensitiveText(`# PreCompact Latest\n\n- Created: ${new Date().toISOString()}\n- Trigger: ${compactTrigger(input)}\n- Root: ${root}\n- Phase: ${state.phase || "unknown"}\n- Next skill: ${state.next_skill || "unknown"}\n\n${body}\n`),
    64 * 1024
  );
  try {
    const rawDir = path.join(ctx, "raw");
    fs.mkdirSync(rawDir, { recursive: true });
    writeTextAtomic(path.join(rawDir, "precompact-latest.md"), snapshot);
    writeJson({ continue: true });
  } catch (error) {
    const code = String(error?.code || "write-error");
    writeJson({
      continue: true,
      systemMessage: `Dong Skills advisory: compact snapshot was not written (${code}); the existing handoff was left unchanged.`
    });
  }
}

export function stop(input, root, ctx) {
  recordHookLiveness(root, ctx, "Stop");
  const statusResult = gitStatusResult(root);
  const workflow = workflowStatus(root, ctx);
  const state = workflow.state || {};
  const issues = [];
  issues.push(...workflow.issues);
  if (!statusResult.ok) issues.push(`Git status unavailable: ${statusResult.error || "unknown error"}`);
  const changed = statusResult.ok ? statusResult.files : [];
  if (changed.length && ["verification", "review", "delivery", "handoff", "complete"].includes(state.phase)) {
    issues.push(`${changed.length} uncommitted file(s); verify and checkpoint before claiming completion`);
  }
  allowStop(issues.length ? `Dong Skills advisory: ${shortList(issues, 6)}.` : "");
}
