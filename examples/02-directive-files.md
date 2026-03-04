# Directive files

Directive files live in `.ai/directives/pending/` (then move to `ready/`).

## Example: feature

```json
{
  "id": "feat001",
  "title": "Add magazine-style homepage hero",
  "intent": "feature",
  "priority": "med",
  "status": "pending",
  "created_at": "2026-03-03T00:00:00.000Z",
  "tasks": [
    { "type": "analyze", "text": "Review existing layout components" },
    { "type": "change", "text": "Implement hero layout variant" },
    { "type": "verify", "text": "Run lint + unit tests" }
  ]
}
```

## Lifecycle

- pending → ready → done

