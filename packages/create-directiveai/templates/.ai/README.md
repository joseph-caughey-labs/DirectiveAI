# DirectiveAI (.ai)

This folder defines a repo-local standard for writing directives and compiling them into features.

## Folders

- `.ai/directives/pending/` — new directives to review
- `.ai/directives/ready/` — approved directives ready to run
- `.ai/directives/done/` — processed directives
- `.ai/proposals/scope/` — scope proposals
- `.ai/lock/` — scope locks
- `.ai/out/` — generated artifacts (ignored by git)
- `.ai/examples/` — examples

## Directive format

Each directive is a single file (JSON). Minimal fields:

```json
{
  "id": "abc123",
  "title": "Fix marquee loop",
  "intent": "bugfix",
  "status": "pending",
  "tasks": [
    { "type": "analyze", "text": "Describe the issue" },
    { "type": "change", "text": "Implement fix" }
  ]
}
```

## Inline markers

Add a line anywhere:

`@ai: TASK: Add a FAQ section to the homepage`

Then run:

- `directiveai ingest`
- `directiveai accept --all`

