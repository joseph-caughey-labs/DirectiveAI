#!/usr/bin/env node

import { Command } from "commander";

import { cmdInit } from "../src/commands/init.js";
import { cmdDoctor } from "../src/commands/doctor.js";
import { cmdIngest } from "../src/commands/ingest.js";
import { cmdAccept } from "../src/commands/accept.js";
import { cmdRun } from "../src/commands/run.js";
import { cmdVerify } from "../src/commands/verify.js";
import { cmdVerifyAuto } from "../src/commands/verifyAuto.js";
import { cmdReview } from "../src/commands/review.js";
import { cmdNotes } from "../src/commands/notes.js";
import { cmdPr } from "../src/commands/pr.js";
import { cmdCiExport } from "../src/commands/ciExport.js";
import { cmdOut } from "../src/commands/out.js";
import { cmdGhStatus } from "../src/commands/ghStatus.js";
import { cmdGhPr } from "../src/commands/ghPr.js";
import { cmdRunnerExport } from "../src/commands/runnerExport.js";
import { cmdRunnerShip } from "../src/commands/runnerShip.js";

const program = new Command();

program
  .name("directiveai")
  .description("DirectiveAI — compile repo directives into safe Git branches")
  .version("0.1.4");

program
  .command("init")
  .description("Initialize .ai/ in the current repo")
  .option("--force", "Overwrite existing .ai files")
  .action((opts) => cmdInit({ force: !!opts.force }));

program
  .command("doctor")
  .description("Validate DirectiveAI setup")
  .action(() => cmdDoctor());

program
  .command("ingest")
  .description("Scan repo for inline directive markers and write directive files")
  .option("--paths <paths>", "Comma-separated path roots to scan", "src,functions")
  .action((opts) => cmdIngest({ paths: opts.paths }));

program
  .command("accept")
  .description("Move pending directives to ready")
  .option("--all", "Accept all pending directives")
  .option("--id <id>", "Accept one directive id")
  .action((opts) => cmdAccept({ all: !!opts.all, id: opts.id || null }));

program
  .command("run")
  .description("Apply ready directives to a branch")
  .option("--ready", "Run all directives in ready")
  .option("--id <id>", "Run one directive id")
  .option("--branch <branch>", "Target branch name")
  .option("--base <branch>", "Base branch")
  .option("--force", "Bypass some safety limits")
  .action((opts) => cmdRun({
    ready: !!opts.ready,
    id: opts.id || null,
    branch: opts.branch || null,
    baseBranch: opts.base || null,
    force: !!opts.force
  }));

program
  .command("verify")
  .description("Run configured verification commands")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .action((branch, opts) => cmdVerify({ branch, baseBranch: opts.base || null }));

program
  .command("verify-auto")
  .description("Run verification commands selected automatically by policy based on changed files")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .action((branch, opts) => cmdVerifyAuto({ branch, baseBranch: opts.base || null }));

program
  .command("review")
  .description("Run multi-agent review on a branch")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .option("--force", "Bypass policy max-file limits")
  .action((branch, opts) => cmdReview({ branch, baseBranch: opts.base || null, force: !!opts.force }));

program
  .command("notes")
  .description("Generate release notes for a branch")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .action((branch, opts) => cmdNotes({ branch, baseBranch: opts.base || null }));

program
  .command("pr")
  .description("Generate PR artifacts for a branch")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .action((branch, opts) => cmdPr({ branch, baseBranch: opts.base || null }));

program
  .command("ci-export")
  .description("Generate CI workflow/scripts from .ai config/policy")
  .action(() => cmdCiExport());

program
  .command("out")
  .description("Show generated artifacts for a branch")
  .argument("<branch>")
  .option("--open", "Open output folder")
  .action((branch, opts) => cmdOut({ branch, open: !!opts.open }));

program
  .command("gh-status")
  .description("Check GitHub CLI availability/auth")
  .action(() => cmdGhStatus());

program
  .command("gh-pr")
  .description("Create a GitHub PR using generated PR artifacts")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .option("--draft", "Create draft PR")
  .option("--no-draft", "Create non-draft PR")
  .action((branch, opts) => cmdGhPr({
    branch,
    baseBranch: opts.base || null,
    draft: opts.draft === true ? true : (opts.noDraft === true ? false : null)
  }));

program
  .command("runner-export")
  .description("Generate Docker runner files")
  .option("--force", "Overwrite existing runner files")
  .action((opts) => cmdRunnerExport({ force: !!opts.force }));

program
  .command("runner-ship")
  .alias("ship")
  .description("Run `ship` inside Docker with auto-selected runner profile")
  .argument("<branch>")
  .option("--base <branch>", "Base branch")
  .option("--profile <name>", "Force a runner profile")
  .action((branch, opts) => cmdRunnerShip({ branch, baseBranch: opts.base || null, profile: opts.profile || null }));

program.parse(process.argv);
