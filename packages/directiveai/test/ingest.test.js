import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseMarker, cmdIngest } from "../src/commands/ingest.js";

test("parseMarker: bare title", () => {
  const r = parseMarker(" Improve error handling around file upload");
  assert.equal(r.title, "Improve error handling around file upload");
  assert.equal(r.intent, "");
  assert.equal(r.priority, "med");
});

test("parseMarker: TASK: prefix is stripped", () => {
  const r = parseMarker(" TASK: Fix auth redirect loop");
  assert.equal(r.title, "Fix auth redirect loop");
});

test("parseMarker: TODO/NOTE/FIXME prefixes stripped, case-insensitive", () => {
  assert.equal(parseMarker(" todo: do thing").title, "do thing");
  assert.equal(parseMarker(" NOTE: jot").title, "jot");
  assert.equal(parseMarker(" Fixme: x").title, "x");
});

test("parseMarker: [intent=bugfix][prio=high] extracted", () => {
  const r = parseMarker(" [intent=bugfix][prio=high] TASK: Fix auth redirect loop");
  assert.equal(r.intent, "bugfix");
  assert.equal(r.priority, "high");
  assert.equal(r.title, "Fix auth redirect loop");
});

test("parseMarker: [priority=...] also works (full word)", () => {
  const r = parseMarker(" [priority=low] do thing");
  assert.equal(r.priority, "low");
});

test("parseMarker: keys are lowercased", () => {
  const r = parseMarker(" [INTENT=feature] hero layout");
  assert.equal(r.intent, "feature");
});

test("parseMarker: empty input → Untitled directive, default priority", () => {
  const r = parseMarker("");
  assert.equal(r.title, "Untitled directive");
  assert.equal(r.priority, "med");
});

test("parseMarker: brackets with no recognized key still strip", () => {
  const r = parseMarker(" [owner=joey] hero layout");
  assert.equal(r.title, "hero layout");
  assert.equal(r.intent, "");
});

async function withTmp(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-ingest-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try { return await fn(dir); }
  finally { process.chdir(cwd); await fs.rm(dir, { recursive: true, force: true }); }
}

test("cmdIngest: dedups by source {file, line} on subsequent runs", async () => {
  await withTmp(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/directives/pending"), { recursive: true });
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "src/foo.js"),
      "// @ai: TASK: do A\nconst x = 1;\n// @ai: [intent=bugfix] fix B\n"
    );

    await cmdIngest({ paths: "src" });
    const first = (await fs.readdir(path.join(dir, ".ai/directives/pending"))).filter(n => n.endsWith(".json"));
    assert.equal(first.length, 2, "first run should create 2 directives");

    await cmdIngest({ paths: "src" });
    const second = (await fs.readdir(path.join(dir, ".ai/directives/pending"))).filter(n => n.endsWith(".json"));
    assert.equal(second.length, 2, "second run should not duplicate");

    const docs = await Promise.all(second.map(n =>
      fs.readFile(path.join(dir, ".ai/directives/pending", n), "utf8").then(JSON.parse)
    ));
    const titles = docs.map(d => d.title).sort();
    assert.deepEqual(titles, ["do A", "fix B"]);
    const bugfix = docs.find(d => d.title === "fix B");
    assert.equal(bugfix.intent, "bugfix");
  });
});

test("cmdIngest: dedup also considers ready/ and done/", async () => {
  await withTmp(async (dir) => {
    await fs.mkdir(path.join(dir, ".ai/directives/pending"), { recursive: true });
    await fs.mkdir(path.join(dir, ".ai/directives/done"), { recursive: true });
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(path.join(dir, "src/x.js"), "// @ai: TASK: existing\n");

    // Pre-existing done directive at the same source location.
    await fs.writeFile(
      path.join(dir, ".ai/directives/done/old.json"),
      JSON.stringify({ id: "old", title: "existing", source: { file: "src/x.js", line: 1 } })
    );

    await cmdIngest({ paths: "src" });
    const pending = (await fs.readdir(path.join(dir, ".ai/directives/pending"))).filter(n => n.endsWith(".json"));
    assert.equal(pending.length, 0, "should not re-ingest a marker already represented in done/");
  });
});
