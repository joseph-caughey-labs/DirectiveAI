import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { fileExists } from "../core/utils.js";
import { aiRoot } from "../core/paths.js";

export async function cmdInit({ force = false }) {
  const root = process.cwd();
  const aiDir = aiRoot(root);
  await fs.mkdir(aiDir, { recursive: true });

  await writeIfMissing(root, ".ai/README.md", defaultAiReadme(), force);
  await writeIfMissing(root, ".ai/QUICKSTART.md", defaultQuickstart(), force);
  await writeIfMissing(root, ".ai/config.yml", defaultConfigYml(), force);
  await writeIfMissing(root, ".ai/policy.yml", defaultPolicyYml(), force);

  for (const d of [
    ".ai/directives/pending",
    ".ai/directives/ready",
    ".ai/directives/done",
    ".ai/proposals/scope",
    ".ai/lock",
    ".ai/out",
    ".ai/examples"
  ]) {
    await fs.mkdir(path.join(root, d), { recursive: true });
  }

  await ensureGitignore(root);

  console.log(chalk.green("\nInitialized .ai/ in this repo.\n"));
}

async function writeIfMissing(root, rel, content, force) {
  const fp = path.join(root, rel);
  if (!force && (await fileExists(fp))) return;
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, content, "utf8");
}

async function ensureGitignore(root) {
  const fp = path.join(root, ".gitignore");
  const line = "\n.ai/out/\n";
  if (!(await fileExists(fp))) {
    await fs.writeFile(fp, line.trimStart(), "utf8");
    return;
  }
  const existing = await fs.readFile(fp, "utf8");
  if (!existing.includes(".ai/out/")) {
    await fs.writeFile(fp, existing.trimEnd() + line, "utf8");
  }
}

function defaultAiReadme() {
  return `# DirectiveAI (.ai)

This folder defines a repo-local standard for capturing directives in code and compiling them into features.

Key commands:
- directiveai ingest
- directiveai accept --all
- directiveai run --ready --branch FEAT-001
- directiveai verify-auto FEAT-001
- directiveai review FEAT-001
- directiveai pr FEAT-001
- directiveai ci-export
`;
}

function defaultQuickstart() {
  return `# QUICKSTART

## 1) Add directives in code

Line markers:
@ai: TASK: Fix marquee loop jump

Block markers:
@ai-begin title="..." intent="..." scope=discover
...
@ai-end

## 2) Ingest -> accept -> run

directiveai ingest
directiveai accept --all
directiveai run --ready --branch FEAT-001

## 3) Verify + PR bundle

directiveai verify-auto FEAT-001
directiveai review FEAT-001
directiveai pr FEAT-001
`;
}

function defaultConfigYml() {
  return `version: 1

ingest:
  writeback: inline
  bind_ids: true

safety:
  require_clean: true
  auto_stash: false
  checkpoint:
    enabled: true
    kind: commit
    message: "ai checkpoint: {id}"
  rollback_on_fail: true

scope_lock:
  enabled: true
  write_on_accept: true
  enforce_on_run: true
  expansion:
    mode: proposal
    max_new_paths: 8

verify:
  commands:
    - name: lint
      cmd: "npm run lint"
    - name: test
      cmd: "npm test"

ci:
  enabled: true
  provider: github
  base_branch: main
  node_version: "20"
  install_cmd: "npm ci"
  verify_mode: policy

review:
  enabled: true
  base_branch: main
  agents:
    policy: true
    risk: true
    style: true
    tests: true
    llm_critic: false

github:
  enabled: true
  base_branch: main
  draft: true
  labels: ["ai", "autogen"]
  reviewers: []
  assignees: []
  auto_push: true
  remote: origin

runner:
  enabled: true
  workdir: "/work"
  mount_mode: "rw"
  env: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
  profiles:
    node:
      image: "node:20-bookworm"
      install: ["npm ci"]
  auto_select:
    enabled: true
    priority: ["node"]
    signals:
      node:
        any_files_exist: ["package.json"]
        any_globs_changed: ["**/*.js", "**/*.ts", "**/*.vue"]
`;
}

function defaultPolicyYml() {
  return `version: 1

defaults:
  forbidden_globs:
    - "**/node_modules/**"
    - "**/.git/**"
    - "**/.ai/**"

rules:
  - id: "no-secrets"
    when:
      touched_globs:
        - "**/.env"
        - "**/.env.*"
        - "**/*secret*"
        - "**/*private_key*"
    deny:
      message: "Do not modify secrets/env via DirectiveAI pipeline."

  - id: "payments-auth-require-tests"
    when:
      intent_keywords: ["payment","stripe","ledger","wallet","auth","login","token"]
      touched_globs: ["src/**","functions/**"]
    require:
      any_verify_checks: ["test"]
      message: "Payments/auth changes require tests."

  # Example: dynamically add an extra verify command when touching migrations
  - id: "db-migrations-verify"
    when:
      touched_globs: ["**/migrations/**"]
    verify_add:
      - name: "migrate-check"
        cmd: "npm run migrate:check"
`;
}
