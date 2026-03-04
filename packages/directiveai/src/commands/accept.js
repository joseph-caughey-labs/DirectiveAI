import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { aiRoot } from "../core/paths.js";
import { fileExists } from "../core/utils.js";
import { filterDirectiveFiles } from "../core/directiveFiles.js";

export async function cmdAccept({ all = false, id = null }) {
  const root = process.cwd();
  const pendingDir = path.join(aiRoot(root), "directives", "pending");
  const readyDir = path.join(aiRoot(root), "directives", "ready");
  await fs.mkdir(readyDir, { recursive: true });

  if (!(await fileExists(pendingDir))) {
    console.log(chalk.yellow("\nNo pending directives folder found.\n"));
    return;
  }

  const files = filterDirectiveFiles(await fs.readdir(pendingDir));
  const pick = all ? files : (id ? files.filter(f => f.startsWith(id)) : []);

  if (!pick.length) {
    console.log(chalk.yellow("\nNo directives selected. Use --all or --id <id>.\n"));
    return;
  }

  for (const f of pick) {
    const src = path.join(pendingDir, f);
    const dst = path.join(readyDir, f);
    await fs.rename(src, dst);
  }

  console.log(chalk.green(`\nAccepted ${pick.length} directive(s) to ready.\n`));
}
