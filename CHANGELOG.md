# Changelog

All notable changes to DirectiveAI are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] — 2026-05-27

### Added
- **Scope-lock enforcement.** Directives may declare `scope.allow` (whitelist) and/or `scope.deny` (denylist) globs. `run` checks the merge-base diff against the union of all scopes for the batch and aborts with a `scope.violations.json` artifact if a touched file is out of bounds. `--force` bypasses but still records the violation. Files under `.ai/**` are exempt as system paths.
- **ESLint config** at `packages/directiveai/eslint.config.js` (flat config, `recommended`). `npm run lint` now runs `eslint src bin`.
- **Smoke tests** using `node --test`: 21 tests covering scope-lock semantics, policy evaluation, and directive file parsing (JSON / YAML / Markdown frontmatter).
- **Expanded examples** — `examples/01..05` are now end-to-end walkthroughs covering markers, lifecycle, policy recipes, runner profile auto-select, and CI parity.

### Changed
- **Root `package.json` cleaned.** Removed ~88 transitive deps that had been spuriously added as top-level dependencies, plus the self-referential `directiveai` / `create-directiveai` entries (these are workspaces, not deps).
- `run --base` no longer hardcodes `"main"` at the CLI layer; the default now resolves from config (`runner.base_branch` → `ci.base_branch` → `github.base_branch` → `review.base_branch` → `"main"`).
- `runnerExport` default templates rewritten as array-joined strings — no behavior change, but no more `\"` escape soup.

### Docs
- `DIRECTIVE_SCHEMA.md` documents the new `scope` field.
- `examples/03-policy-recipes.md` explains where repo-wide policy ends and per-directive scope begins.
- `SECURITY.md` gains a reporting contact.

## [0.1.0] — Initial public release

### Added
- CLI commands: `init`, `doctor`, `ingest`, `accept`, `run`, `verify`, `verify-auto`, `review`, `notes`, `pr`, `out`, `gh-status`, `gh-pr`, `ci-export`, `runner-export`, `runner-ship` (alias `ship`).
- Policy engine (`.ai/policy.yml`) with `deny`, `deny_if.max_files_touched_over`, `require.any_verify_checks`, `intent_keywords`, `touched_globs`.
- CI export for GitHub Actions, generated from `.ai/config.yml`.
- Docker runner scaffolding with profile auto-select based on changed-file signals.
- Per-branch artifact directory at `.ai/out/<branch>/` with an `INDEX.md` + `index.json`.
- `create-directiveai` scaffolder for initializing `.ai/` in any repo.
