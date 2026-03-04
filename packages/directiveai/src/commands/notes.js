import fs from "node:fs/promises";
import path from "node:path";

import { aiRoot } from "../core/paths.js";
import { nowIso } from "../core/utils.js";
import { mergeBase, diffStat } from "../core/git.js";
import { loadConfig } from "../core/config.js";
import { addArtifact } from "../core/outIndex.js";

export async function cmdNotes({ branch, baseBranch = null }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const base = baseBranch || cfg?.ci?.base_branch || "main";
  const mb = await mergeBase(root, base, "HEAD");

  const stat = await diffStat(root, mb, "HEAD");

  const outDir = path.join(aiRoot(root), "out", branch);
  await fs.mkdir(outDir, { recursive: true });

  const md = `# Release Notes — ${branch}\n\nGenerated: ${nowIso()}\n\n## Summary\n\n- Base: ${base}\n- Merge base: ${mb}\n\n## Diff stat\n\n\`\`\`\n${stat.trim()}\n\`\`\`\n`;

  await fs.writeFile(path.join(outDir, "RELEASE_NOTES.md"), md, "utf8");
  await addArtifact(outDir, branch, { kind: "release_notes", path: `.ai/out/${branch}/RELEASE_NOTES.md`, label: "Release notes" });
}
