import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { loadConfig } from "../core/config.js";

export async function cmdCiExport() {
  const root = process.cwd();
  const cfg = await loadConfig(root);

  if (cfg?.ci?.enabled === false) {
    console.log(chalk.yellow("\nCI export disabled in .ai/config.yml\n"));
    return;
  }

  const provider = cfg?.ci?.provider || "github";
  if (provider !== "github") {
    console.log(chalk.yellow(`\nOnly github provider scaffolded right now (got: ${provider})\n`));
    return;
  }

  const node = cfg?.ci?.node_version || "20";
  const install = cfg?.ci?.install_cmd || "npm ci";

  const yml = `name: DirectiveAI\n\non:\n  pull_request:\n  push:\n    branches: [main]\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '${node}'\n      - name: Install\n        run: ${install}\n      - name: Doctor\n        run: npx directiveai doctor\n      - name: Verify\n        run: npx directiveai verify-auto \${{ github.head_ref || github.ref_name }}\n`;

  const outDir = path.join(root, ".github", "workflows");
  await fs.mkdir(outDir, { recursive: true });
  const fp = path.join(outDir, "directiveai.yml");
  await fs.writeFile(fp, yml, "utf8");

  console.log(chalk.green(`\nWrote ${path.relative(root, fp)}\n`));
}
