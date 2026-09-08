# `__TESTS__/` — Integration test suite

End-to-end tests that exercise the published CLI as a black box: each test spins up a fresh temp git repo, invokes `packages/directiveai/bin/ai.js` via `spawnSync`, and asserts on exit codes + generated artifacts.

Distinct from the unit tests in [`packages/directiveai/test/`](../packages/directiveai/test/), which test individual helper functions and ship inside the published npm package. The integration tests here do **not** ship — they live at the repo root because they exercise the whole product.

## Run

```bash
npm test                  # unit + integration
npm run test:unit         # just packages/directiveai/test/
npm run test:integration  # just __TESTS__/
```

Integration tests take ~6 seconds total (each spawns the CLI in a temp repo). Unit tests run in ~0.6 seconds.

## Files

| File | Covers |
| --- | --- |
| [helpers.js](helpers.js) | `makeRepo()`, `runCli()`, `sh()`, `commit()`, file readers — used by every test file |
| [setup.test.js](setup.test.js) | `init`, `init --force`, `doctor` warnings + pass, `--help` lists all commands |
| [directives.test.js](directives.test.js) | `ingest` with markers + metadata + idempotency, `accept --all`, `run --ready`, scope-lock pass/fail/`--force`, required-flag enforcement |
| [verification.test.js](verification.test.js) | `verify` exit codes, `verify-auto` with base commands, `review` artifacts + agent outputs + HEAD-mismatch rejection |
| [artifacts.test.js](artifacts.test.js) | `notes`, `pr`, `out`, `INDEX.md` regeneration, `addArtifact` dedup-by-path |
| [exports.test.js](exports.test.js) | `ci-export` (provider gating, config honored, disabled case), `runner-export` (Dockerfile + script generated + executable + `--force` overwrite) |
| [workflow.test.js](workflow.test.js) | Full happy-path init → ingest → accept → run → verify-auto → review → notes → pr → out, plus a regression test for the v0.1.2 quickstart fix |

## Conventions

- One test = one assertion-thread. `beforeEach`/`afterEach` give every test a clean tmpdir.
- Use `runCli(cwd, args)` instead of `spawnSync` directly — it sets stdio, captures stdout+stderr, and never throws.
- Assert on **exit code** and **artifact contents**, not on log strings unless the user-facing message is the contract.
- New commands need a new test file or a new section in an existing one. Wire it into [workflow.test.js](workflow.test.js) if it's part of the documented happy path.
