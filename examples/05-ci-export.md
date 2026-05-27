# CI export

`ci-export` generates a GitHub Actions workflow from your `.ai/config.yml` so CI runs the same `verify-auto` your local pipeline does. Same rules locally and in CI — no drift.

## Generate

```bash
npx directiveai ci-export
# → .github/workflows/directiveai.yml
```

## Configure (`.ai/config.yml`)

```yaml
ci:
  enabled: true
  provider: github          # only github is implemented today
  base_branch: main
  node_version: "20"
  install_cmd: "npm ci"
```

To disable export entirely (e.g., if you maintain CI by hand):

```yaml
ci:
  enabled: false
```

## What gets written

```yaml
# .github/workflows/directiveai.yml
name: DirectiveAI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install
        run: npm ci
      - name: Doctor
        run: npx directiveai doctor
      - name: Verify
        run: npx directiveai verify-auto ${{ github.head_ref || github.ref_name }}
```

## Local ↔ CI parity

| Local command | CI step |
| --- | --- |
| `directiveai doctor` | "Doctor" |
| `directiveai verify-auto <branch>` | "Verify" |

Adding a verify check in `.ai/config.yml` automatically picks it up in CI on the next run — no workflow edit needed:

```yaml
# .ai/config.yml
verify:
  commands:
    - { name: lint, cmd: "npm run lint" }
    - { name: test, cmd: "npm test" }
    - { name: typecheck, cmd: "npx tsc --noEmit" }   # ← new check, no CI changes required
```

## Other providers

Only GitHub is scaffolded today. Setting `provider: gitlab` (or anything else) prints a warning and skips. Contribution-friendly extension point — `src/commands/ciExport.js` is ~30 lines.
