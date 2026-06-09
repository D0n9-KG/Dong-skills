# Debugging Workflow

## Phase 1: Root Cause Investigation

- Read the complete error, warning, stack, file path, line number, and error code.
- Reproduce consistently. If it is not reproducible, gather more data instead of guessing.
- Check recent diffs, dependency changes, config changes, CI changes, and environment changes.
- For multi-component systems, inspect each boundary before proposing fixes:
  - workflow -> script
  - script -> runtime
  - API -> service
  - service -> database
  - client -> server
  - build -> package/sign/deploy
- Trace the bad value or state backward to the first wrong source.

## Phase 2: Pattern Analysis

- Find the nearest working example in the same repo.
- Read reference implementations completely when copying a pattern.
- List differences between working and broken code.
- Identify dependencies, required config, assumptions, and lifecycle ordering.

## Phase 3: Hypothesis And Test

- State one hypothesis in concrete terms.
- Test the smallest possible variable.
- Do not bundle multiple fixes into one test.
- If the hypothesis fails, record why and form a new one.

## Phase 4: Implementation

- Prefer a failing unit/e2e test or the project’s existing verification command.
- Fix the source, not the downstream symptom.
- Keep the fix focused.
- Verify the fix and run adjacent regression checks.

## Stop Signals

Return to investigation when you catch yourself saying:

- "Just try this."
- "It is probably X."
- "I will fix this and test later."
- "One more patch on top."
- "I do not understand it, but this might work."

After three failed fixes, stop treating it as a local bug. Re-evaluate architecture, ownership boundaries, shared state, and hidden coupling.
