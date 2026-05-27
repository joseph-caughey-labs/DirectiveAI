# DirectiveAI Examples

End-to-end walkthroughs of the major workflows. Read in order if you're new; jump to a topic if you're not.

## Contents

| File | What you'll learn |
| --- | --- |
| [01-inline-markers.md](01-inline-markers.md) | Capturing intent next to code with `@ai:` markers, language-agnostic ingest, end-to-end loop |
| [02-directive-files.md](02-directive-files.md) | Authoring directives (JSON / YAML / Markdown frontmatter), the pending→ready→done lifecycle, scope-lock per directive |
| [03-policy-recipes.md](03-policy-recipes.md) | Repo-wide policy rules: deny secrets, require tests for sensitive areas, cap blast radius. Where policy ends and per-directive scope begins |
| [04-runner-profiles.md](04-runner-profiles.md) | Picking the cheapest viable Docker image per run, signal-based auto-select, profile overrides |
| [05-ci-export.md](05-ci-export.md) | Generating a GitHub Actions workflow that mirrors local `verify-auto`, keeping local and CI in lock-step |

## Suggested first walk

```bash
npx directiveai init             # scaffold .ai/
npx directiveai doctor           # sanity check
npx directiveai ingest           # see inline markers turn into directives
npx directiveai accept --all
npx directiveai run --ready --branch FEAT-001
npx directiveai verify-auto FEAT-001
npx directiveai review FEAT-001
npx directiveai pr FEAT-001
npx directiveai out FEAT-001     # list everything generated
```
