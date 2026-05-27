import fs from "node:fs/promises";
import path from "node:path";
import { minimatch } from "minimatch";

import { nowIso } from "./utils.js";

// Paths owned by DirectiveAI itself — never subject to user scope rules.
const SYSTEM_GLOBS = [".ai/**"];

export function extractScope(directives = []) {
  const allow = new Set();
  const deny = new Set();
  const sources = [];

  for (const d of directives) {
    const s = d?.scope;
    if (!s || typeof s !== "object") continue;
    const da = Array.isArray(s.allow) ? s.allow : [];
    const dd = Array.isArray(s.deny) ? s.deny : [];
    for (const g of da) if (typeof g === "string" && g.trim()) allow.add(g.trim());
    for (const g of dd) if (typeof g === "string" && g.trim()) deny.add(g.trim());
    if (da.length || dd.length) sources.push({ id: d.id, allow: da, deny: dd });
  }

  return {
    allow: [...allow],
    deny: [...deny],
    hasAllow: allow.size > 0,
    sources
  };
}

function matchesAny(file, globs) {
  return globs.some(g => minimatch(file, g, { dot: true }));
}

export function partitionTouched(touchedFiles = []) {
  const system = [];
  const user = [];
  for (const f of touchedFiles) {
    if (matchesAny(f, SYSTEM_GLOBS)) system.push(f);
    else user.push(f);
  }
  return { system, user };
}

export function checkScope(touchedFiles, scope) {
  const { user } = partitionTouched(touchedFiles);
  const violations = [];

  if (scope.hasAllow) {
    for (const f of user) {
      if (!matchesAny(f, scope.allow)) {
        violations.push({ file: f, reason: "outside_allow", at: nowIso() });
      }
    }
  }

  if (scope.deny.length) {
    for (const f of user) {
      if (matchesAny(f, scope.deny)) {
        violations.push({ file: f, reason: "matches_deny", at: nowIso() });
      }
    }
  }

  return { ok: violations.length === 0, violations, checkedFiles: user };
}

export async function writeScopeViolations(outDir, result, context = {}) {
  await fs.mkdir(outDir, { recursive: true });
  const fp = path.join(outDir, "scope.violations.json");
  const payload = {
    status: result.ok ? "ok" : "fail",
    violations: result.violations,
    context
  };
  await fs.writeFile(fp, JSON.stringify(payload, null, 2), "utf8");
  return fp;
}
