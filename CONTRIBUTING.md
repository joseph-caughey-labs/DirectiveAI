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

## Branch model (gitflow)

This repo follows [gitflow](https://nvie.com/posts/a-successful-git-branching-model/). `master` is **protected** and only receives tagged release commits; day-to-day work lives on `develop`.

```
master   ●──────●──────●──────●         tagged releases only (v0.1.2, v0.1.3, …)
          \    / \    / \    /
           \  /   \  /   \  /
develop     ●──●───●──●───●──●          integration of feature/* + fix/*
                \  /    \  /
feature/*        ●        ●             short-lived branches off develop
```

Master branch protection currently enforces:
- no direct push (admins included)
- no force-push, no deletion
- linear history (no merge commits — releases land via fast-forward or squash from a release branch)
- PR required, 0 approvals (solo project)

The default branch is `develop`, so new PRs target develop by default.

### Branch names

| Prefix | Branches off | Merges into | When |
| --- | --- | --- | --- |
| `feature/<slug>` | `develop` | `develop` | New functionality |
| `fix/<slug>` | `develop` | `develop` | Bugfix during normal cycle |
| `docs/<slug>` | `develop` | `develop` | Documentation-only |
| `release/X.Y.Z` | `develop` | `master` + `develop` | Cutting a release |
| `hotfix/X.Y.Z` | `master` | `master` + `develop` | Critical fix on a shipped version |

### Releasing

1. `git checkout develop && git pull`
2. `git checkout -b release/X.Y.Z`
3. Bump versions in `packages/directiveai/package.json` and `packages/directiveai/bin/ai.js`
4. In `CHANGELOG.md`, rename the top `## [Unreleased]` to `## [X.Y.Z] — YYYY-MM-DD` and insert a fresh empty `## [Unreleased]` above it
5. Verify `npm test` + `npm run lint` pass
6. Open PR `release/X.Y.Z → master`. After merge, tag with `git tag -a vX.Y.Z -m "directiveai vX.Y.Z"` and push the tag
7. Open PR `release/X.Y.Z → develop` (or rebase develop onto master) so the version bump + dated changelog land on develop too
8. Publish: `npm publish -w directiveai` (and `-w create-directiveai` if it changed)

### Hotfixes

Same shape but branched from `master`. Merge back into both `master` (tagged) and `develop`.

## CHANGELOG convention

- All change entries land under `## [Unreleased]` on `develop`.
- Group entries by `### Added` / `### Changed` / `### Fixed` / `### Removed` / `### Security` ([Keep a Changelog](https://keepachangelog.com/)).
- Release branches stamp `[Unreleased]` → `[X.Y.Z] — YYYY-MM-DD` and insert a new empty `[Unreleased]` above it.
- Never edit a released section after it's tagged.

## Contribution flow

1. Fork the repo (or branch directly if you're a maintainer)
2. From `develop`, create a branch:
   - `feature/<short-description>`
   - `fix/<short-description>`
   - `docs/<short-description>`
3. Add a `## [Unreleased]` entry in `CHANGELOG.md` describing your change
4. Make sure `npm test` and `npm run lint` are clean
5. Open a PR **into `develop`** with:
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
