import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { loadConfig } from "../core/config.js";
import { aiRoot } from "../core/paths.js";
import { ghAvailable, ghAuthed } from "../core/gh.js";
import { pushBranch, hasRemote } from "../core/gitInfo.js";

export async function cmdGhPr({ branch, baseBranch = null, draft = null }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const ghCfg = cfg?.github || {};

  if (!(await ghAvailable())) throw new Error("gh not found on PATH");
  if (!(await ghAuthed())) throw new Error("gh not authenticated. Run: gh auth login");

  const base = baseBranch || ghCfg.base_branch || "main";
  const outDir = path.join(aiRoot(root), "out", branch);

  const titleFp = path.join(outDir, "PR_TITLE.txt");
  const bodyFp = path.join(outDir, "PR_BODY.md");

  const title = (await fs.readFile(titleFp, "utf8")).trim();
  const body = await fs.readFile(bodyFp, "utf8");

  const shouldPush = ghCfg.auto_push !== false;
  const remote = ghCfg.remote || "origin";

  if (shouldPush) {
    if (!(await hasRemote(root, remote))) throw new Error(`Remote '${remote}' not found.`);
    await pushBranch(root, branch, remote);
    console.log(chalk.gray(`Pushed ${branch} to ${remote}`));
  }

  const draftFlag = draft === null ? (ghCfg.draft !== false) : draft;

  const args = ["pr", "create", "--title", title, "--body", body, "--base", base, "--head", branch];
  if (draftFlag) args.push("--draft");

  // labels, reviewers, assignees
  if (Array.isArray(ghCfg.labels) && ghCfg.labels.length) {
    for (const l of ghCfg.labels) args.push("--label", String(l));
  }
  if (Array.isArray(ghCfg.reviewers) && ghCfg.reviewers.length) {
    for (const r of ghCfg.reviewers) args.push("--reviewer", String(r));
  }
  if (Array.isArray(ghCfg.assignees) && ghCfg.assignees.length) {
    for (const a of ghCfg.assignees) args.push("--assignee", String(a));
  }

  const res = await execa("gh", args, { cwd: root, reject: false });
  if (res.exitCode !== 0) {
    console.log(chalk.red("\nFailed to create PR via gh. Output:\n"));
    console.log(res.stdout || res.stderr);
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green("\nPR created.\n"));
  console.log(res.stdout.trim() + "\n");
}
