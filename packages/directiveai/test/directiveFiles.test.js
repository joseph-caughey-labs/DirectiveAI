import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { isDirectiveFile, filterDirectiveFiles, readDirectiveFile } from "../src/core/directiveFiles.js";

test("isDirectiveFile: known extensions", () => {
  assert.equal(isDirectiveFile("a.json"), true);
  assert.equal(isDirectiveFile("a.yaml"), true);
  assert.equal(isDirectiveFile("a.yml"), true);
  assert.equal(isDirectiveFile("a.md"), true);
  assert.equal(isDirectiveFile("a.txt"), false);
  assert.equal(isDirectiveFile("README"), false);
});

test("filterDirectiveFiles: filters list", () => {
  assert.deepEqual(
    filterDirectiveFiles(["a.json", "b.txt", "c.yml", ".DS_Store"]),
    ["a.json", "c.yml"]
  );
});

async function withTmp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-test-"));
  try { return await fn(dir); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("readDirectiveFile: parses JSON", async () => {
  await withTmp(async (dir) => {
    const fp = path.join(dir, "d.json");
    await fs.writeFile(fp, JSON.stringify({ id: "X", title: "T" }));
    const doc = await readDirectiveFile(fp);
    assert.equal(doc.id, "X");
    assert.equal(doc.title, "T");
  });
});

test("readDirectiveFile: parses YAML", async () => {
  await withTmp(async (dir) => {
    const fp = path.join(dir, "d.yml");
    await fs.writeFile(fp, "id: Y\ntitle: yamltitle\n");
    const doc = await readDirectiveFile(fp);
    assert.equal(doc.id, "Y");
    assert.equal(doc.title, "yamltitle");
  });
});

test("readDirectiveFile: parses markdown frontmatter", async () => {
  await withTmp(async (dir) => {
    const fp = path.join(dir, "d.md");
    await fs.writeFile(fp, "---\nid: M\ntitle: mdtitle\n---\n\nbody text\n");
    const doc = await readDirectiveFile(fp);
    assert.equal(doc.id, "M");
    assert.equal(doc.title, "mdtitle");
  });
});

test("readDirectiveFile: markdown without frontmatter throws", async () => {
  await withTmp(async (dir) => {
    const fp = path.join(dir, "d.md");
    await fs.writeFile(fp, "no frontmatter here\n");
    await assert.rejects(() => readDirectiveFile(fp), /Missing YAML frontmatter|Failed to parse directive/);
  });
});

test("readDirectiveFile: invalid JSON throws with file name", async () => {
  await withTmp(async (dir) => {
    const fp = path.join(dir, "bad.json");
    await fs.writeFile(fp, "{ not json");
    await assert.rejects(() => readDirectiveFile(fp), /Failed to parse directive bad\.json/);
  });
});
