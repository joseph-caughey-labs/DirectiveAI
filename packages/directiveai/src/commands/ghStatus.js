import chalk from "chalk";
import { ghAvailable, ghAuthed, ghRepoInfo } from "../core/gh.js";

export async function cmdGhStatus() {
  const ok = await ghAvailable();
  if (!ok) {
    console.log(chalk.red("\nGitHub CLI (gh) not found. Install: https://cli.github.com\n"));
    process.exitCode = 1;
    return;
  }

  const authed = await ghAuthed();
  if (!authed) {
    console.log(chalk.yellow("\nGitHub CLI found, but not authenticated. Run: gh auth login\n"));
    process.exitCode = 1;
    return;
  }

  const repo = await ghRepoInfo();
  console.log(chalk.green("\nGitHub CLI OK\n"));
  if (repo) console.log(`Repo: ${repo.owner?.login}/${repo.name}\n`);
}
