import chalk from "chalk";
import { execa } from "execa";

import { loadConfig } from "../core/config.js";
import { getTouchedFilesSinceBase } from "../core/gitTouched.js";
import { selectRunnerProfile } from "../core/runnerSelect.js";
import { buildRunnerCommand } from "../core/runnerCmd.js";

export async function cmdRunnerShip({ branch, baseBranch = null, profile = null }) {
  const root = process.cwd();
  const config = await loadConfig(root);

  const rcfg = config.runner || {};
  if (rcfg.enabled === false) {
    console.log(chalk.yellow("\nrunner disabled in .ai/config.yml\n"));
    return;
  }

  const base = baseBranch || config.ship?.base_branch || config.ci?.base_branch || "main";
  const { files } = await getTouchedFilesSinceBase(root, base, branch);

  const chosen = profile || await selectRunnerProfile({ root, config, changedFiles: files });
  const profCfg = rcfg.profiles?.[chosen];
  if (!profCfg) throw new Error(`Runner profile not configured: ${chosen}`);

  const image = profCfg.image;
  const action = `npx directiveai run --ready --branch ${branch}`;
  const cmd = buildRunnerCommand({ profileCfg: profCfg, actionCmd: action });

  console.log(chalk.bold(`\nRunner ship: ${branch}`));
  console.log(chalk.gray("—".repeat(48)));
  console.log(`profile: ${chalk.cyan(chosen)}`);
  console.log(`image:   ${chalk.cyan(image)}`);
  console.log("");

  await execa("bash", ["-lc", `AI_RUNNER_IMAGE="${image}" ./scripts/ai-runner.sh ${shellQuote(cmd)}`], { cwd: root, stdio: "inherit" });
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}
