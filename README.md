# DirectiveAI

DirectiveAI is a **Git-first, editor-agnostic** workflow that lets you write structured AI directives inside a repository (in comments or directive files) and **compile them into safe, auditable feature branches**.

**What it is:** a CLI + workflow that treats AI guidance as first-class repo assets, not chat scraps. Directives sit alongside code, get versioned, and run through policy gates before shipping.

**What you use it for:** keeping AI-generated changes bounded to an agreed scope, enforcing review/verify rules automatically, and producing reproducible artifacts (branches, diffs, indexes) that audit how AI touched the codebase.

**Why it speeds you up:** it standardizes the “ask AI to change code” loop—discover directives, negotiate scope, lock scope, run, verify, and export artifacts—so teams avoid rework, unexpected blast radius, and manual bookkeeping. The result is faster delivery with safer automation.

Core ideas:
- Directives live in the repo (`.ai/`) and can be embedded in code comments.
- Discovery → scope proposal → explicit scope lock (no surprise blast radius).
- Policy gates + verification selected automatically based on what changed.
- Outputs are written to `.ai/out/<branch>/` with an artifact index.

## Install

### Try with npx
```bash
npx directiveai doctor
```

### Global
```bash
npm i -g directiveai
```

### In-repo (recommended)
```bash
npm i -D directiveai
```

## Quickstart

```bash
# initialize .ai/ standard in current repo
npx directiveai init

# validate setup
npx directiveai doctor

# ingest directives from code comments (markers)
npx directiveai ingest

# accept all pending directives
npx directiveai accept --all

# compile ready directives into a branch
npx directiveai run --ready --branch FEAT-001

# verify based on policy + changed files
npx directiveai verify-auto FEAT-001

# review + generate PR artifacts
npx directiveai review FEAT-001
npx directiveai pr FEAT-001

# show all artifacts
npx directiveai out FEAT-001
```

After install, the shorter `directiveai` and `dai` binaries are on PATH — use either form.

## Packages

- `packages/directiveai` — the CLI (`directiveai`, `dai`)
- `packages/create-directiveai` — scaffolder (`npx create-directiveai`)

## Docs

- [VISION](VISION.md)
- [GOVERNANCE](GOVERNANCE.md)
- [SECURITY](SECURITY.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [CHANGELOG](CHANGELOG.md)

## License

MIT © 2026 Joseph Caughey
