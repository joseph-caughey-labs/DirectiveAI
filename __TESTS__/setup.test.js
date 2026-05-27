import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { makeRepo, cleanup, runCli, exists, readText } from "./helpers.js";

let repo;
beforeEach(async () => { repo = await makeRepo(); });
afterEach(async () => { await cleanup(repo); });

test("init scaffolds .ai/ structure", async () => {
  const r = runCli(repo, ["init"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Initialized \.ai\//);
  assert.equal(await exists(`${repo}/.ai/config.yml`), true);
  assert.equal(await exists(`${repo}/.ai/policy.yml`), true);
  assert.equal(await exists(`${repo}/.ai/directives/pending`), true);
  assert.equal(await exists(`${repo}/.ai/directives/ready`), true);
  assert.equal(await exists(`${repo}/.ai/out`), true);
});

test("init is idempotent without --force (does not overwrite)", async () => {
  runCli(repo, ["init"]);
  const original = await readText(`${repo}/.ai/config.yml`);
  // mutate the config
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(`${repo}/.ai/config.yml`, "# user edited\nversion: 1\n")
  );
  const r2 = runCli(repo, ["init"]);
  assert.equal(r2.code, 0);
  const after = await readText(`${repo}/.ai/config.yml`);
  assert.match(after, /user edited/);
  assert.notEqual(after, original);
});

test("init --force overwrites existing config", async () => {
  runCli(repo, ["init"]);
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(`${repo}/.ai/config.yml`, "# user edited\n")
  );
  const r2 = runCli(repo, ["init", "--force"]);
  assert.equal(r2.code, 0);
  const after = await readText(`${repo}/.ai/config.yml`);
  assert.doesNotMatch(after, /user edited/);
});

test("doctor warns when .ai/ is missing", () => {
  const r = runCli(repo, ["doctor"]);
  assert.match(r.stdout + r.stderr, /\.ai\/ folder missing/);
});

test("doctor passes after init", () => {
  runCli(repo, ["init"]);
  const r = runCli(repo, ["doctor"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /All good\./);
});

test("--help lists all commands", () => {
  const r = runCli(repo, ["--help"]);
  assert.equal(r.code, 0);
  for (const cmd of ["init", "doctor", "ingest", "accept", "run", "verify",
    "verify-auto", "review", "notes", "pr", "out", "ci-export",
    "gh-status", "gh-pr", "runner-export", "runner-ship"]) {
    assert.match(r.stdout, new RegExp(`\\b${cmd}\\b`), `--help missing: ${cmd}`);
  }
});
