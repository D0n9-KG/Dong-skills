---
name: codex-codebase-onboarding
description: Analyze an unfamiliar repository for Codex project work. Use when starting in a new repo, creating or refreshing project guidance, discovering architecture, identifying commands, mapping entry points, tests, build/lint tools, conventions, or preparing `.codex-context/project-map.md`.
---

# Codex Codebase Onboarding

Bootstrap Dong Skills project configuration when needed, then build a concise, evidence-backed project map. Do not read every file. Prefer filesystem search, manifests, configs, entry points, and representative examples.

## Bootstrap Gate

Before onboarding a project, check whether these files exist in the target project:

- `.agents/skills/.dong-skills-project.json`
- `.codex-context/project-map.md`
- `.codex-context/solution-index.md`
- `.codex-context/worktree-state.md`
- `.codex-context/workflow-state.yaml`
- `.codex/hooks/project-ops.mjs`
- `.codex/hooks.json`
- `AGENTS.md` containing `<!-- codex-project-ops:start -->`

If any are missing, run the bundled bootstrap script. Resolve `scripts/bootstrap-project-ops.ps1` relative to this skill directory, but pass the target repository explicitly:

```powershell
& "<resolved-skill-dir>\scripts\bootstrap-project-ops.ps1" -TargetProjectRoot "C:\path\to\repo"
```

When the shell is already in the target repository, keep the working directory there and run the resolved script path:

```powershell
& "<resolved-skill-dir>\scripts\bootstrap-project-ops.ps1" -TargetProjectRoot (Get-Location).Path
```

The bootstrap script installs the full project-level Dong Skills set into `.agents/skills/`, installs project hooks and split hook libraries, merges the managed `AGENTS.md` block, creates missing `.codex-context/` files including `workflow-state.yaml` and `working-notes.md`, patches missing context-template sections, installs helper scripts, and ensures `.gitignore` protects `.codex-context/raw/` runtime data, `.codex-context/discussion-state.json`, and SkillOpt-Sleep runtime staging under `.skillopt-sleep/`.

The global Dong Skills install intentionally exposes only entry skills: onboarding, the router, and Dong Skills maintenance. Full workflow skills and hooks are installed project-locally. Bootstrap must preserve non-Dong project-local skill directories; only skill names listed in the Dong Skills manifest are managed.

If all Bootstrap Gate files exist, run a health check before assuming the installed project configuration is current:

```powershell
node .codex/hooks/project-ops.mjs health-check
```

If the health check fails or reports `Result: fail`, run the bundled bootstrap script once to repair stale hooks, helper scripts, context templates, or managed guidance, then rerun the health check. This is required for older projects that already have all files present but need updated hook commands or state-file schema.

After bootstrapping, continue onboarding in the same turn. Tell the user they should restart Codex or start a new thread from the project if they need `/hooks` to show the newly installed project hooks immediately.

## Probe Order

1. Run the Bootstrap Gate if needed.
2. Read `AGENTS.md`, `.codex-context/workflow-state.yaml`, and key docs if present.
3. Detect current workspace role and update `.codex-context/worktree-state.md` when the repo is a worktree or hook source/root paths may be confusing.
4. Read `STRATEGY.md`, `CONCEPTS.md`, and `docs/solutions/README.md` if present; otherwise record them as absent, not required.
5. List top-level files and directories.
6. Detect manifests: `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `.csproj`, `composer.json`.
7. Detect frameworks and entry points: `next.config.*`, `vite.config.*`, `src/main.*`, `src/app.*`, `app/`, `pages/`, `cmd/`, `server.*`, `manage.py`.
8. Detect tests and verification commands: `tests/`, `__tests__/`, `*.test.*`, `*.spec.*`, `pytest.ini`, `vitest.config.*`, `jest.config.*`, CI workflows.
9. Detect conventions from nearby files before claiming style rules.
10. Run `node .codex/hooks/project-ops.mjs solution-status --update-index` when the hook script is installed.
11. Record unknowns explicitly instead of guessing.

## Output

Update `.codex-context/project-map.md` with:

- project purpose, if known
- stack and package manager
- architecture and important directories
- architecture watchpoints such as large files, flat directories, unclear ownership, or coupling risks
- strategy anchor and knowledge stores (`STRATEGY.md`, `CONCEPTS.md`, `docs/solutions/`) when present
- entry points and request/data flow
- build, test, lint, typecheck, and dev commands
- naming and code style conventions
- where to add common changes
- risks, unknowns, and verification gaps

## State Updates

After onboarding:

- update `.codex-context/current-state.md` with the current understanding and next action
- update `.codex-context/workflow-state.yaml` with `phase: discovery` or the next workflow phase and `next_skill`
- update `.codex-context/worktree-state.md` with current workspace role and branch state when relevant
- update `.codex-context/open-questions.md` with unresolved unknowns
- update `.codex-context/artifact-index.md` if key files were inspected or created
- update `.codex-context/solution-index.md` when `docs/solutions/` or `CONCEPTS.md` changed
- update `.codex-context/handoff-summary.md` if the session may be resumed later

If the user asked for a repo overview, answer from `project-map.md` after updating it.

## Rules

- Keep the map short enough to re-read after compaction.
- Mark inferred facts as inferred.
- Prefer code and config over README claims when they conflict.
- Do not overwrite existing project guidance blindly; merge and preserve current truths.
