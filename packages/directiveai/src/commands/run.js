import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { execa } from "execa";

import { aiRoot } from "../core/paths.js";
import { fileExists, nowIso, safeJson } from "../core/utils.js";
import { loadConfig } from "../core/config.js";
import { loadPolicy, evaluatePolicy, writePolicyViolations } from "../core/policy.js";
import { ensureClean, createBranch, mergeBase, diffNameOnly } from "../core/git.js";
import { addArtifact } from "../core/outIndex.js";
import { filterDirectiveFiles, readDirectiveFile } from "../core/directiveFiles.js";
import { extractScope, checkScope, writeScopeViolations } from "../core/scope.js";

// NOTE: This repo ships a SAFE skeleton for "compile".
// Real code-generation/model calls are intentionally left as extension points.
// The compile step here demonstrates:
// - branch creation
// - scope-lock enforcement (directive `scope.allow`/`scope.deny` vs. touched files)
// - policy evaluation based on touched files
// - artifacts written to .ai/out/<branch>/

export async function cmdRun({ ready = false, id = null, branch = null, baseBranch = null, force = false }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const policy = await loadPolicy(root);

  if (!branch) throw new Error("--branch is required");

  const base = baseBranch || cfg?.runner?.base_branch || cfg?.ci?.base_branch || cfg?.github?.base_branch || cfg?.review?.base_branch || "main";

  if (cfg?.safety?.require_clean) {
    const clean = await ensureClean(root);
    if (!clean) throw new Error("Working tree not clean. Commit or stash changes first.");
  }

  const readyDir = path.join(aiRoot(root), "directives", "ready");
  if (!(await fileExists(readyDir))) throw new Error("No ready directives folder found. Run: directiveai accept --all");

  const files = filterDirectiveFiles(await fs.readdir(readyDir));
  const pick = ready ? files : (id ? files.filter(f => f.startsWith(id)) : []);
  if (!pick.length) throw new Error("No directives selected. Use --ready or --id <id>.");

  // Create the branch from base
  await createBranch(root, branch, base);

  // Simulate work: write a summary file (replace this with actual patch/apply pipeline)
  const outDir = path.join(aiRoot(root), "out", branch);
  await fs.mkdir(outDir, { recursive: true });

  const runMeta = {
    branch,
    base,
    started_at: nowIso(),
    directives: [],
    status: "ok"
  };

  const doneDir = path.join(aiRoot(root), "directives", "done");
  await fs.mkdir(doneDir, { recursive: true });
  const moves = [];
  const docs = [];

  for (const f of pick) {
    const fp = path.join(readyDir, f);
    const doc = await readDirectiveFile(fp);
    docs.push(doc);

    // Extension point: implement compiler adapters here.
    // For now, we write a marker file per directive.
    const marker = path.join(outDir, `applied.${doc.id}.txt`);
    await fs.writeFile(marker, `Applied directive ${doc.id}: ${doc.title}\n`, "utf8");

    runMeta.directives.push({ id: doc.id, title: doc.title, source: doc.source });

    // Defer moving directives until checks pass to avoid losing them on failure.
    moves.push({ from: fp, to: path.join(doneDir, f) });
  }

  // Commit changes so diff exists (optional; safe default)
  await execa("git", ["add", "-A"], { cwd: root });
  const commitResult = await execa("git", ["commit", "-m", `directiveai: apply ${pick.length} directive(s)`], { cwd: root, reject: false });
  const commitOutput = `${commitResult.stdout}\n${commitResult.stderr}`;
  if (commitResult.exitCode !== 0 && !/nothing to commit/i.test(commitOutput)) {
    throw new Error(`git commit failed (exit ${commitResult.exitCode}). Check hooks and staged files.`);
  }

  // Diff vs. base for scope + policy evaluation
  const mb = await mergeBase(root, base, "HEAD");
  const touched = await diffNameOnly(root, mb, "HEAD");

  // Scope-lock: union of directive scopes constrains which user files may change.
  const scope = extractScope(docs);
  const scopeRes = checkScope(touched, scope);
  runMeta.scope = { allow: scope.allow, deny: scope.deny, sources: scope.sources };
  if (!scopeRes.ok && !force) {
    runMeta.status = "scope_fail";
    await writeScopeViolations(outDir, scopeRes, {
      branch,
      base,
      merge_base: mb,
      touched_files: touched
    });
    await fs.writeFile(path.join(outDir, "run.meta.json"), safeJson(runMeta), "utf8");
    await addArtifact(outDir, branch, { kind: "run_meta", path: `.ai/out/${branch}/run.meta.json`, label: "Run metadata" });
    await addArtifact(outDir, branch, { kind: "scope_violations", path: `.ai/out/${branch}/scope.violations.json`, label: "Scope violations" });

    const offending = scopeRes.violations.map(v => `  - ${v.file} (${v.reason})`).join("\n");
    throw new Error(`Scope-lock violations:\n${offending}\nSee .ai/out/${branch}/scope.violations.json (or pass --force to bypass).`);
  }
  if (!scopeRes.ok && force) {
    // Record the bypass for the audit trail even when --force lets it through.
    await writeScopeViolations(outDir, scopeRes, {
      branch,
      base,
      merge_base: mb,
      touched_files: touched,
      forced: true
    });
    await addArtifact(outDir, branch, { kind: "scope_violations", path: `.ai/out/${branch}/scope.violations.json`, label: "Scope violations (forced)" });
  }

  const policyRes = evaluatePolicy({ policy, directive: { intent: runMeta.directives.map(d => d.title).join(" ") }, touchedFiles: touched, verifyMeta: null, flags: { force } });

  if (!policyRes.ok) {
    runMeta.status = "policy_fail";
    await writePolicyViolations(outDir, "batch", policyRes, { touchedFiles: touched });
    await fs.writeFile(path.join(outDir, "run.meta.json"), safeJson(runMeta), "utf8");

    await addArtifact(outDir, branch, { kind: "run_meta", path: `.ai/out/${branch}/run.meta.json`, label: "Run metadata" });

    throw new Error(`Policy violations. See .ai/out/${branch}/policy.violations.json`);
  }

  // Policy passed: finalize directive moves and record metadata
  for (const m of moves) await fs.rename(m.from, m.to);

  await execa("git", ["add", "-A"], { cwd: root });
  const finalizeCommit = await execa("git", ["commit", "-m", `directiveai: finalize ${pick.length} directive(s)`], { cwd: root, reject: false });
  const finalizeOutput = `${finalizeCommit.stdout}\n${finalizeCommit.stderr}`;
  if (finalizeCommit.exitCode !== 0 && !/nothing to commit/i.test(finalizeOutput)) {
    throw new Error(`git commit (finalize) failed (exit ${finalizeCommit.exitCode}). Check hooks and staged files.`);
  }

  await fs.writeFile(path.join(outDir, "run.meta.json"), safeJson(runMeta), "utf8");

  await addArtifact(outDir, branch, { kind: "run_meta", path: `.ai/out/${branch}/run.meta.json`, label: "Run metadata" });

  console.log(chalk.green(`\nRun complete on branch ${branch}.\nArtifacts: .ai/out/${branch}/\n`));
}
