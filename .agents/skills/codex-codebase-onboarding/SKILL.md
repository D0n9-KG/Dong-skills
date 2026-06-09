---
name: codex-codebase-onboarding
description: Analyze an unfamiliar repository for Codex project work. Use when starting in a new repo, creating or refreshing project guidance, discovering architecture, identifying commands, mapping entry points, tests, build/lint tools, conventions, or preparing `.codex-context/project-map.md`.
---

# Codex Codebase Onboarding

Build a concise, evidence-backed project map. Do not read every file. Prefer filesystem search, manifests, configs, entry points, and representative examples.

## Probe Order

1. Read `AGENTS.md` and key docs if present.
2. List top-level files and directories.
3. Detect manifests: `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `.csproj`, `composer.json`.
4. Detect frameworks and entry points: `next.config.*`, `vite.config.*`, `src/main.*`, `src/app.*`, `app/`, `pages/`, `cmd/`, `server.*`, `manage.py`.
5. Detect tests and verification commands: `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, `pytest.ini`, `vitest.config.*`, `jest.config.*`, CI workflows.
6. Detect conventions from nearby files before claiming style rules.
7. Record unknowns explicitly instead of guessing.

## Output

Update `.codex-context/project-map.md` with:

- project purpose, if known
- stack and package manager
- architecture and important directories
- entry points and request/data flow
- build, test, lint, typecheck, and dev commands
- naming and code style conventions
- where to add common changes
- risks, unknowns, and verification gaps

If the user asked for a repo overview, answer from `project-map.md` after updating it.

## Rules

- Keep the map short enough to re-read after compaction.
- Mark inferred facts as inferred.
- Prefer code and config over README claims when they conflict.
- Do not overwrite existing project guidance blindly; merge and preserve current truths.
