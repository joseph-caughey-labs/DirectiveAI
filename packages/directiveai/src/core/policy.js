import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { minimatch } from "minimatch";

import { aiRoot } from "./paths.js";
import { fileExists, nowIso } from "./utils.js";

export async function loadPolicy(root) {
  const fp = path.join(aiRoot(root), "policy.yml");
  if (!(await fileExists(fp))) return null;
  const raw = await fs.readFile(fp, "utf8");
  return yaml.load(raw) || null;
}

export function evaluatePolicy({ policy, directive, touchedFiles = [], verifyMeta = null, flags = {} }) {
  if (!policy) return { ok: true, violations: [] };

  const violations = [];
  const intent = String(directive?.intent || "").toLowerCase();
  const fileCount = touchedFiles.length;
  const verifyChecksOk = new Set(
    (verifyMeta?.results || []).filter(r => r.status === "ok").map(r => r.name)
  );

  for (const rule of (policy.rules || [])) {
    if (!matchesWhen(rule.when || {}, { intent, touchedFiles })) continue;

    if (rule.deny) {
      violations.push(vio(rule, rule.deny.message || "Denied by policy."));
      continue;
    }

    if (rule.deny_if?.max_files_touched_over != null) {
      const lim = Number(rule.deny_if.max_files_touched_over);
      if (fileCount > lim && !flags.force) {
        violations.push(vio(rule, rule.deny_if.message || `Touched ${fileCount} files > ${lim}.`));
        continue;
      }
    }

    if (rule.require?.any_verify_checks?.length) {
      const required = rule.require.any_verify_checks;
      const satisfied = required.some((name) => verifyChecksOk.has(name));
      if (!satisfied) {
        violations.push(vio(rule, rule.require.message || `Requires verify checks: ${required.join(", ")}`));
        continue;
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

function matchesWhen(when, ctx) {
  if (when.always) return true;

  if (Array.isArray(when.intent_keywords) && when.intent_keywords.length) {
    const hit = when.intent_keywords.some((k) => ctx.intent.includes(String(k).toLowerCase()));
    if (!hit) return false;
  }

  if (Array.isArray(when.touched_globs) && when.touched_globs.length) {
    const anyTouched = ctx.touchedFiles.some((f) =>
      when.touched_globs.some((g) => minimatch(f, g, { dot: true }))
    );
    if (!anyTouched) return false;
  }

  return true;
}

function vio(rule, message) {
  return { rule_id: rule.id || "(unknown)", message, at: nowIso() };
}

export async function writePolicyViolations(outDir, directiveId, result, context = {}) {
  await fs.mkdir(outDir, { recursive: true });
  const fp = path.join(outDir, "policy.violations.json");
  const payload = {
    id: directiveId,
    status: result.ok ? "ok" : "fail",
    violations: result.violations,
    context
  };
  await fs.writeFile(fp, JSON.stringify(payload, null, 2), "utf8");
  return fp;
}
