---
name: codex-agent-architecture-audit
description: Audit an agent, LLM application, tool-calling harness, memory system, or autonomous workflow for wrapper regression, memory contamination, tool discipline failures, hidden repair loops, rendering corruption, and stale persistence. Use for Dong Skills maintenance or other agent-system reviews, not for ordinary application code review.
---

# Codex Agent Architecture Audit

Use this review when the product being changed is itself an agent or agent harness. Prefer code-first fixes over adding more prompt prose.

## Audit Surfaces

Trace the user-visible result through these boundaries:

1. system and project instructions
2. session history and compaction recovery
3. long-term memory and admission rules
4. distillation or summary artifacts re-entering as facts
5. active recall and duplicated context
6. tool selection and routing
7. tool execution and proof that it actually ran
8. tool-result interpretation
9. answer shaping and structured envelopes
10. transport or rendering mutation
11. hidden repair loops, retries, fallback agents, or second passes
12. persistence, caches, receipts, installed copies, and stale runtime state

## Required Failure Lenses

- **Wrapper regression:** the base capability works, but added instructions or adapters degrade it.
- **Memory contamination:** old or agent-authored claims override current user corrections or task identity.
- **Tool discipline:** a required tool can be skipped, hallucinated, or routed to the wrong implementation.
- **Hidden repair loops:** another pass mutates output without a visible contract or bounded retry policy.
- **Rendering corruption:** internal output is correct but the user receives altered Markdown, JSON, streaming, or UI content.
- **Persistence drift:** cached state, installation copies, receipts, handoffs, or summaries are treated as live truth after they expire.

## Method

1. Identify entrypoints, models, wrappers, tools, state stores, rendering surfaces, and installed/runtime boundaries.
2. Reproduce one complete path from user input to delivered output.
3. Compare the direct capability with the wrapped path when wrapper regression is plausible.
4. Locate every hidden model call, retry, fallback, memory write, output transform, and persistence read.
5. Verify required behavior in code or deterministic tests; prompt-only requirements are not enforcement.
6. Rank findings by actual operational effect and cite file/line or trace evidence.

## Fix Order

Prefer:

1. code-gate required tool and state transitions
2. remove or narrow hidden repair paths
3. eliminate duplicated or stale context
4. make memory admission respect user corrections and task identity
5. preserve structured data through rendering and transport
6. validate persistence with receipts, freshness, or ownership evidence

Do not respond to wrapper regression by adding another wrapper unless the code path cannot enforce the contract.

## Output

Lead with severity-ranked findings. For each finding include symptom, mechanism, source boundary, root cause, evidence, confidence, and a code-first fix. End with the smallest ordered repair plan and residual risks.
