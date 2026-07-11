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
2. Re-read `workflow-state.yaml` and confirm the current phase matches the claim.
3. Identify the smallest reliable command or product action that proves the claim.
4. Run the command/action in the current turn, or record why it is blocked.
5. Read the full output and exit code.
6. Update `.codex-context/verification.md` with the command/action, result, short evidence summary, timestamp, and gaps.
7. Update `workflow-state.yaml` when the result changes the phase, next skill, or blocking decision.
8. If verification fails, use `systematic-debugging` before further fixes.
9. Only then report the verified state.

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
## 已运行命令
- `[command]`
  - Result: pass | fail | blocked
  - Evidence: [简短输出摘要]
  - Date: [YYYY-MM-DD HH:mm 本地时间]

## 产品证据
- `[action]`
  - Result: pass | fail | blocked
  - Evidence: [路径、输出摘要，或明确说明不适用]
  - Date: [YYYY-MM-DD HH:mm 本地时间]

## 尚未验证
- [验证缺口及原因]
```

## Completion Wording

- If verified: state the command/action and result.
- If partially verified: state exactly what is verified and what is not.
- If blocked: state the blocker and the next useful verification step.

Never let confident wording exceed the evidence.

## Workflow Closure

Fresh evidence is necessary but does not by itself complete the workflow. When workflow state is installed:

1. In `review`, finish review or return accepted fixes through `review-changes-requested`.
2. In `delivery`, run `node .codex/hooks/project-ops.mjs workflow-state transition checkpoint-ready` only after verification and review evidence are valid.
3. In `handoff`, complete or explicitly defer the checkpoint with `codex-git-checkpoint`.
4. After checkpoint evidence is recorded, run `node .codex/hooks/project-ops.mjs workflow-state transition delivery-complete`.

Do not claim final delivery while the workflow remains in `verification`, `review`, `delivery`, or `handoff`.

Workflow closure checks `verification_evidence_hash` and `review_evidence_hash` against the current `.codex-context/verification.md`. Missing evidence, reused pre-review content, or edits after review closure must return to the appropriate verification/review phase instead of being waived in prose.
