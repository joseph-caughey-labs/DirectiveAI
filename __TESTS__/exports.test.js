import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { makeRepo, cleanup, runCli, exists, readText, sh } from "./helpers.js";

let repo;
beforeEach(async () => {
  repo = await makeRepo();
  runCli(repo, ["init"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "init .ai/"]);
});
afterEach(async () => { await cleanup(repo); });

test("ci-export writes .github/workflows/directiveai.yml", async () => {
  const r = runCli(repo, ["ci-export"]);
  assert.equal(r.code, 0);
  assert.equal(await exists(`${repo}/.github/workflows/directiveai.yml`), true);

  const yml = await readText(`${repo}/.github/workflows/directiveai.yml`);
  assert.match(yml, /name: DirectiveAI/);
  assert.match(yml, /actions\/checkout/);
  assert.match(yml, /actions\/setup-node/);
  assert.match(yml, /npx directiveai doctor/);
  assert.match(yml, /npx directiveai verify-auto/);
});

test("ci-export honors node_version and install_cmd from config", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`, [
    "version: 1",
    "ci:",
    "  enabled: true",
    "  provider: github",
    "  node_version: \"22\"",
    "  install_cmd: \"pnpm install\""
  ].join("\n"));

  runCli(repo, ["ci-export"]);
  const yml = await readText(`${repo}/.github/workflows/directiveai.yml`);
  assert.match(yml, /node-version: '22'/);
  assert.match(yml, /pnpm install/);
});

test("ci-export skips when ci.enabled is false", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`, "version: 1\nci:\n  enabled: false\n");
  const r = runCli(repo, ["ci-export"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /CI export disabled/);
  assert.equal(await exists(`${repo}/.github/workflows/directiveai.yml`), false);
});

test("ci-export warns and skips on unsupported provider", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nci:\n  enabled: true\n  provider: gitlab\n");
  const r = runCli(repo, ["ci-export"]);
  assert.match(r.stdout, /Only github provider scaffolded/);
  assert.equal(await exists(`${repo}/.github/workflows/directiveai.yml`), false);
});

test("runner-export writes Dockerfile, .dockerignore, and ai-runner.sh", async () => {
  const r = runCli(repo, ["runner-export"]);
  assert.equal(r.code, 0);
  for (const f of ["Dockerfile", ".dockerignore", "scripts/ai-runner.sh"]) {
    assert.equal(await exists(`${repo}/${f}`), true, `missing: ${f}`);
  }

  const dockerfile = await readText(`${repo}/Dockerfile`);
  assert.match(dockerfile, /FROM node:/);
  assert.match(dockerfile, /WORKDIR \/work/);

  const script = await readText(`${repo}/scripts/ai-runner.sh`);
  assert.match(script, /#!\/usr\/bin\/env bash/);
  assert.match(script, /docker run/);

  // chmod check: script should be executable
  const stat = await fs.stat(`${repo}/scripts/ai-runner.sh`);
  assert.ok((stat.mode & 0o111) !== 0, "script not executable");
});

test("runner-export does not clobber existing files without --force", async () => {
  await fs.writeFile(`${repo}/Dockerfile`, "# user edited\n");
  const r = runCli(repo, ["runner-export"]);
  assert.equal(r.code, 0);
  const after = await readText(`${repo}/Dockerfile`);
  assert.match(after, /user edited/);
});

test("runner-export --force overwrites", async () => {
  await fs.writeFile(`${repo}/Dockerfile`, "# user edited\n");
  runCli(repo, ["runner-export", "--force"]);
  const after = await readText(`${repo}/Dockerfile`);
  assert.doesNotMatch(after, /user edited/);
  assert.match(after, /FROM node:/);
});
