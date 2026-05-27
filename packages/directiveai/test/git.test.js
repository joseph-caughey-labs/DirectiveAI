import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

import { ensureClean } from "../src/core/git.js";

async function git(cwd, args) {
  await execa("git", args, { cwd });
}

async function withRepo(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-git-"));
  await git(dir, ["init", "-q"]);
  await git(dir, ["config", "user.email", "t@t.t"]);
  await git(dir, ["config", "user.name", "T"]);
  await git(dir, ["checkout", "-q", "-b", "main"]);
  await fs.writeFile(path.join(dir, "README.md"), "x");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "init"]);
  try { return await fn(dir); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("ensureClean: true on a clean tree", async () => {
  await withRepo(async (dir) => {
    assert.equal(await ensureClean(dir), true);
  });
});

test("ensureClean: false when user code has uncommitted changes", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(path.join(dir, "src/app.js"), "x");
    assert.equal(await ensureClean(dir), false);
  });
});

test("ensureClean: true when ONLY .ai/directives/ changes are uncommitted", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/directives/ready"), { recursive: true });
    await fs.writeFile(path.join(dir, ".ai/directives/ready/d.json"), "{}");
    assert.equal(await ensureClean(dir), true);
  });
});

test("ensureClean: true when ONLY .ai/out/ changes are uncommitted", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/out/FEAT-1"), { recursive: true });
    await fs.writeFile(path.join(dir, ".ai/out/FEAT-1/applied.txt"), "x");
    assert.equal(await ensureClean(dir), true);
  });
});

test("ensureClean: false when user changes coexist with .ai/ changes", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/directives/ready"), { recursive: true });
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(path.join(dir, ".ai/directives/ready/d.json"), "{}");
    await fs.writeFile(path.join(dir, "src/app.js"), "x");
    assert.equal(await ensureClean(dir), false);
  });
});

test("ensureClean: .ai/config.yml changes still count (user file)", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai"), { recursive: true });
    await fs.writeFile(path.join(dir, ".ai/config.yml"), "version: 1");
    assert.equal(await ensureClean(dir), false);
  });
});

test("ensureClean: handles renamed-tracked .ai/directives files", async () => {
  await withRepo(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/directives/pending"), { recursive: true });
    await fs.writeFile(path.join(dir, ".ai/directives/pending/d.json"), "{}");
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-q", "-m", "directive"]);

    // Simulate accept: rename pending → ready
    await fs.mkdir(path.join(dir, ".ai/directives/ready"), { recursive: true });
    await fs.rename(
      path.join(dir, ".ai/directives/pending/d.json"),
      path.join(dir, ".ai/directives/ready/d.json")
    );

    // git sees this as a rename; ensureClean should ignore it.
    assert.equal(await ensureClean(dir), true);
  });
});
