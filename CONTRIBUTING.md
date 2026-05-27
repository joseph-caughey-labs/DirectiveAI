# Contributing to DirectiveAI

Thanks for your interest in contributing.

DirectiveAI is infrastructure software. We optimize for **safety, determinism, clarity, and backwards compatibility**.

## Ground rules

- Be respectful and constructive.
- Keep PRs narrowly focused.
- Avoid unrelated refactors.
- If behavior changes, update docs.

## Local development

Requires Node 18+. From the repo root:

```bash
npm install                              # workspaces install
npm test                                 # node --test (smoke tests)
npm run lint                             # eslint src bin
node packages/directiveai/bin/ai.js --help
```

The CLI entry is `packages/directiveai/bin/ai.js`. Commands live in `packages/directiveai/src/commands/` and share helpers in `packages/directiveai/src/core/`. New commands need an entry in `bin/ai.js` to be reachable.

When adding behavior:
- prefer extending an existing `core/*.js` helper over inlining logic in the command
- add a smoke test under `packages/directiveai/test/` — the helpers are pure functions and easy to cover
- update `examples/` if the user-facing surface changes

## Contribution flow

1. Fork the repo
2. Create a branch:
   - `feat/<short-description>`
   - `fix/<short-description>`
   - `docs/<short-description>`
3. Make sure `npm test` and `npm run lint` are clean
4. Open a PR with:
   - what changed
   - why
   - any safety implications

## Design principles

- Language agnostic
- Editor agnostic
- Git-first
- Policy-driven safety
- Reproducible pipelines

## CLA

By submitting a pull request, you agree your contributions are licensed under this project’s MIT License.
