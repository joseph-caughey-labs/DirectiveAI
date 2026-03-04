import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { loadConfig } from "../core/config.js";
import { loadPolicy } from "../core/policy.js";
import { aiRoot } from "../core/paths.js";
import { nowIso, safeJson } from "../core/utils.js";
import { mergeBase, diffNameOnly } from "../core/git.js";
import { computePolicyVerifyPlan } from "../core/policyVerifyPlan.js";
import { addArtifact } from "../core/outIndex.js";

export async function cmdVerifyAuto({ branch, baseBranch = null }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const policy = await loadPolicy(root);

  const branchName = branch || (await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root })).stdout.trim();

  const base = baseBranch || cfg?.ci?.base_branch || "main";
  const mb = await mergeBase(root, base, "HEAD");
  const touched = await diffNameOnly(root, mb, "HEAD");

  const baseCmds = cfg?.verify?.commands || [];
  const policyAdds = computePolicyVerifyPlan(policy, touched);

  const merged = [...baseCmds, ...policyAdds];

  if (!branchName) throw new Error("Branch name could not be determined.");

  const outDir = path.join(aiRoot(root), "out", branchName);
  await fs.mkdir(outDir, { recursive: true });

  const results = [];
  for (const c of merged) {
    const name = c.name || c.cmd;
    if (!c.cmd) continue;

    console.log(chalk.gray(`Running: ${name}`));
    const r = await execa("bash", ["-lc", c.cmd], { cwd: root, reject: false });
    results.push({ name, cmd: c.cmd, status: r.exitCode === 0 ? "ok" : "fail", exitCode: r.exitCode });
    console.log(r.exitCode === 0 ? chalk.green(`✔ ${name} ok`) : chalk.red(`✖ ${name} failed`));
  }

  const meta = {
    branch: branchName,
    base,
    merge_base: mb,
    touched_files: touched,
    ran_at: nowIso(),
    status: results.every(r => r.status === "ok") ? "ok" : "fail",
    results
  };

  await fs.writeFile(path.join(outDir, "verify.json"), safeJson(meta), "utf8");
  await fs.writeFile(path.join(outDir, "VERIFY.md"), renderMd(meta), "utf8");

  await addArtifact(outDir, branchName, { kind: "verify_json", path: `.ai/out/${branchName}/verify.json`, label: "Verification results (json)" });
  await addArtifact(outDir, branchName, { kind: "verify_md", path: `.ai/out/${branchName}/VERIFY.md`, label: "Verification report" });

  if (meta.status !== "ok") process.exitCode = 1;
}

function renderMd(meta) {
  const lines = [];
  lines.push(`# Verify Auto — ${meta.branch}`);
  lines.push("");
  lines.push(`Status: **${meta.status.toUpperCase()}**`);
  lines.push("");
  lines.push("## Touched files");
  lines.push("");
  for (const f of meta.touched_files.slice(0, 100)) lines.push(`- ${f}`);
  if (meta.touched_files.length > 100) lines.push(`- ...and ${meta.touched_files.length - 100} more`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  for (const r of meta.results) lines.push(`- **${r.name}** — ${r.status}`);
  lines.push("");
  return lines.join("\n");
}
