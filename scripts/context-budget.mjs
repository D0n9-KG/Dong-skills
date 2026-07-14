#!/usr/bin/env node
import path from "node:path";
import { contextBudget } from "../.codex/scripts/lib/budget.mjs";
import { gitRoot } from "../.codex/scripts/lib/core.mjs";

const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : gitRoot(process.cwd());

console.log(contextBudget(root));
