import { minimatch } from "minimatch";

export function computePolicyVerifyPlan(policy, touchedFiles) {
  if (!policy?.rules?.length) return [];

  const cmds = [];
  const seen = new Set();

  for (const rule of policy.rules) {
    const when = rule.when || {};
    if (!Array.isArray(rule.verify_add) || rule.verify_add.length === 0) continue;
    if (!matchesTouched(when.touched_globs, touchedFiles)) continue;

    for (const c of rule.verify_add) {
      const key = c.name || c.cmd;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cmds.push({ name: c.name || key, cmd: c.cmd });
    }
  }

  return cmds;
}

function matchesTouched(globs, touchedFiles) {
  if (!Array.isArray(globs) || globs.length === 0) return true;
  return touchedFiles.some((f) => globs.some((g) => minimatch(f, g, { dot: true })));
}
