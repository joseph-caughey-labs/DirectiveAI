# Runner profiles

Runner profiles let you ship a DirectiveAI run inside a Docker container with a profile picked automatically from the shape of the change. Profiles let you keep cheap defaults for ordinary edits and reach for heavier images only when the diff demands it.

## Why bother

- **Reproducibility** — same image every run, no host-toolchain drift
- **Cost** — cheap profile for routine edits, expensive one only when needed
- **Isolation** — model calls + builds happen in a sandbox

## Configure profiles + auto-select

`.ai/config.yml`:

```yaml
runner:
  enabled: true
  profiles:
    node:
      image: node:20-bookworm
      install: ["npm ci"]
    node-heavy:
      image: node:20-bookworm-slim
      install: ["npm ci", "npx playwright install --with-deps"]
    python:
      image: python:3.12-slim
      install: ["pip install -r requirements.txt"]
  auto_select:
    enabled: true
    priority: ["node-heavy", "python", "node"]
    signals:
      node:
        any_files_exist:   ["package.json"]
        any_globs_changed: ["**/*.js", "**/*.ts", "**/*.vue"]
      node-heavy:
        any_globs_changed: ["**/functions/**", "**/migrations/**", "tests/e2e/**"]
      python:
        any_files_exist:   ["pyproject.toml", "requirements.txt"]
        any_globs_changed: ["**/*.py"]
```

## How auto-select picks

`priority` is evaluated **top to bottom**. The first profile whose signals match wins.

| Diff includes | Selected profile |
| --- | --- |
| `tests/e2e/login.spec.ts` | `node-heavy` (matches first) |
| `src/parse_values.py` | `python` |
| `src/app.js` | `node` |
| Nothing matches | `runner.profile` if set, else first in `priority` |

A signal matches when:
- **`any_files_exist`** — any listed path exists in the working tree, OR
- **`any_globs_changed`** — any changed file matches any glob (minimatch, `dot: true`)

## Generate runner files and ship

```bash
npx directiveai runner-export
# → Dockerfile
# → .dockerignore
# → scripts/ai-runner.sh

npx directiveai runner-ship FEAT-001
# → selects profile based on diff vs. base
# → runs `ship` inside the container with the chosen image
```

Override the selection with `--profile`:

```bash
npx directiveai runner-ship FEAT-001 --profile node-heavy
```

## Tip: profile per pipeline stage

Use `node` for `verify-auto` (fast feedback) and `node-heavy` for `review` (browser/e2e checks). Different commands, different profiles — same config.
