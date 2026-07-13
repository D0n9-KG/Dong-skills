# Dong Skills Agent Architecture Audit

## Scope

- Source: current working tree of the real Dong Skills repository.
- Task: remove prompt semantic authority, keep governance advisory and proportional, and audit the complete agent/runtime/install boundary.
- Method: direct code tracing, deterministic domain tests, real hook fixtures, release checks, and two isolated read-only subagent reviews that were closed after review.
- Audit surfaces: instructions, recovery, memory, summary re-entry, recall duplication, tool routing, execution proof, result interpretation, JSON shaping, transport, hidden loops, and persistence/install state.

## Executive Conclusion

- No unresolved High or Critical finding remains.
- The control plane no longer treats arbitrary prompt wording as approval, scope, execution, mutation, Stop, or PreCompact authority.
- Canonical workflow decisions are task/hash bound; recovery and Stop continuation receipts are session scoped.
- The audit found and fixed additional wrapper regressions in approval hashing, health parity, learning/PreCompact behavior, SessionStart context duplication, managed guidance parity, and liveness wording.
- Residual risks are conservative usability limits or naming/hygiene improvements, not known authority bypasses or hidden infinite loops.

## Findings

### High 1: Plan Progress Invalidated Its Own Approval

- Symptom: checking tasks, updating `Current Step`, or recording checkpoints changed the approved plan hash and blocked valid execution.
- Mechanism: approval was bound to the whole mutable progress document.
- Boundary: instructions, persistence, approval receipts.
- Root cause: substantive plan contract and execution metadata were not separated.
- Fix: `approval-contract-v2` hashes substantive `plan-progress.md` plus the linked detailed plan while excluding task checkboxes, `Current Step`, and the dedicated checkpoint section. Substantive task/scope/constraint/verification changes still invalidate approval.
- Evidence: `.codex/scripts/lib/workflow.mjs:283`, `.codex/scripts/lib/workflow.mjs:2068`; workflow/core domain coverage.
- Status: fixed.

### High 2: Health Duplicated Workflow Consistency Logic

- Symptom: health and runtime could disagree about valid workflow/approval state after schema evolution.
- Mechanism: `project-ops-health.mjs` maintained a second implementation of workflow consistency and hashes.
- Boundary: tool-result interpretation, persistence diagnostics.
- Root cause: duplicated authority instead of a shared runtime API.
- Fix: health now calls runtime `workflowConsistencyStatus`.
- Evidence: `scripts/project-ops-health.mjs:537` and bootstrap mirror parity.
- Status: fixed.

### High 3: Natural-Language Prompt Wording Had Control-Plane Authority

- Symptom: paraphrases could create approval/spec-skip/scope/freshness effects, while semantically equivalent wording could escape or trigger gates.
- Mechanism: complex prompt regexes generated decision and execution receipts.
- Boundary: system instructions, tool routing, memory contamination.
- Root cause: unstructured language was used as authorization evidence.
- Fix: `UserPromptSubmit` now writes only a redacted advisory. `workflow-state decision <transition>` writes canonical task/hash-bound evidence; the matching transition validates and consumes it.
- Evidence: `.codex/scripts/lib/events.mjs:118`, `.codex/scripts/lib/events.mjs:152`, `.codex/scripts/lib/workflow.mjs:69`.
- Status: fixed.

### Medium 1: Learning Review Still Blocked Manual PreCompact

- Symptom: one pending raw learning observation blocked manual compaction and requested broad unrelated state refreshes.
- Mechanism: `preCompact` appended `learning.issues` to hard issues even though Stop and guidance called learning advisory.
- Boundary: long-term memory, compaction, hidden repair burden.
- Root cause: runtime and skill semantics drifted.
- Fix: learning remains visible in status but is not a hard PreCompact issue; the blocking message now asks for only evidence named by deterministic issues.
- Evidence: `.codex/scripts/lib/events.mjs:1576`; `tests/domains/workflow-hooks.test.mjs:1672`.
- Status: fixed.

### Medium 2: SessionStart Duplicated On-Demand State Into Hot Context

- Symptom: SessionStart injected handoff, workflow recovery, current state, working notes, decisions, open questions, worktree, plan, solution index, and learned instincts; real host output approached several thousand tokens and was truncated.
- Mechanism: recovery order pointers and full excerpts were both injected.
- Boundary: compaction recovery, active recall, context duplication, rendering.
- Root cause: recovery completeness was implemented as eager recall rather than ordered pointers plus minimal hot context.
- Fix: SessionStart now injects status, recovery order, handoff, Active Wayfinder summary, workflow recovery, and current state. Other files remain explicit on-demand recovery pointers. When an emergency PreCompact notice exists, business objective/instruction/next action are shown before the notice.
- Evidence: `.codex/scripts/lib/recovery.mjs:44`, `.codex/scripts/lib/recovery.mjs:83`; `tests/domains/workflow-hooks.test.mjs:678`, `tests/domains/workflow-hooks.test.mjs:1747`.
- Status: fixed.

