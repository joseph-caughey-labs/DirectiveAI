# Changelog

All notable changes to DirectiveAI are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.2] — 2026-05-27

### Fixed
- **`run` no longer rejects the documented happy path.** With `safety.require_clean: true` (the default), `run` previously failed immediately after `accept` because the pending→ready file renames left the tree dirty. `ensureClean` now exempts DirectiveAI's own bookkeeping paths (`.ai/directives/` and `.ai/out/`) — uncommitted user source still blocks. Also switches to `git status --porcelain --untracked-files=all` so a brand-new `.ai/` directory is enumerated by file rather than collapsed to the parent dir (the case that made the naïve prefix filter wrong).
- **`getTouchedFilesSinceBase` honored its `branch` argument.** The helper accepted a `branch` parameter but always diffed against `"HEAD"`, so `runner-ship FEAT-001 --base main` (or any caller) would compute the diff against whatever was checked out instead of the requested branch — producing a wrong (often empty) file list and steering profile auto-select toward the default. Now diffs `mergeBase(base, branch)..branch`.
- **`addArtifact` no longer drops artifacts with the same `kind`.** The previous dedup keyed on `path` *or* `kind`, so a second artifact sharing only its kind (different path, different content) was silently discarded from the index. Dedup is now keyed on `path` alone; same-path re-adds replace the entry (last write wins for `label` / `kind`).
- **`ingest` is now idempotent.** Previous runs would re-create directive files for every `@ai:` marker on every invocation, producing duplicates with new random IDs. `ingest` now indexes existing `source: { file, line }` across `pending/`, `ready/`, and `done/` and skips markers already represented there. The skip count is shown in the summary line.

### Added
- **Inline-marker metadata parsing.** The `[intent=…]` / `[prio=…]` / `[priority=…]` bracket convention previously documented in the examples is now actually parsed by `ingest` — the brackets are stripped from the title and applied to the directive's fields. Keys are case-insensitive. A leading `TASK:` / `TODO:` / `NOTE:` / `FIXME:` prefix is also stripped.

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
