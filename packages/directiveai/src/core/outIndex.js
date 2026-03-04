import fs from "node:fs/promises";
import path from "node:path";
import { fileExists, nowIso } from "./utils.js";

export async function loadOutIndex(outDir, branch) {
  const fp = path.join(outDir, "index.json");
  if (!(await fileExists(fp))) {
    return { branch, generated_at: nowIso(), artifacts: [] };
  }
  return JSON.parse(await fs.readFile(fp, "utf8"));
}

export async function addArtifact(outDir, branch, artifact) {
  const idx = await loadOutIndex(outDir, branch);
  const exists = idx.artifacts.some(a => a.path === artifact.path || (a.kind && artifact.kind && a.kind === artifact.kind));
  if (!exists) idx.artifacts.push(artifact);
  idx.generated_at = nowIso();

  await fs.writeFile(path.join(outDir, "index.json"), JSON.stringify(idx, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "INDEX.md"), renderIndexMd(idx), "utf8");

  return idx;
}

function renderIndexMd(idx) {
  const lines = [];
  lines.push(`# AI Output — ${idx.branch}`);
  lines.push("");
  lines.push(`Generated: ${idx.generated_at}`);
  lines.push("");
  lines.push("## Artifacts");
  for (const a of idx.artifacts) {
    const rel = a.path.split(`.ai/out/${idx.branch}/`)[1] || a.path;
    lines.push(`- [${a.label || a.kind}](./${rel})`);
  }
  lines.push("");
  return lines.join("\n");
}
