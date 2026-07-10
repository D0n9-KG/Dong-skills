# Skill Forward Evaluation

`scripts/skill-forward-eval.mjs` evaluates observable skill behavior through an external executor while keeping assertions outside the executor input.

## Scenario Format

```json
{
  "schema": "dong-skills.forward-eval.v1",
  "name": "scenario-name",
  "reviewed": true,
  "cases": [
    {
      "id": "unique-case-id",
      "split": "train",
      "skills": ["using-superpowers"],
      "prompt": "User-visible task prompt",
      "expected": {
        "required_all": ["text every passing output must contain"],
        "required_any": [
          ["one", "of", "these"],
          ["and-one", "of-these"]
        ],
        "forbidden": ["text no passing output may contain"]
      }
    }
  ]
}
```

- `reviewed` must be `true`.
- Case IDs must be unique and filesystem-safe.
- A scenario must contain at least one `train` case and one `held-out`/`val` case.
- Every `required_all` item must appear.
- Each inner `required_any` group is required, but any one alternative within that group may satisfy it.
- No `forbidden` item may appear.
- Matching is case-insensitive substring matching. Use semantic alternatives instead of one brittle sentence.

## Backend Contract

Run:

```powershell
node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json `
  --root . `
  --backend <executable> `
  --backend-arg <arg> `
  --output-dir .codex-context/raw/skill-forward-eval/run-name
```

The backend receives one JSON object on stdin:

```json
{
  "schema": "dong-skills.forward-eval.request.v1",
  "scenario": "scenario-name",
  "case_id": "unique-case-id",
  "prompt": "User-visible task prompt",
  "skills": [
    {
      "name": "using-superpowers",
      "path": ".agents/skills/using-superpowers/SKILL.md",
      "content": "..."
    }
  ]
}
```

The request never contains `expected`, `required_all`, `required_any`, or `forbidden`.

The backend may return plain text or:

```json
{ "output": "model response" }
```

Each raw response is written to `<output-dir>/<case-id>.txt` before local judging. `summary.json` records case results without embedding the raw responses.

## Recorded Outputs

Outputs created by another independent executor can be judged later:

```powershell
node scripts/skill-forward-eval.mjs evals/skill-forward/complex-project-gates.json `
  --root . `
  --read-output-dir .codex-context/raw/skill-forward-eval/run-name
```

Keep generated outputs under `.codex-context/raw/`; do not commit private prompts, responses, credentials, or project data.
