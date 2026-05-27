import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluatePolicy } from "../src/core/policy.js";

test("evaluatePolicy: null policy is ok", () => {
  const r = evaluatePolicy({ policy: null, directive: {}, touchedFiles: ["src/x.js"] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("evaluatePolicy: deny rule fires when touched_globs match", () => {
  const policy = {
    rules: [{ id: "no-env", when: { touched_globs: ["**/.env"] }, deny: { message: "no env" } }]
  };
  const r = evaluatePolicy({ policy, directive: { intent: "anything" }, touchedFiles: ["app/.env"] });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].rule_id, "no-env");
});

test("evaluatePolicy: deny rule skipped when touched_globs don't match", () => {
  const policy = {
    rules: [{ id: "no-env", when: { touched_globs: ["**/.env"] }, deny: { message: "no env" } }]
  };
  const r = evaluatePolicy({ policy, directive: { intent: "x" }, touchedFiles: ["src/app.js"] });
  assert.equal(r.ok, true);
});

test("evaluatePolicy: intent_keywords gate (case-insensitive)", () => {
  const policy = {
    rules: [{
      id: "auth-needs-test",
      when: { intent_keywords: ["auth"], touched_globs: ["src/**"] },
      require: { any_verify_checks: ["test"] }
    }]
  };
  const noVerify = evaluatePolicy({ policy, directive: { intent: "Fix AUTH bug" }, touchedFiles: ["src/login.js"] });
  assert.equal(noVerify.ok, false);

  const withVerify = evaluatePolicy({
    policy,
    directive: { intent: "Fix AUTH bug" },
    touchedFiles: ["src/login.js"],
    verifyMeta: { results: [{ name: "test", status: "ok" }] }
  });
  assert.equal(withVerify.ok, true);

  const wrongIntent = evaluatePolicy({ policy, directive: { intent: "refactor logging" }, touchedFiles: ["src/log.js"] });
  assert.equal(wrongIntent.ok, true);
});

test("evaluatePolicy: deny_if max_files_touched_over respects --force", () => {
  const policy = {
    rules: [{
      id: "big-diff",
      when: { always: true },
      deny_if: { max_files_touched_over: 2, message: "too many files" }
    }]
  };
  const touched = ["a.js", "b.js", "c.js", "d.js"];
  const blocked = evaluatePolicy({ policy, directive: {}, touchedFiles: touched });
  assert.equal(blocked.ok, false);

  const forced = evaluatePolicy({ policy, directive: {}, touchedFiles: touched, flags: { force: true } });
  assert.equal(forced.ok, true);
});
