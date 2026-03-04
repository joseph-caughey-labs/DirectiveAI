# Workflow

1) Add directives in code comments or in `.ai/directives/pending/`
2) `directiveai ingest`
3) Review pending directives, then `directiveai accept --all`
4) `directiveai run --ready --branch FEAT-001`
5) `directiveai verify-auto FEAT-001`
6) `directiveai review FEAT-001`
7) `directiveai pr FEAT-001` (and optionally `directiveai gh-pr FEAT-001`)

