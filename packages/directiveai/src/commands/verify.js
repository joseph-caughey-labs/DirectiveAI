import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { loadConfig } from "../core/config.js";
import { aiRoot } from "../core/paths.js";
import { nowIso, safeJson } from "../core/utils.js";
import { addArtifact } from "../core/outIndex.js";

export async function cmdVerify({ branch, baseBranch = null }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const commands = cfg?.verify?.commands || [];

  const outDir = path.join(aiRoot(root), "out", branch);
  await fs.mkdir(outDir, { recursive: true });

  const results = [];
  for (const c of commands) {
    const name = c.name || c.cmd;
    if (!c.cmd) continue;
    console.log(chalk.gray(`Running: ${name}`));

    const r = await execa("bash", ["-lc", c.cmd], { cwd: root, reject: false });
    results.push({ name, cmd: c.cmd, status: r.exitCode === 0 ? "ok" : "fail", exitCode: r.exitCode });

    if (r.exitCode !== 0) {
      console.log(chalk.red(`✖ ${name} failed`));
    } else {
      console.log(chalk.green(`✔ ${name} ok`));
    }
  }

  const meta = {
    branch,
    base: baseBranch,
    ran_at: nowIso(),
    status: results.every(r => r.status === "ok") ? "ok" : "fail",
    results
  };

  await fs.writeFile(path.join(outDir, "verify.json"), safeJson(meta), "utf8");
  await fs.writeFile(path.join(outDir, "VERIFY.md"), renderMd(meta), "utf8");

  await addArtifact(outDir, branch, { kind: "verify_json", path: `.ai/out/${branch}/verify.json`, label: "Verification results (json)" });
  await addArtifact(outDir, branch, { kind: "verify_md", path: `.ai/out/${branch}/VERIFY.md`, label: "Verification report" });

  if (meta.status !== "ok") process.exitCode = 1;
}

function renderMd(meta) {
  const lines = [];
  lines.push(`# Verify — ${meta.branch}`);
  lines.push("");
  lines.push(`Status: **${meta.status.toUpperCase()}**`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  for (const r of meta.results) {
    lines.push(`- **${r.name}** — ${r.status}`);
  }
  lines.push("");
  return lines.join("\n");
}
