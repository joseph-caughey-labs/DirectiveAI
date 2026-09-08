import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { makeRepo, cleanup, runCli, commit, exists, readJson, readText, sh } from "./helpers.js";

let repo;

async function bootstrap() {
  // Repo with init + one ingested+accepted+run directive on branch FEAT-001
  repo = await makeRepo();
  runCli(repo, ["init"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "init .ai/"]);

  await commit(repo, { "src/app.js": "// @ai: TASK: thing\n" }, "marker");
  runCli(repo, ["ingest", "--paths", "src"]);
  runCli(repo, ["accept", "--all"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "accept"]);
  runCli(repo, ["run", "--ready", "--branch", "FEAT-001", "--base", "main"]);
}

beforeEach(bootstrap);
afterEach(async () => { await cleanup(repo); });

test("verify runs the configured commands and writes verify.json", async () => {
  // Replace default config so the verify commands succeed
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nverify:\n  commands:\n    - { name: pass, cmd: \"true\" }\n");

  const r = runCli(repo, ["verify", "FEAT-001"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /pass/);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/verify.json`), true);

  const meta = await readJson(`${repo}/.ai/out/FEAT-001/verify.json`);
  assert.equal(meta.status, "ok");
  assert.equal(meta.results.length, 1);
  assert.equal(meta.results[0].status, "ok");
});

test("verify exits non-zero when a check fails", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nverify:\n  commands:\n    - { name: fail, cmd: \"false\" }\n");

  const r = runCli(repo, ["verify", "FEAT-001"]);
  assert.notEqual(r.code, 0);
  const meta = await readJson(`${repo}/.ai/out/FEAT-001/verify.json`);
  assert.equal(meta.status, "fail");
});

test("verify-auto runs base commands and writes results", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nverify:\n  commands:\n    - { name: ok, cmd: \"true\" }\n");

  const r = runCli(repo, ["verify-auto", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0);
  const meta = await readJson(`${repo}/.ai/out/FEAT-001/verify.json`);
  assert.equal(meta.status, "ok");
  assert.equal(meta.branch, "FEAT-001");
  assert.equal(meta.base, "main");
});

test("verify-auto exits non-zero when a check fails", async () => {
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nverify:\n  commands:\n    - { name: fail, cmd: \"exit 7\" }\n");

  const r = runCli(repo, ["verify-auto", "FEAT-001", "--base", "main"]);
  assert.notEqual(r.code, 0);
  const meta = await readJson(`${repo}/.ai/out/FEAT-001/verify.json`);
  assert.equal(meta.results[0].exitCode, 7);
});

test("review generates review.json + REVIEW.md on the branch", async () => {
  // review requires HEAD == --branch
  sh(repo, "git", ["checkout", "-q", "FEAT-001"]);
  const r = runCli(repo, ["review", "FEAT-001", "--base", "main"]);
  // status code depends on whether verify metadata exists; tests asserts artifacts only
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/review.json`), true);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/REVIEW.md`), true);

  const meta = await readJson(`${repo}/.ai/out/FEAT-001/review.json`);
  assert.equal(meta.branch, "FEAT-001");
  for (const agent of ["policy", "risk", "style", "tests"]) {
    assert.ok(meta.agents[agent], `missing agent: ${agent}`);
    assert.ok(["ok", "warn", "fail"].includes(meta.agents[agent].status));
  }
  // Suppress unused-var warning
  void r;
});

test("review refuses to run when HEAD differs from --branch", () => {
  // bootstrap's `run` left us on FEAT-001 — switch off before testing rejection
  sh(repo, "git", ["checkout", "-q", "main"]);
  const r = runCli(repo, ["review", "FEAT-001", "--base", "main"]);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /Checked out main but --branch FEAT-001/);
});

test("review.risk flags auth/payment paths as high severity", async () => {
  sh(repo, "git", ["checkout", "-q", "FEAT-001"]);
  await commit(repo, { "src/auth/login.js": "console.log('login')\n" }, "auth file");
  const r = runCli(repo, ["review", "FEAT-001", "--base", "main"]);
  const meta = await readJson(`${repo}/.ai/out/FEAT-001/review.json`);
  const riskFindings = meta.agents.risk.findings || [];
  assert.ok(riskFindings.some(f => /Auth\/payment-related/i.test(f.message)),
    `expected auth/payment risk finding, got: ${JSON.stringify(riskFindings)}`);
  void r;
});

test("review writes a Markdown summary with each agent's status", async () => {
  sh(repo, "git", ["checkout", "-q", "FEAT-001"]);
  runCli(repo, ["review", "FEAT-001", "--base", "main"]);
  const md = await readText(`${repo}/.ai/out/FEAT-001/REVIEW.md`);
  assert.match(md, /# Review — FEAT-001/);
  assert.match(md, /## Policy agent/);
  assert.match(md, /## Risk agent/);
  assert.match(md, /## Style agent/);
  assert.match(md, /## Tests agent/);
});
