#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SCENARIO_SCHEMA = "dong-skills.forward-eval.v1";
const REQUEST_SCHEMA = "dong-skills.forward-eval.request.v1";
const DEFAULT_TIMEOUT_MS = 120_000;

function usage() {
  return [
    "Usage:",
    "  node scripts/skill-forward-eval.mjs <scenario.json> --backend <executable> [--backend-arg <arg> ...]",
    "  node scripts/skill-forward-eval.mjs <scenario.json> --read-output-dir <dir>",
    "",
    "Options:",
    "  --root <path>             Project root containing .agents/skills.",
    "  --output-dir <path>       Directory for per-case output files and summary.json.",
    "  --read-output-dir <path>  Judge existing <case-id>.txt files without invoking a backend.",
    "  --backend <executable>    External evaluator command. Scenario expectations are not sent to it.",
    "  --backend-arg <arg>       Repeatable backend argument.",
    `  --timeout-ms <number>     Per-case backend timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS}).`,
    "  --json                    Print the result summary as JSON."
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    backendArgs: [],
    root: process.cwd(),
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    rootExplicit: false
  };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (["--backend", "--backend-arg", "--root", "--output-dir", "--read-output-dir", "--timeout-ms"].includes(arg)) {
      const value = argv[i + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      i += 1;
      if (arg === "--backend-arg") {
        options.backendArgs.push(value);
      } else {
        const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        options[key] = value;
        if (arg === "--root") options.rootExplicit = true;
      }
      continue;
    }
    if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    positionals.push(arg);
  }
  if (positionals.length === 1) {
    options.scenarioFile = positionals[0];
  } else if (positionals.length === 2 &&
      !options.rootExplicit &&
      fs.existsSync(positionals[0]) &&
      fs.statSync(positionals[0]).isDirectory()) {
    options.root = positionals[0];
    options.scenarioFile = positionals[1];
  } else if (positionals.length === 0) {
    throw new Error("A scenario JSON file is required");
  } else {
    throw new Error(`Unexpected positional arguments: ${positionals.join(", ")}`);
  }
  delete options.rootExplicit;
  if (options.backend && options.readOutputDir) {
    throw new Error("Use either --backend or --read-output-dir, not both");
  }
  if (!options.backend && !options.readOutputDir) {
    throw new Error("No forward-eval backend is available; pass --backend or --read-output-dir");
  }
  options.timeoutMs = Number(options.timeoutMs);
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }
  return options;
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function stringArray(value, label, { allowEmpty = true } = {}) {
  if (value === undefined && allowEmpty) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  if (!allowEmpty && value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  return value.map((item) => item.trim());
}

function requiredAnyGroups(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((group) =>
    !Array.isArray(group) ||
    group.length === 0 ||
    group.some((item) => typeof item !== "string" || !item.trim()))) {
    throw new Error(`${label} must be an array of non-empty string arrays`);
  }
  return value.map((group) => group.map((item) => item.trim()));
}

function normalizeSplit(value) {
  const split = String(value || "").trim().toLowerCase();
  if (split === "train") return "train";
  if (["held-out", "heldout", "val", "validation", "test"].includes(split)) return "held-out";
  return "";
}

function validateScenario(raw, scenarioFile) {
  if (!raw || raw.schema !== SCENARIO_SCHEMA) {
    throw new Error(`Scenario schema must be ${SCENARIO_SCHEMA}`);
  }
  if (raw.reviewed !== true) {
    throw new Error("Scenario must set reviewed=true before it can drive a forward evaluation");
  }
  if (typeof raw.name !== "string" || !raw.name.trim()) {
    throw new Error("Scenario name is required");
  }
  if (!Array.isArray(raw.cases) || raw.cases.length === 0) {
    throw new Error("Scenario must contain at least one case");
  }

  const scenarioSkills = stringArray(raw.skills, "scenario.skills");
  const seen = new Set();
  let trainCount = 0;
  let heldOutCount = 0;
  const cases = raw.cases.map((entry, index) => {
    const label = `cases[${index}]`;
    const id = String(entry?.id || "").trim();
    if (!/^[A-Za-z0-9._-]+$/.test(id)) {
      throw new Error(`${label}.id must use only letters, numbers, dot, underscore, or hyphen`);
    }
    if (seen.has(id)) throw new Error(`Duplicate forward-eval case id: ${id}`);
    seen.add(id);

    const split = normalizeSplit(entry.split);
    if (!split) throw new Error(`${label}.split must be train or held-out/val`);
    if (split === "train") trainCount += 1;
    else heldOutCount += 1;

    const prompt = String(entry.prompt || "").trim();
    if (!prompt) throw new Error(`${label}.prompt is required`);
    const skills = stringArray(entry.skills ?? scenarioSkills, `${label}.skills`, { allowEmpty: false });
    const expected = entry.expected || {};
    const requiredAll = stringArray(expected.required_all, `${label}.expected.required_all`);
    const requiredAny = requiredAnyGroups(expected.required_any, `${label}.expected.required_any`);
    const forbidden = stringArray(expected.forbidden, `${label}.expected.forbidden`);
    if (requiredAll.length === 0 && requiredAny.length === 0 && forbidden.length === 0) {
      throw new Error(`${label}.expected must define at least one independent assertion`);
    }
    return {
      id,
      split,
      prompt,
      skills,
      expected: { requiredAll, requiredAny, forbidden }
    };
  });

  if (trainCount === 0 || heldOutCount === 0) {
    throw new Error("Scenario must include both train and held-out cases");
  }
  return {
    schema: raw.schema,
    name: raw.name.trim(),
    source: path.resolve(scenarioFile),
    cases
  };
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function loadSkills(root, names) {
  const skillsRoot = path.join(root, ".agents", "skills");
  return names.map((name) => {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      throw new Error(`Invalid skill name: ${name}`);
    }
    const file = path.resolve(skillsRoot, name, "SKILL.md");
    if (!isInside(skillsRoot, file) || !fs.existsSync(file)) {
      throw new Error(`Forward-eval skill is missing: .agents/skills/${name}/SKILL.md`);
    }
    return {
      name,
      path: path.relative(root, file).replace(/\\/g, "/"),
      content: fs.readFileSync(file, "utf8")
    };
  });
}

