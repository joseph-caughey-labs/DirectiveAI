# Directive files

Directive files live under `.ai/directives/<status>/`. JSON, YAML, and Markdown (with YAML frontmatter) are all supported.

## Lifecycle

```
pending/  → accept →  ready/  → run →  done/
```

Each command operates on a folder:

| Command | Reads from | Writes to |
| --- | --- | --- |
| `ingest` | source files (`@ai:` markers) | `pending/` |
| `accept --all` / `--id <id>` | `pending/` | `ready/` |
| `run --ready --branch X` | `ready/` | `done/` + `.ai/out/X/` |

## Feature directive (JSON)

```json
{
  "id": "feat001",
  "title": "Add magazine-style homepage hero",
  "intent": "feature",
  "priority": "med",
  "status": "pending",
  "created_at": "2026-05-27T00:00:00.000Z",
  "source": { "file": "src/pages/Home.vue", "line": 8 },
  "tasks": [
    { "type": "analyze", "text": "Review existing layout components" },
    { "type": "change",  "text": "Implement hero layout variant" },
    { "type": "verify",  "text": "Run lint + unit tests" }
  ]
}
```

## Bugfix directive with scope-lock (YAML)

`scope.allow` enforces a whitelist — `run` rejects any file change outside it. `scope.deny` is always applied on top.

```yaml
id: bug042
title: Fix jumpy marquee loop
intent: bugfix
priority: high
status: pending
created_at: "2026-05-27T00:00:00.000Z"
source:
  file: src/components/Marquee/index.vue
  line: 120
scope:
  allow:
    - "src/components/Marquee/**"
    - "src/lib/marquee.js"
  deny:
    - "**/*.env"
tasks:
  - type: analyze
    text: Identify why the loop jumps after one cycle
  - type: change
    text: Use requestAnimationFrame instead of setInterval
  - type: verify
    text: Visual regression check at 60fps
```

## Markdown directive (frontmatter + body)

The YAML frontmatter is the directive; the body below is free-form notes for reviewers.

```md
---
id: refactor-19
title: Extract retry helper from upload pipeline
intent: refactor
status: pending
created_at: "2026-05-27T00:00:00.000Z"
scope:
  allow: ["src/upload/**"]
---

# Notes

Three different call sites currently duplicate the retry-with-backoff logic.
Pull them into `src/upload/retry.js` and update the call sites to use it.
```

## After a run

```
.ai/
├── directives/
│   └── done/
│       └── feat001.json
└── out/
    └── FEAT-001/
        ├── INDEX.md              ← rendered artifact index
        ├── index.json            ← machine-readable index
        ├── applied.feat001.txt   ← per-directive marker (compile stub)
        ├── run.meta.json         ← branch, base, directives, scope
        └── scope.violations.json ← only present if scope-lock failed
```

If scope-lock fails, the run aborts before moving the directive to `done/`, so re-running after fixing the diff is safe.
