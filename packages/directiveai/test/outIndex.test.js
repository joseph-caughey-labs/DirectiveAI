import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { addArtifact, loadOutIndex } from "../src/core/outIndex.js";

async function withTmp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-out-"));
  try { return await fn(dir); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("addArtifact: first artifact creates index", async () => {
  await withTmp(async (dir) => {
    await addArtifact(dir, "B", { kind: "k1", path: "p1", label: "L1" });
    const idx = await loadOutIndex(dir, "B");
    assert.equal(idx.artifacts.length, 1);
    assert.equal(idx.artifacts[0].path, "p1");
  });
});

test("addArtifact: two different paths share a kind — both kept", async () => {
  await withTmp(async (dir) => {
    await addArtifact(dir, "B", { kind: "verify_json", path: "verify.json", label: "v1" });
    await addArtifact(dir, "B", { kind: "verify_json", path: "verify-2.json", label: "v2" });
    const idx = await loadOutIndex(dir, "B");
    assert.equal(idx.artifacts.length, 2);
    assert.deepEqual(idx.artifacts.map(a => a.path).sort(), ["verify-2.json", "verify.json"]);
  });
});

test("addArtifact: re-adding same path replaces (last write wins)", async () => {
  await withTmp(async (dir) => {
    await addArtifact(dir, "B", { kind: "scope_violations", path: "scope.json", label: "first" });
    await addArtifact(dir, "B", { kind: "scope_violations", path: "scope.json", label: "forced" });
    const idx = await loadOutIndex(dir, "B");
    assert.equal(idx.artifacts.length, 1);
    assert.equal(idx.artifacts[0].label, "forced");
  });
});

test("addArtifact: writes both index.json and INDEX.md", async () => {
  await withTmp(async (dir) => {
    await addArtifact(dir, "FEAT-1", { kind: "k", path: "foo.json", label: "Foo" });
    const md = await fs.readFile(path.join(dir, "INDEX.md"), "utf8");
    assert.match(md, /AI Output — FEAT-1/);
    assert.match(md, /Foo/);
  });
});