function backendOutput(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.output === "string") return parsed.output.trim();
  } catch {
    // Plain text is a supported backend response.
  }
  return text;
}

function invokeBackend(options, payload) {
  const result = spawnSync(options.backend, options.backendArgs, {
    cwd: options.root,
    input: `${JSON.stringify(payload)}\n`,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    timeout: options.timeoutMs,
    killSignal: "SIGTERM",
    stdio: ["pipe", "pipe", "pipe"]
  });
  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      const error = new Error(`Forward-eval backend timed out after ${options.timeoutMs}ms`);
      error.code = "FORWARD_EVAL_TIMEOUT";
      throw error;
    }
    throw new Error(`Forward-eval backend unavailable: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`Forward-eval backend exited ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  const output = backendOutput(result.stdout);
  if (!output) throw new Error("Forward-eval backend returned empty output");
  return output;
}

function judgeOutput(output, expected) {
  const normalized = output.toLocaleLowerCase();
  const issues = [];
  for (const required of expected.requiredAll) {
    if (!normalized.includes(required.toLocaleLowerCase())) {
      issues.push(`missing required text: ${required}`);
    }
  }
  for (const group of expected.requiredAny) {
    if (!group.some((candidate) => normalized.includes(candidate.toLocaleLowerCase()))) {
      issues.push(`missing required alternative: ${group.join(" | ")}`);
    }
  }
  for (const forbidden of expected.forbidden) {
    if (normalized.includes(forbidden.toLocaleLowerCase())) {
      issues.push(`contains forbidden text: ${forbidden}`);
    }
  }
  return { ok: issues.length === 0, issues };
}

function safeOutputDirectory(options, scenario) {
  if (options.outputDir) return path.resolve(options.outputDir);
  if (options.readOutputDir) return path.resolve(options.readOutputDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(options.root, ".codex-context", "raw", "skill-forward-eval", `${scenario.name}-${stamp}`);
}

function formatSummary(summary) {
  const lines = [
    "Dong Skills skill forward evaluation",
    `Scenario: ${summary.scenario}`,
    `Cases: ${summary.case_count} (${summary.train_count} train, ${summary.held_out_count} held-out)`,
    `Output directory: ${summary.output_directory}`,
    ""
  ];
  for (const result of summary.results) {
    lines.push(`${result.id} [${result.split}]: ${result.ok ? "pass" : "fail"} (execution=${result.execution_status})`);
    for (const issue of result.issues) lines.push(`- ${issue}`);
  }
  lines.push("", summary.ok ? "Result: pass" : "Result: fail");
  return lines.join("\n");
}

function run(options) {
  options.root = path.resolve(options.root);
  const scenarioFile = path.resolve(options.scenarioFile);
  const scenario = validateScenario(readJson(scenarioFile, "Scenario"), scenarioFile);
  const outputDirectory = safeOutputDirectory(options, scenario);
  fs.mkdirSync(outputDirectory, { recursive: true });

  const results = [];
  for (const entry of scenario.cases) {
    const outputFile = path.join(outputDirectory, `${entry.id}.txt`);
    let output = "";
    let executionIssue = "";
    let executionStatus = options.readOutputDir ? "recorded" : "pass";
    try {
      if (options.readOutputDir) {
        if (!fs.existsSync(outputFile)) {
          throw new Error(`Recorded forward-eval output is missing: ${outputFile}`);
        }
        output = fs.readFileSync(outputFile, "utf8").trim();
        if (!output) throw new Error(`Recorded forward-eval output is empty: ${outputFile}`);
      } else {
        const payload = {
          schema: REQUEST_SCHEMA,
          scenario: scenario.name,
          case_id: entry.id,
          prompt: entry.prompt,
          skills: loadSkills(options.root, entry.skills)
        };
        output = invokeBackend(options, payload);
        fs.writeFileSync(outputFile, `${output}\n`, "utf8");
      }
    } catch (error) {
      executionIssue = error.message;
      executionStatus = error.code === "FORWARD_EVAL_TIMEOUT" ? "timeout" : "backend-error";
    }

    const judged = executionIssue
      ? { ok: false, issues: [executionIssue] }
      : judgeOutput(output, entry.expected);
    results.push({
      id: entry.id,
      split: entry.split,
      ok: judged.ok,
      execution_status: executionStatus,
      issues: judged.issues,
      output_file: outputFile
    });
  }

  const summary = {
    schema: "dong-skills.forward-eval.result.v1",
    scenario: scenario.name,
    scenario_file: scenario.source,
    output_directory: outputDirectory,
    backend: options.readOutputDir ? "recorded-output-dir" : path.basename(options.backend),
    timeout_ms: options.readOutputDir ? null : options.timeoutMs,
    case_count: results.length,
    train_count: results.filter((result) => result.split === "train").length,
    held_out_count: results.filter((result) => result.split === "held-out").length,
    ok: results.every((result) => result.ok),
    results
  };
  fs.writeFileSync(path.join(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
  } else {
    const summary = run(options);
    process.stdout.write(`${options.json ? JSON.stringify(summary, null, 2) : formatSummary(summary)}\n`);
    if (!summary.ok) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`Skill forward evaluation failed: ${error.message}\n`);
  process.exitCode = 1;
}
