# Inline markers

Inline markers let you capture intent next to the code that needs to change. `directiveai ingest` scans source files for these markers and produces directive files under `.ai/directives/pending/`.

## Single-line marker

```js
// @ai: TASK: Improve error handling around file upload
```

After `npx directiveai ingest`, a JSON directive lands in `.ai/directives/pending/`:

```json
{
  "id": "p1k2m9",
  "title": "Improve error handling around file upload",
  "intent": "task",
  "status": "pending",
  "created_at": "2026-05-27T00:00:00.000Z",
  "source": { "file": "src/upload/index.js", "line": 42 },
  "tasks": []
}
```

## Marker with metadata

Bracketed key=value pairs become directive fields:

```js
// @ai: [intent=bugfix][prio=high] TASK: Fix auth redirect loop
```

Produces:

```json
{
  "intent": "bugfix",
  "priority": "high",
  "title": "Fix auth redirect loop"
}
```

## Other languages

The scanner is language-agnostic — any line containing `@ai:` is a candidate:

```py
# @ai: TASK: Add unit tests for parse_values
```

```rb
# @ai: TASK: Memoize expensive lookup
```

```html
<!-- @ai: TASK: Replace hand-rolled carousel with library -->
```

## End-to-end loop

```bash
npx directiveai ingest --paths src,functions
# → .ai/directives/pending/p1k2m9.json
# → .ai/directives/pending/9a8b7c.json

npx directiveai accept --all
# → moves pending → ready

npx directiveai run --ready --branch FEAT-001
# → creates branch FEAT-001 from base, applies ready batch
```

> **Note:** `ingest` does not currently rewrite the source comments — the marker remains in place. Treat markers as ephemeral notes that get promoted to durable directive files.
