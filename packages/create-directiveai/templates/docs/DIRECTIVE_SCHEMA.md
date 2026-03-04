# Directive Schema (v1)

Directive files live under `.ai/directives/<status>/`.

## Minimal JSON

```json
{
  "id": "k2f9m3",
  "title": "Fix jumpy marquee loop",
  "intent": "bugfix",
  "priority": "med",
  "status": "pending",
  "created_at": "2026-03-03T00:00:00.000Z",
  "source": { "file": "src/App.vue", "line": 120 },
  "tasks": [
    { "type": "analyze", "text": "Identify why the loop jumps" },
    { "type": "change", "text": "Implement a seamless loop" },
    { "type": "verify", "text": "Add a visual regression check" }
  ]
}
```

## Notes

- Keep one directive per file.
- Move through lifecycle: pending → ready → done.
- Treat directives like code: review them, version them.

