#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(scriptDirectory, "lib", "recovery-eval.mjs"),
  path.join(scriptDirectory, "..", ".codex", "scripts", "lib", "recovery-eval.mjs")
];
const runtime = candidates.find((candidate) => fs.existsSync(candidate));
if (!runtime) {
  throw new Error(`Dong Skills recovery evaluator runtime is missing. Checked: ${candidates.join(", ")}`);
}

const { evaluateRecovery, formatRecoveryEvaluation } = await import(pathToFileURL(runtime).href);
const args = process.argv.slice(2);
const json = args.includes("--json");
const rootArg = args.find((arg) => !arg.startsWith("--")) || process.cwd();
const root = path.resolve(rootArg);
const result = evaluateRecovery(root);
process.stdout.write(`${json ? JSON.stringify(result, null, 2) : formatRecoveryEvaluation(result)}\n`);
if (!result.ok) process.exitCode = 1;
