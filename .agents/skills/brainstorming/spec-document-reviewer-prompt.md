# Spec Review Checklist

Use this as an inline self-review checklist. If the user explicitly asks for a separate reviewer mechanism and one is available, the same checklist can be delegated.

**Review after:** `.codex-context/spec.md` or a linked `docs/codex/specs/*.md` file is written.

## What To Check

| Category | Question |
|---|---|
| Completeness | Are there TODOs, placeholders, or missing acceptance criteria? |
| Consistency | Do requirements contradict each other? |
| Clarity | Could this be interpreted two different ways? |
| Scope | Is this small enough for one implementation plan? |
| YAGNI | Did we add unrequested features? |

## Output

```markdown
## Spec Review

**Status:** Approved | Issues Found

**Issues:**
- [Section]: [specific issue] - [why it matters]

**Recommendations:**
- [advisory only]
```
