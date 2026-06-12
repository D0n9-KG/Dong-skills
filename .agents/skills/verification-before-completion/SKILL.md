---
name: verification-before-completion
description: MUST use before claiming work is complete, fixed, passing, ready, delivered, committed, or PR-ready. Requires fresh verification evidence or an explicit recorded gap in `.codex-context/verification.md`; evidence before assertions.
---

# Verification Before Completion

## Hard Gate

Do not claim work is complete, fixed, passing, ready, delivered, or safe until you have fresh evidence from the current turn.

If fresh verification cannot be run, say it is unverified and record the blocker or gap. Do not soften this into "should pass" or "looks good".

## Required Loop

1. Re-read the relevant spec, plan, and acceptance criteria.
2. Identify the smallest reliable command or product action that proves the claim.
3. Run the command/action in the current turn, or record why it is blocked.
4. Read the full output and exit code.
5. Update `.codex-context/verification.md` with the command/action, result, short evidence summary, timestamp, and gaps.
6. If verification fails, use `systematic-debugging` before further fixes.
7. Only then report the verified state.

## Evidence Standards

| Claim | Requires |
| --- | --- |
| Tests pass | The test command output with exit 0 and failure count reviewed. |
| Build succeeds | The build command output with exit 0 reviewed. |
| Type/lint clean | The relevant typecheck/lint command output reviewed. |
| Bug fixed | The original failing scenario is reproduced or explicitly recorded as not reproducible, then the fixed path is verified. |
| Requirements met | Each acceptance criterion is mapped to verification evidence or an explicit gap. |
| User-visible behavior works | Product evidence from UI, CLI, API, generated artifact, or workflow, or a recorded blocker. |

## Not Sufficient

- previous verification from another turn
- partial logs without exit status
- "no errors seen" without running the relevant command
- tests unrelated to the changed behavior
- agent or tool claims without independent inspection
- committing or pushing as a substitute for verification

## Verification Record

Append fresh entries to `.codex-context/verification.md`:

```markdown
## Commands Run
- `[command]`
  - Result: pass | fail | blocked
  - Evidence: [short output summary]
  - Date: [YYYY-MM-DD HH:mm local]

## Product Evidence
- `[action]`
  - Result: pass | fail | blocked
  - Evidence: [path, output summary, or explicit reason not applicable]
  - Date: [YYYY-MM-DD HH:mm local]

## Not Yet Verified
- [gap and why]
```

## Completion Wording

- If verified: state the command/action and result.
- If partially verified: state exactly what is verified and what is not.
- If blocked: state the blocker and the next useful verification step.

Never let confident wording exceed the evidence.
