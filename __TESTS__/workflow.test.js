import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { makeRepo, cleanup, runCli, commit, exists, readJson, sh } from "./helpers.js";

let repo;
beforeEach(async () => { repo = await makeRepo(); });
afterEach(async () => { await cleanup(repo); });

test("[end-to-end] init → ingest → accept → run → verify-auto → review → notes → pr → out", async () => {
  // 1. Init the .ai/ structure
  let r = runCli(repo, ["init"]);
  assert.equal(r.code, 0, "init failed");
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "init .ai/"]);

  // Configure verify with a command that will succeed (real-world: lint/test)
  await fs.writeFile(`${repo}/.ai/config.yml`,
    "version: 1\nverify:\n  commands:\n    - { name: smoke, cmd: \"true\" }\n");
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "configure verify"]);

  // 2. Commit code with a marker
  await commit(repo, {
    "src/upload.js": "// @ai: [intent=bugfix] TASK: Handle empty input\nfunction upload() {}\n"
  }, "add upload with marker");

  // 3. Ingest
  r = runCli(repo, ["ingest", "--paths", "src"]);
  assert.equal(r.code, 0, "ingest failed");
  assert.match(r.stdout, /Created 1 pending/);

  // 4. Accept
  r = runCli(repo, ["accept", "--all"]);
  assert.equal(r.code, 0, "accept failed");
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "accept directive"]);

  // 5. Run on a fresh branch — this is the case that broke pre-v0.1.2
  r = runCli(repo, ["run", "--ready", "--branch", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0, `run failed: ${r.stderr}`);
  assert.match(r.stdout, /Run complete on branch FEAT-001/);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/run.meta.json`), true);

  // 6. Verify-auto
  r = runCli(repo, ["verify-auto", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0, "verify-auto failed");
  const verifyMeta = await readJson(`${repo}/.ai/out/FEAT-001/verify.json`);
  assert.equal(verifyMeta.status, "ok");

  // 7. Review (must be on the branch)
  sh(repo, "git", ["checkout", "-q", "FEAT-001"]);
  runCli(repo, ["review", "FEAT-001", "--base", "main"]);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/review.json`), true);

  // 8. Notes
  r = runCli(repo, ["notes", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0);
  assert.equal(await exists(`${repo}/.ai/out/FEAT-001/RELEASE_NOTES.md`), true);

  // 9. PR
  r = runCli(repo, ["pr", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0);
  for (const f of ["PR_TITLE.txt", "PR_BODY.md", "BUNDLE.md"]) {
    assert.equal(await exists(`${repo}/.ai/out/FEAT-001/${f}`), true);
  }

  // 10. Out lists everything
  r = runCli(repo, ["out", "FEAT-001"]);
  assert.equal(r.code, 0);
  for (const fragment of ["Run metadata", "Verification results", "Review results",
    "Release notes", "PR title", "PR description", "One-paste PR bundle"]) {
    assert.match(r.stdout, new RegExp(fragment.replace(/[()]/g, "\\$&")),
      `out missing: ${fragment}`);
  }

  // 11. INDEX.md exists and is internally consistent
  const idx = await readJson(`${repo}/.ai/out/FEAT-001/index.json`);
  assert.ok(idx.artifacts.length >= 7,
    `expected ≥7 artifacts in index, got ${idx.artifacts.length}`);
});

test("[regression] documented quickstart works without a commit between accept and run", async () => {
  // This is exactly the regression Bug A from v0.1.2 fixed. Direct README/QUICKSTART
  // flow with NO manual commit between accept and run.
  runCli(repo, ["init"]);
  sh(repo, "git", ["add", "-A"]); sh(repo, "git", ["commit", "-q", "-m", "init"]);

  await commit(repo, { "src/x.js": "// @ai: TASK: thing\n" }, "marker");
  runCli(repo, ["ingest", "--paths", "src"]);
  runCli(repo, ["accept", "--all"]);
  // NO commit here — the dirty tree (rename from accept) should not block run
  const r = runCli(repo, ["run", "--ready", "--branch", "FEAT-001", "--base", "main"]);
  assert.equal(r.code, 0,
    `quickstart regressed: run failed after accept without intermediate commit. stderr: ${r.stderr}`);
});
