# QUICKSTART

## Install

```bash
npm i -D directiveai
```

## Initialize

```bash
npx directiveai init
```

## Write directives

Inline markers anywhere:

```js
// @ai: TASK: Fix the marquee loop so it doesn't jump
```

## Compile to a feature branch

```bash
npx directiveai ingest
npx directiveai accept --all
npx directiveai run --ready --branch FEAT-001
```

## Verify + PR artifacts

```bash
npx directiveai verify-auto FEAT-001
npx directiveai review FEAT-001
npx directiveai pr FEAT-001
```

## Optional GitHub PR

```bash
npx directiveai gh-status
npx directiveai gh-pr FEAT-001
```