### Medium 3: Root AGENTS Managed Block Drifted From Installer Guidance

- Symptom: source-root `AGENTS.md` omitted the rules that Dong Skills-only maintenance does not reopen business scope, no-change verification does not convert historical dirty state into debt, and hook burden must remain proportional.
- Mechanism: the source root and install snippet were maintained separately without parity coverage.
- Boundary: system/project instructions, installed copies.
- Root cause: duplicated managed text without an executable parity contract.
- Fix: root managed block was synchronized and `skills-contracts` now compares it with the canonical snippet; root and bootstrap snippets remain byte-identical.
- Evidence: `tests/domains/skills-contracts.test.mjs:256`.
- Status: fixed.

### Low 1: Health Liveness Could Be Misread As Host Trust

- Symptom: a manually invoked hook could produce recent liveness, which users could read as proof that Codex trusted and automatically triggered hooks.
- Mechanism: health separated static/parity/liveness but did not always state the trust limitation.
- Fix: health always prints `Host trust: not proven by health-check`.
- Evidence: `scripts/project-ops-health.mjs:958`; workflow hook test coverage.
- Status: fixed.

## Boundary Review

1. **System/project instructions:** canonical decisions and managed-block parity are enforced; prompt text is advisory.
2. **Session history/compaction recovery:** session history does not re-inject raw transcripts; recovery receipts bind task, handoff, runtime, and session; SessionStart hot context is now bounded.
3. **Long-term memory/admission:** raw observations are redacted candidates, not active rules; review is milestone advisory and cannot block Stop/PreCompact/recovery/delivery by itself.
4. **Summary artifacts re-entering as facts:** SubagentStop writes a scoped review receipt and cannot advance the parent workflow; emergency handoff preserves prior content and business sections lead recovery output.
5. **Active recall/duplicated context:** eager duplicate excerpts were removed; recovery order remains explicit.
6. **Tool selection/routing:** simple reads, compound diagnostics, verification, mutations, workflow decisions, and destructive commands have separate deterministic classes and tests.
7. **Execution proof:** mutation intent is invocation scoped and reconciled with Git/content hashes; tool-contained commits are included.
8. **Tool-result interpretation:** explicit failure cannot earn refresh evidence or workflow/recovery receipts. Empty host responses may credit only content-hash-proven state refresh after an invocation-scoped mutation; they do not authorize workflow decisions or recovery.
9. **Answer/JSON shaping:** hook JSON uses `writeJson`; no string-built JSON envelope was found.
10. **Transport/rendering:** the launcher forwards stdin/stdout/stderr/status and does not rewrite hook JSON.
11. **Hidden repair loops:** Stop continuation receipts are session scoped and bounded; exhaustion surfaces unresolved gaps instead of looping or claiming success.
12. **Persistence/install state:** installer Preview is no-write; Apply uses lock/journal/rollback; marker, content receipts, root/bootstrap parity, runtime hash, and stale-runtime checks are covered.

## Reviewed But Not Accepted As Defects

- **Unknown PostToolUse response is not general fail-open.** The current host can emit an empty response. The runtime accepts it only for state files whose content hash changed after an invocation-scoped mutation. Recovery and workflow receipt consumption still require explicit success. Requiring `known && ok` for every refresh would regress the real host contract.
- **Arbitrary PowerShell scriptblocks remain gated.** Simple read-only pipelines and compound diagnostics are supported. Treating arbitrary `{}`/`$()` scriptblocks as read-only would require a real PowerShell parser; regex widening would violate the conservative safety design. Use simple read commands or recovery-approved opaque commands.

## Residual Risks

- `distribution_id` names the project distribution while global skill trees are validated by separate receipts. This is operationally safe but semantically easy to misread; a future schema may rename it or add a full-distribution ID.
- Release artifact scan does not yet share every installer `.staging-*` / `.previous-*` pattern. Installer transaction tests prove cleanup and recovery, but release hygiene can later add a shared residual-pattern list.
- Automatic PreCompact still writes a temporary notice at the top of the handoff file for crash recovery. Recovery output now leads with the business task, and `asset-governance --apply` archives the notice; a future format could separate the notice into a dedicated runtime marker.

## Verification Contract

- Targeted tests cover every accepted finding.
- Full domain runner and `release-check` must pass after this report and all fixes.
- Root/bootstrap runtime and snippet parity must pass.
- Downstream Preview/Apply and live hook regression remain Task 9 and must not modify research business code.
