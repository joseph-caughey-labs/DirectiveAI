import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { aiRoot } from "../core/paths.js";
import { nowIso, safeJson } from "../core/utils.js";
import { loadPolicy, evaluatePolicy } from "../core/policy.js";
import { loadVerifyMeta } from "../core/verifyLoad.js";
import { loadConfig } from "../core/config.js";
import { mergeBase, diffNameOnly, diffText, diffStat } from "../core/git.js";
import { addArtifact } from "../core/outIndex.js";

// Review is shipped as deterministic local analysis agents (no model calls).
// You can add LLM review later behind explicit flags/config.

export async function cmdReview({ branch, baseBranch = null, force = false }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const policy = await loadPolicy(root);

  const currentBranch = (await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root })).stdout.trim();
  const branchName = branch || currentBranch;
  if (!branchName) throw new Error("Branch name could not be determined.");
  if (branch && branch !== currentBranch) {
    throw new Error(`Checked out ${currentBranch} but --branch ${branch}. Checkout the target branch or drop --branch.`);
  }

  const base = baseBranch || cfg?.review?.base_branch || "main";
  const mb = await mergeBase(root, base, "HEAD");
  const touched = await diffNameOnly(root, mb, "HEAD");

  const outDir = path.join(aiRoot(root), "out", branchName);
  await fs.mkdir(outDir, { recursive: true });

  const verifyMeta = await loadVerifyMeta(outDir);

  // Policy check as part of review
  const directiveStub = { intent: "review" };
  const policyRes = evaluatePolicy({ policy, directive: directiveStub, touchedFiles: touched, verifyMeta, flags: { force } });

  const diff = await diffText(root, mb, "HEAD");
  const stat = await diffStat(root, mb, "HEAD");

  const agents = {
    policy: policyAgent(policyRes),
    risk: riskAgent(touched, diff),
    style: styleAgent(diff),
    tests: testsAgent(verifyMeta)
  };

  const meta = {
    branch: branchName,
    base,
    merge_base: mb,
    ran_at: nowIso(),
    touched_files: touched,
    status: policyRes.ok ? "ok" : "fail",
    summary: {
      files_touched: touched.length,
      diff_stat: stat.trim()
    },
    agents
  };

  await fs.writeFile(path.join(outDir, "review.json"), safeJson(meta), "utf8");
  await fs.writeFile(path.join(outDir, "REVIEW.md"), renderMd(meta), "utf8");

  await addArtifact(outDir, branchName, { kind: "review_json", path: `.ai/out/${branchName}/review.json`, label: "Review results (json)" });
  await addArtifact(outDir, branchName, { kind: "review_md", path: `.ai/out/${branchName}/REVIEW.md`, label: "Review report" });

  console.log(meta.status === "ok" ? chalk.green("\nReview OK\n") : chalk.red("\nReview failed (policy)\n"));
  if (meta.status !== "ok") process.exitCode = 1;
}

function policyAgent(policyRes) {
  return {
    status: policyRes.ok ? "ok" : "fail",
    findings: policyRes.violations
  };
}

function riskAgent(touched, diff) {
  const findings = [];
  if (touched.some(f => /auth|login|token|wallet|payment|ledger/i.test(f))) {
    findings.push({ severity: "high", message: "Auth/payment-related files touched. Ensure tests and security review." });
  }
  if (diff.includes("eval(") || diff.includes("child_process")) {
    findings.push({ severity: "high", message: "Potentially dangerous patterns detected (eval/child_process)." });
  }
  return { status: findings.length ? "warn" : "ok", findings };
}

function styleAgent(diff) {
  const findings = [];
  const longLines = diff.split("\n").filter(l => l.startsWith("+") && l.length > 180).length;
  if (longLines > 0) findings.push({ severity: "low", message: `Added ${longLines} line(s) > 180 chars.` });
  return { status: findings.length ? "warn" : "ok", findings };
}

function testsAgent(verifyMeta) {
  if (!verifyMeta) return { status: "warn", findings: [{ severity: "med", message: "No verify.json found. Run: directiveai verify-auto <branch>" }] };
  const failed = (verifyMeta.results || []).filter(r => r.status !== "ok");
  if (failed.length) return { status: "fail", findings: failed.map(f => ({ severity: "high", message: `${f.name} failed` })) };
  return { status: "ok", findings: [] };
}

function renderMd(meta) {
  const lines = [];
  lines.push(`# Review — ${meta.branch}`);
  lines.push("");
  lines.push(`Status: **${meta.status.toUpperCase()}**`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Files touched: ${meta.summary.files_touched}`);
  if (meta.summary.diff_stat) lines.push(`- Diff stat: \n\n\`\`\`\n${meta.summary.diff_stat}\n\`\`\`\n`);

  for (const [k, v] of Object.entries(meta.agents)) {
    lines.push(`## ${capitalize(k)} agent`);
    lines.push("");
    lines.push(`Status: **${String(v.status).toUpperCase()}**`);
    if (v.findings?.length) {
      lines.push("");
      for (const f of v.findings) lines.push(`- [${f.severity}] ${f.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function capitalize(s) {
  return s.slice(0,1).toUpperCase() + s.slice(1);
}
