import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import yaml from "js-yaml";
import { execa } from "execa";

import { fileExists } from "../core/utils.js";
import { aiRoot } from "../core/paths.js";

export async function cmdDoctor() {
  const root = process.cwd();
  const issues = [];
  const warns = [];

  try {
    const r = await execa("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, reject: false });
    if (r.exitCode !== 0) issues.push("Not inside a git repository.");
  } catch {
    issues.push("git not available on PATH.");
  }

  const aiDir = aiRoot(root);
  if (!(await fileExists(aiDir))) issues.push(".ai/ folder missing (run: directiveai init)");

  for (const fpRel of [".ai/config.yml", ".ai/policy.yml"]) {
    const fp = path.join(root, fpRel);
    if (!(await fileExists(fp))) {
      warns.push(`${fpRel} missing (run: directiveai init)`);
      continue;
    }
    try {
      yaml.load(await fs.readFile(fp, "utf8"));
    } catch {
      issues.push(`${fpRel} is invalid YAML.`);
    }
  }

  for (const d of [".ai/directives/pending", ".ai/directives/ready", ".ai/out"]) {
    if (!(await fileExists(path.join(root, d)))) warns.push(`Missing folder: ${d}`);
  }

  const gi = path.join(root, ".gitignore");
  if (await fileExists(gi)) {
    const txt = await fs.readFile(gi, "utf8");
    if (!txt.includes(".ai/out/")) warns.push("Consider adding .ai/out/ to .gitignore");
  } else {
    warns.push(".gitignore missing");
  }

  console.log(chalk.bold("\nDirectiveAI Doctor"));
  console.log(chalk.gray("—".repeat(48)));

  if (!issues.length && !warns.length) {
    console.log(chalk.green("All good.\n"));
    return;
  }

  for (const i of issues) console.log(chalk.red(`✖ ${i}`));
  for (const w of warns) console.log(chalk.yellow(`⚠ ${w}`));
  console.log("");

  if (issues.length) process.exitCode = 1;
}
