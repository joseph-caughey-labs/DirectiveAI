# directiveai

> Compile repo directives into safe Git branches: scope-lock, policy gates, verification, PR artifacts.

DirectiveAI is a **Git-first, editor-agnostic** workflow for writing structured AI directives inside a repository (in comments or directive files) and compiling them into safe, auditable feature branches.

- Directives live in `.ai/` and can be embedded in code comments
- Discovery → scope proposal → explicit scope-lock (no surprise blast radius)
- Policy gates + auto-selected verification based on what changed
- Outputs land in `.ai/out/<branch>/` with an artifact index

## Install

```bash
# in-repo (recommended)
npm i -D directiveai

# global
npm i -g directiveai

# one-off
npx directiveai doctor
```

Requires Node 18+.

## Quickstart

```bash
npx directiveai init                            # scaffold .ai/
npx directiveai doctor                          # validate setup

npx directiveai ingest                          # scan code comments for @ai: markers
npx directiveai accept --all                    # promote pending → ready
npx directiveai run --ready --branch FEAT-001   # apply ready batch to a branch
npx directiveai verify-auto FEAT-001            # verify based on policy + touched files
npx directiveai review FEAT-001                 # multi-agent review
npx directiveai pr FEAT-001                     # generate PR artifacts
npx directiveai out FEAT-001                    # list everything generated
```

## Inline markers

```js
// @ai: [intent=bugfix][prio=high] TASK: Fix auth redirect loop
```

`ingest` turns this into a versioned directive file in `.ai/directives/pending/`. Re-runs are idempotent — already-ingested markers are skipped.

## Scope-lock

Bind a directive (or batch) to a set of allowed paths. `run` enforces it against the merge-base diff and aborts with a `scope.violations.json` artifact if a touched file is out of bounds.

```yaml
# in a directive file
scope:
  allow:
    - "src/components/Marquee/**"
  deny:
    - "**/*.env"
```

Pass `--force` to bypass; the violation is still recorded in the artifact index.

## Commands

| Command | What it does |
| --- | --- |
| `init` | Scaffold `.ai/` in the current repo |
| `doctor` | Validate setup (config, policy, expected folders) |
| `ingest` | Scan source for `@ai:` markers, write directive files |
| `accept` | Promote directives from `pending/` to `ready/` |
| `run` | Apply ready directives to a branch (scope-lock + policy enforced) |
| `verify` / `verify-auto` | Run verification commands, optionally selected by policy |
| `review` | Multi-agent review (policy, risk, style, tests) |
| `notes` | Generate release notes from the branch diff |
| `pr` | Generate PR title/body/bundle artifacts |
| `out` | List all artifacts for a branch |
| `gh-status` / `gh-pr` | GitHub CLI integration |
| `ci-export` | Generate a GitHub Actions workflow from `.ai/config.yml` |
| `runner-export` / `ship` | Docker runner scaffolding + execution |

Run `npx directiveai <cmd> --help` for full options.

## Docs

- [VISION](https://github.com/joseph-caughey-labs/DirectiveAI/blob/master/VISION.md) — what DirectiveAI is for
- [Examples](https://github.com/joseph-caughey-labs/DirectiveAI/tree/master/examples) — end-to-end walkthroughs
- [CHANGELOG](https://github.com/joseph-caughey-labs/DirectiveAI/blob/master/CHANGELOG.md) — release notes

## License

MIT © 2026 Joseph Caughey
