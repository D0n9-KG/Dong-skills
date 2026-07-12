# Dong Skills Hooks Control Plane Implementation Plan

## Objective
Make hooks enforce irreversible project invariants before supported mutations, keep process tracking lightweight, and reserve Stop blocking for current delivery correctness rather than unrelated hygiene.

## Task 1: Shared control state and failing tests
1. Add `work_lane` to the workflow schema with backward-compatible defaults and validation.
2. Add structured Git query results that distinguish success, no remote/upstream, and execution failure.
3. Add strict hook input parsing with event-specific required fields.
4. Add ignored runtime receipts for recovery, Stop continuation, subagent results, and liveness.
5. Add failing unit/e2e tests for all confirmed bypasses before implementation.

Verification:
- Core/workflow/hooks tests fail for the intended reasons before runtime fixes.
- Existing legacy workflow fixtures remain parseable.

## Task 2: PreToolUse gate
1. Register PreToolUse for apply_patch, Edit/Write, Bash/simple shell, and MCP tools.
2. Classify supported tool calls as read-only, mutating, destructive, or unknown.
3. For mutating/destructive calls, require valid recovery receipt, resolved decision, and phase/lane approvals.
4. Return the current hook-specific deny shape and a minimal remediation instruction.
5. Keep read-only and unsupported paths unblocked, with bounded additional context where useful.

Verification:
- Mutating calls are denied when recovery or approvals are stale.
- Read-only tools remain usable for repair and diagnosis.
- Official output schemas are accepted by fixture tests.

## Task 3: PostToolUse and Stop
1. Replace broad per-tool Git scans with lightweight tool receipts and targeted dirty checks.
2. Replace 1-second freshness tolerance with deterministic change/refresh receipts.
3. Split Stop findings into hard, phase-boundary, and advisory levels.
4. Remove learning and non-severe asset hygiene from normal Stop blockers.
5. Emit only issue-specific remediation actions.
6. Re-evaluate repeated Stop issues with a bounded continuation receipt instead of unconditional allow; do not require the host to provide `stop_hook_active`.

Verification:
- Fast writes cannot bypass state requirements.
- Final git status does not re-dirty working notes.
- Learning-only and advisory-only states do not block.
- Unresolved hard/phase issues survive at least one continuation and produce bounded diagnostics.

## Task 4: Subagents and liveness
1. Add SubagentStart context containing task identity, allowed scope, current phase, and recovery requirements.
2. Add SubagentStop result receipt and one bounded continuation for missing result/verification summaries.
3. Write liveness receipts on hook execution without changing tracked project state.
4. Extend health to report static installation, runtime parity, and liveness separately.

Verification:
- Subagent events use official output shapes.
- No full transcript or prompt is persisted.
- Health passes static checks but warns separately when liveness is absent or stale.

## Task 5: Distribution and release
1. Synchronize root runtime, bootstrap assets, hooks.json, scripts, templates, and relevant skills.
2. Update README/AGENTS only where behavior or recovery instructions changed.
3. Run targeted tests, full domain tests, health, release check, parity checks, and real bootstrap fixture.
4. Reinstall the global entry skills only after source release verification passes.

Verification:
- Root/bootstrap hashes match.
- No runtime transaction or temporary artifacts remain.
- Full release check passes without weakening prior tests.

## Task 6: Control-plane trust closure
1. Scope every side-effecting workflow transition to the active session recovery receipt.
2. Create one-time user-decision receipts from UserPromptSubmit and require them for approval-resolving transitions.
3. Add a workflow-state cross-process lock and atomic writes; reject stale concurrent transitions instead of silently overwriting.
4. Add a unified completion validator for verification gaps, review skips, checkpoint deferrals, and Lane 2/3 delivery.
5. Archive and reset task-scoped context on new-task so old approval and Wayfinder evidence cannot leak.
6. Classify continuation/status prompts separately from decisions and corrections; track content hashes rather than mtime-only freshness.

Verification:
- Cross-session workflow transitions are denied without recovery in that session.
- Approval transitions fail without a matching prompt receipt and cannot replay a consumed receipt.
- Concurrent new-task attempts produce one committed transition and explicit failures for stale attempts.
- Lane 3 cannot reach complete through an unaccepted verification gap or skipped review.
- New-task leaves workflow status valid and recovery output free of old-task pointers.
- A bare continuation prompt does not create a five-document refresh obligation.

## Task 7: Installation and upgrade lifecycle
1. Install a self-contained project-skills snapshot with the global onboarding entry and compute one distribution_id across project skills and project-ops assets.
2. Refuse stale source/install mixtures while allowing a relocated or removed source checkout to use the verified installed snapshot.
3. Canonicalize install resources through junctions before deriving lock and transaction journal identities.
4. Add a versioned workflow-state migrator and invoke it transactionally from bootstrap/root install.
5. Record distribution_id in source and project receipts; extend health diagnostics without treating installed copies as source.

Verification:
- Stale global entry plus changed source fails before writing a target project.
- Relocated source still bootstraps from the installed, receipt-verified snapshot.
- Real and junction aliases contend on the same lock.
- A historical workflow-state template upgrades and passes installed health.

## Task 8: Final verification and macro review
1. Run targeted tests, all domain tests, source and installed health, release check, parity and real install/bootstrap/upgrade fixtures.
2. Review the final workflow from idea exploration through build, verification, review, checkpoint, compaction recovery, and cross-session continuation.
3. Apply only further fixes backed by a concrete reproduction and measurable workflow benefit.

Verification:
- Every approved acceptance criterion has current evidence.
- No release result from the pre-expansion implementation is reused as final proof.
