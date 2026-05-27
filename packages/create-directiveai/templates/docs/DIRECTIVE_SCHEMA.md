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

## Optional fields

### `scope` — scope-lock

Bound which files a directive (or batch of directives) is allowed to touch. Enforced by `directiveai run` against the merge-base diff. Files under `.ai/**` are exempt (DirectiveAI's own artifacts).

```yaml
scope:
  allow:
    - "src/components/Marquee/**"
    - "src/lib/marquee.js"
  deny:
    - "**/*.env"
    - "**/secrets/**"
```

Semantics:
- `allow` (optional): if present and non-empty, switches to **whitelist mode** — only files matching at least one glob are permitted.
- `deny` (optional): always applied on top of `allow`.
- When multiple directives run together, the **union** of all `allow` lists and `deny` lists is enforced.
- Globs use [minimatch](https://github.com/isaacs/minimatch) syntax (`**`, `*`, `?`, `[...]`, etc.) with `dot: true`.
- Violations are written to `.ai/out/<branch>/scope.violations.json` and fail the run. Pass `--force` to bypass — the bypass is still recorded.

## Notes

- Keep one directive per file.
- Move through lifecycle: pending → ready → done.
- Treat directives like code: review them, version them.
