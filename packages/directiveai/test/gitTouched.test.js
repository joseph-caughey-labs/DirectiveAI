import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

import { getTouchedFilesSinceBase } from "../src/core/gitTouched.js";

async function git(cwd, args) {
  await execa("git", args, { cwd });
}

async function withRepo(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-gt-"));
  await git(dir, ["init", "-q"]);
  await git(dir, ["config", "user.email", "t@t.t"]);
  await git(dir, ["config", "user.name", "T"]);
  await git(dir, ["checkout", "-q", "-b", "main"]);
  await fs.writeFile(path.join(dir, "base.txt"), "base");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "init"]);
  try { return await fn(dir); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("getTouchedFilesSinceBase: returns files changed on the named branch vs. base, regardless of HEAD", async () => {
  await withRepo(async (dir) => {
    await git(dir, ["checkout", "-q", "-b", "feature"]);
    await fs.writeFile(path.join(dir, "added-on-feature.txt"), "x");
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-q", "-m", "feature work"]);

    // Switch HEAD AWAY from the branch we want to inspect — this is what
    // exposed the prior bug where the function hardcoded "HEAD".
    await git(dir, ["checkout", "-q", "main"]);

    const r = await getTouchedFilesSinceBase(dir, "main", "feature");
    assert.deepEqual(r.files, ["added-on-feature.txt"]);
    assert.equal(typeof r.merge_base, "string");
    assert.ok(r.merge_base.length > 0);
  });
});

test("getTouchedFilesSinceBase: empty when branch has no commits ahead of base", async () => {
  await withRepo(async (dir) => {
    await git(dir, ["checkout", "-q", "-b", "feature"]);
    // No commits on feature.
    await git(dir, ["checkout", "-q", "main"]);
    const r = await getTouchedFilesSinceBase(dir, "main", "feature");
    assert.deepEqual(r.files, []);
  });
});
