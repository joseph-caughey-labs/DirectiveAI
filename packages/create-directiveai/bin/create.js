#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

const root = process.cwd();
const tpl = path.join(new URL("../templates/", import.meta.url).pathname);

async function main() {
  const target = root;
  await copyDir(tpl, target);
  console.log(chalk.green("\nDirectiveAI scaffold copied into this repo.\n"));
  console.log(chalk.gray("Next:"));
  console.log("  npx directiveai doctor");
  console.log("");
}

async function copyDir(src, dst) {
  const ents = await fs.readdir(src, { withFileTypes: true });
  for (const e of ents) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      await fs.mkdir(d, { recursive: true });
      await copyDir(s, d);
    } else {
      // do not overwrite if file exists
      try {
        await fs.access(d);
        continue;
      } catch {}
      await fs.mkdir(path.dirname(d), { recursive: true });
      await fs.copyFile(s, d);
    }
  }
}

main().catch((e) => {
  console.error(chalk.red(e?.message || String(e)));
  process.exit(1);
});
