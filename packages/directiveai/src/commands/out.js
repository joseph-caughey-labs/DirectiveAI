import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { aiRoot } from "../core/paths.js";
import { loadOutIndex } from "../core/outIndex.js";

export async function cmdOut({ branch, open = false }) {
  const root = process.cwd();
  const outDir = path.join(aiRoot(root), "out", branch);
  const idx = await loadOutIndex(outDir, branch);

  console.log(chalk.bold(`\nAI Output: ${branch}`));
  console.log(chalk.gray("—".repeat(48)));
  for (const a of idx.artifacts) {
    console.log(`- ${chalk.cyan(a.label || a.kind)}: ${chalk.gray(a.path)}`);
  }
  console.log("");

  if (open) {
    const p = outDir;
    const cmd = process.platform === "darwin" ? ["open", p]
      : process.platform === "win32" ? ["cmd", "/c", "start", "", p]
      : ["xdg-open", p];
    await execa(cmd[0], cmd.slice(1), { cwd: root });
  }
}
