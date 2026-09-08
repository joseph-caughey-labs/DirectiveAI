import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { makeRepo, cleanup, runCli, commit, exists, readJson, readText, sh } from "./helpers.js";

let repo;

async function bootstrap() {
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

test("notes writes RELEASE_NOTES.md and registers it in INDEX", async () => {
  const r = runCli(repo, ["notes", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/RELEASE_NOTES.md`), true);

  const idx = await readJson(`${repo}/.ai/out/FEAT-001/index.json`);
  assert.ok(idx.artifacts.some(a => a.kind === "release_notes"));
});

test("pr writes PR_TITLE / PR_BODY / BUNDLE and indexes all three", async () => {
  const r = runCli(repo, ["pr", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0);
  for (const f of ["PR_TITLE.txt", "PR_BODY.md", "BUNDLE.md"]) {
    assert.equal(await exists(`${repo}/.ai/out/FEAT-001/${f}`), true, `missing: ${f}`);
  }
  const idx = await readJson(`${repo}/.ai/out/FEAT-001/index.json`);
  const kinds = idx.artifacts.map(a => a.kind);
  for (const kind of ["pr_title", "pr_body", "bundle"]) {
    assert.ok(kinds.includes(kind), `index missing kind: ${kind}`);
  }
});

test("out lists all generated artifacts for the branch", async () => {
  runCli(repo, ["notes", "FEAT-001", "--base", "main"]);
  runCli(repo, ["pr", "FEAT-001", "--base", "main"]);

  const r = runCli(repo, ["out", "FEAT-001"]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /AI Output: FEAT-001/);
  assert.match(r.stdout, /Release notes/);
  assert.match(r.stdout, /PR title/);
  assert.match(r.stdout, /PR description/);
  assert.match(r.stdout, /One-paste PR bundle/);
});

test("INDEX.md is regenerated on each addArtifact call", async () => {
  runCli(repo, ["notes", "FEAT-001", "--base", "main"]);
  const md1 = await readText(`${repo}/.ai/out/FEAT-001/INDEX.md`);
  assert.match(md1, /Release notes/);

  runCli(repo, ["pr", "FEAT-001", "--base", "main"]);
  const md2 = await readText(`${repo}/.ai/out/FEAT-001/INDEX.md`);
  assert.match(md2, /Release notes/);
  assert.match(md2, /PR title/);
  assert.match(md2, /One-paste PR bundle/);
});

test("addArtifact dedups by path (same path → single entry, last write wins)", async () => {
  // Two `notes` invocations should leave exactly one release_notes entry
  runCli(repo, ["notes", "FEAT-001", "--base", "main"]);
  runCli(repo, ["notes", "FEAT-001", "--base", "main"]);

  const idx = await readJson(`${repo}/.ai/out/FEAT-001/index.json`);
  const releaseNotesCount = idx.artifacts.filter(a => a.kind === "release_notes").length;
  assert.equal(releaseNotesCount, 1, "duplicate release_notes entries in index");
});
