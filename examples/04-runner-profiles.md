# Runner profiles

Runner profiles let you run DirectiveAI inside Docker and auto-select the cheapest/safest profile for a task.

## Concept

- Small changes → small/cheap runner
- Heavy tasks → bigger runner

## Signals (in .ai/config.yml)

```yml
runner:
  profiles:
    node:
      image: node:20-bookworm
      install: ["npm ci"]
    node-heavy:
      image: node:20-bookworm
      install: ["npm ci"]
  auto_select:
    enabled: true
    priority: ["node", "node-heavy"]
    signals:
      node:
        any_globs_changed: ["**/*.js", "**/*.ts", "**/*.vue"]
      node-heavy:
        any_globs_changed: ["**/functions/**", "**/migrations/**"]
```

Then:

```bash
npx directiveai runner-export
npx directiveai runner-ship FEAT-001
```

