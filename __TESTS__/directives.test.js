import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { makeRepo, cleanup, runCli, commit, exists, ls, readJson, sh } from "./helpers.js";

let repo;
beforeEach(async () => {
  repo = await makeRepo();
  runCli(repo, ["init"]);
  sh(repo, "git", ["add", "-A"]);
  sh(repo, "git", ["commit", "-q", "-m", "init .ai/"]);
});
afterEach(async () => { await cleanup(repo); });

test("ingest creates directive files from @ai: markers", async () => {
  await commit(repo, {
    "src/app.js": "// @ai: TASK: Improve error handling\nconst x = 1;\n"
  }, "add marker");

  const r = runCli(repo, ["ingest", "--paths", "src"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Created 1 pending directive/);

  const pending = await ls(`${repo}/.ai/directives/pending`);
  assert.equal(pending.filter(f => f.endsWith(".json")).length, 1);

  const doc = await readJson(`${repo}/.ai/directives/pending/${pending[0]}`);
  assert.equal(doc.title, "Improve error handling");
  assert.equal(doc.source.file, "src/app.js");
  assert.equal(doc.source.line, 1);
});

test("ingest parses [intent=][prio=] metadata brackets", async () => {
  await commit(repo, {
    "src/app.js": "// @ai: [intent=bugfix][prio=high] TASK: Fix loop\n"
  }, "add marker");

  runCli(repo, ["ingest", "--paths", "src"]);
  const pending = await ls(`${repo}/.ai/directives/pending`);
  const doc = await readJson(`${repo}/.ai/directives/pending/${pending[0]}`);
  assert.equal(doc.title, "Fix loop");
  assert.equal(doc.intent, "bugfix");
  assert.equal(doc.priority, "high");
});

test("ingest is idempotent — second run skips already-ingested markers", async () => {
  await commit(repo, {
    "src/a.js": "// @ai: TASK: thing one\n",
    "src/b.js": "// @ai: TASK: thing two\n"
  }, "markers");

  runCli(repo, ["ingest", "--paths", "src"]);
  const first = (await ls(`${repo}/.ai/directives/pending`)).filter(f => f.endsWith(".json"));
  assert.equal(first.length, 2);

  const r2 = runCli(repo, ["ingest", "--paths", "src"]);
  const second = (await ls(`${repo}/.ai/directives/pending`)).filter(f => f.endsWith(".json"));
  assert.equal(second.length, 2, "no duplicates created");
  assert.match(r2.stdout, /skipped 2/);
});

test("accept --all moves pending → ready", async () => {
  await commit(repo, { "src/a.js": "// @ai: TASK: thing\n" }, "marker");
  runCli(repo, ["ingest", "--paths", "src"]);

  const r = runCli(repo, ["accept", "--all"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Accepted 1 directive/);

  assert.equal((await ls(`${repo}/.ai/directives/pending`)).filter(f => f.endsWith(".json")).length, 0);
  assert.equal((await ls(`${repo}/.ai/directives/ready`)).filter(f => f.endsWith(".json")).length, 1);
});

test("accept with no flag warns and exits 0", async () => {
  await commit(repo, { "src/a.js": "// @ai: TASK: x\n" }, "m");
  runCli(repo, ["ingest", "--paths", "src"]);
  const r = runCli(repo, ["accept"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Use --all or --id/);
});

test("run --ready creates branch, writes markers, and finalizes done/", async () => {
  await commit(repo, { "src/a.js": "// @ai: TASK: thing\n" }, "marker");
  runCli(repo, ["ingest", "--paths", "src"]);
  runCli(repo, ["accept", "--all"]);
  sh(repo, "git", ["add", "-A"]);
  sh(repo, "git", ["commit", "-q", "-m", "accept"]);

  const r = runCli(repo, ["run", "--ready", "--branch", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Run complete on branch FEAT-001/);

  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/run.meta.json`), true);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/INDEX.md`), true);
  const meta = await readJson(`${repo}/.ai/out/FEAT-001/run.meta.json`);
  assert.equal(meta.branch, "FEAT-001");
  assert.equal(meta.status, "ok");
  assert.equal(meta.directives.length, 1);

  assert.equal((await ls(`${repo}/.ai/directives/done`)).filter(f => f.endsWith(".json")).length, 1);
});

test("scope-lock blocks out-of-scope branch changes", async () => {
  await commit(repo, {
    "src/components/marquee.js": "x",
    "src/other.js": "y"
  }, "code");

  // Write a directive with scope.allow restricting to components/**
  await fs.mkdir(`${repo}/.ai/directives/pending`, { recursive: true });
  await fs.writeFile(`${repo}/.ai/directives/pending/D-001.json`, JSON.stringify({
    id: "D-001", title: "marquee", intent: "bugfix", status: "pending",
    created_at: "2026-01-01T00:00:00.000Z",
    source: { file: "src/components/marquee.js", line: 1 },
    scope: { allow: ["src/components/**"] }, tasks: []
  }));
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "d"]);
  runCli(repo, ["accept", "--all"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "a"]);

  // Pre-create branch with an out-of-scope edit
  sh(repo, "git", ["checkout", "-q", "-b", "FEAT-OOS"]);
  await fs.writeFile(`${repo}/src/other.js`, "edited out of scope");
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "oos"]);
  sh(repo, "git", ["checkout", "-q", "main"]);

  const r = runCli(repo, ["run", "--ready", "--branch", "FEAT-OOS", "--base", "main"]);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /Scope-lock violations/);
  assert.match(r.stderr, /src\/other\.js/);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-OOS/scope.violations.json`), true);
  const v = await readJson(`${repo}/.ai/out/FEAT-OOS/scope.violations.json`);
  assert.equal(v.status, "fail");
  assert.equal(v.violations[0].file, "src/other.js");
});

test("scope-lock --force bypasses but records the violation", async () => {
  await commit(repo, {
    "src/components/marquee.js": "x",
    "src/other.js": "y"
  }, "code");

  await fs.mkdir(`${repo}/.ai/directives/pending`, { recursive: true });
  await fs.writeFile(`${repo}/.ai/directives/pending/D-001.json`, JSON.stringify({
    id: "D-001", title: "marquee", intent: "bugfix", status: "pending",
    created_at: "2026-01-01T00:00:00.000Z",
    source: { file: "src/components/marquee.js", line: 1 },
    scope: { allow: ["src/components/**"] }, tasks: []
  }));
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "d"]);
  runCli(repo, ["accept", "--all"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "a"]);

  sh(repo, "git", ["checkout", "-q", "-b", "FEAT-OOS"]);
  await fs.writeFile(`${repo}/src/other.js`, "z");
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "oos"]);
  sh(repo, "git", ["checkout", "-q", "main"]);

  const r = runCli(repo, ["run", "--ready", "--branch", "FEAT-OOS", "--base", "main", "--force"]);
  assert.equal(r.code, 0);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-OOS/scope.violations.json`), true);
  const v = await readJson(`${repo}/.ai/out/FEAT-OOS/scope.violations.json`);
  assert.equal(v.context.forced, true);
});

test("run requires --branch", async () => {
  await commit(repo, { "src/a.js": "// @ai: TASK: x\n" }, "m");
  runCli(repo, ["ingest", "--paths", "src"]);
  runCli(repo, ["accept", "--all"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "a"]);

  const r = runCli(repo, ["run", "--ready", "--base", "main"]);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /--branch is required/);
});
