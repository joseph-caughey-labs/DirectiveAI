import { test } from "node:test";
import assert from "node:assert/strict";

import { extractScope, checkScope, partitionTouched } from "../src/core/scope.js";

test("extractScope: empty when no directives have scope", () => {
  const s = extractScope([{ id: "a" }, { id: "b", scope: null }]);
  assert.equal(s.hasAllow, false);
  assert.deepEqual(s.allow, []);
  assert.deepEqual(s.deny, []);
});

test("extractScope: unions allow + deny across directives, dedups", () => {
  const s = extractScope([
    { id: "a", scope: { allow: ["src/**"], deny: ["**/*.env"] } },
    { id: "b", scope: { allow: ["src/**", "lib/**"] } },
    { id: "c", scope: { deny: ["**/*.env", "**/secret.*"] } }
  ]);
  assert.deepEqual(s.allow.sort(), ["lib/**", "src/**"]);
  assert.deepEqual(s.deny.sort(), ["**/*.env", "**/secret.*"]);
  assert.equal(s.hasAllow, true);
  assert.equal(s.sources.length, 3);
});

test("extractScope: skips non-string and empty glob entries", () => {
  const s = extractScope([
    { id: "a", scope: { allow: ["src/**", "", 42, null, "  "] } }
  ]);
  assert.deepEqual(s.allow, ["src/**"]);
});

test("partitionTouched: separates .ai/** from user files", () => {
  const { system, user } = partitionTouched([
    ".ai/out/FEAT-1/x.json",
    "src/foo.js",
    ".ai/directives/done/d.json",
    "lib/bar.js"
  ]);
  assert.deepEqual(system.sort(), [".ai/directives/done/d.json", ".ai/out/FEAT-1/x.json"]);
  assert.deepEqual(user.sort(), ["lib/bar.js", "src/foo.js"]);
});

test("checkScope: no scope = ok regardless of files", () => {
  const r = checkScope(["src/anything.js", "literally/whatever.txt"], extractScope([]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("checkScope: allow as whitelist — out-of-scope file flagged", () => {
  const scope = extractScope([{ id: "a", scope: { allow: ["src/components/**"] } }]);
  const r = checkScope(["src/components/x.js", "src/other.js"], scope);
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].file, "src/other.js");
  assert.equal(r.violations[0].reason, "outside_allow");
});

test("checkScope: deny flags even when allow matches", () => {
  const scope = extractScope([{ id: "a", scope: { allow: ["**"], deny: ["**/*.env"] } }]);
  const r = checkScope(["src/.env", "src/app.js"], scope);
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].file, "src/.env");
  assert.equal(r.violations[0].reason, "matches_deny");
});

test("checkScope: .ai/** files are exempt from scope rules", () => {
  const scope = extractScope([{ id: "a", scope: { allow: ["src/**"] } }]);
  const r = checkScope([".ai/out/FEAT-1/applied.txt", "src/x.js"], scope);
  assert.equal(r.ok, true);
  assert.deepEqual(r.checkedFiles, ["src/x.js"]);
});

test("checkScope: deny-only scope (no allow) still enforces deny", () => {
  const scope = extractScope([{ id: "a", scope: { deny: ["**/secret.*"] } }]);
  assert.equal(scope.hasAllow, false);
  const r = checkScope(["src/secret.key", "src/ok.js"], scope);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].file, "src/secret.key");
});
