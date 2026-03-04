import fs from "node:fs/promises";
import path from "node:path";

import { aiRoot } from "../core/paths.js";
import { nowIso } from "../core/utils.js";
import { mergeBase, diffText, diffStat } from "../core/git.js";
import { loadConfig } from "../core/config.js";
import { addArtifact } from "../core/outIndex.js";

export async function cmdPr({ branch, baseBranch = null }) {
  const root = process.cwd();
  const cfg = await loadConfig(root);
  const base = baseBranch || cfg?.ci?.base_branch || "main";
  const mb = await mergeBase(root, base, "HEAD");

  const diff = await diffText(root, mb, "HEAD");
  const stat = await diffStat(root, mb, "HEAD");

  const outDir = path.join(aiRoot(root), "out", branch);
  await fs.mkdir(outDir, { recursive: true });

  const title = `DirectiveAI: ${branch}`;
  const body = `# ${title}\n\nGenerated: ${nowIso()}\n\n## Summary\n\n- Base: ${base}\n- Merge base: ${mb}\n\n## Diff stat\n\n\`\`\`\n${stat.trim()}\n\`\`\`\n\n## Notes\n\n- Add context here (intent, scope, tradeoffs).\n\n## Diff (truncated)\n\n\`\`\`diff\n${diff.slice(0, 12000)}\n\`\`\`\n`;

  await fs.writeFile(path.join(outDir, "PR_TITLE.txt"), title + "\n", "utf8");
  await fs.writeFile(path.join(outDir, "PR_BODY.md"), body, "utf8");

  const bundle = `## PR Title\n\n${title}\n\n---\n\n${body}`;
  await fs.writeFile(path.join(outDir, "BUNDLE.md"), bundle, "utf8");

  await addArtifact(outDir, branch, { kind: "pr_title", path: `.ai/out/${branch}/PR_TITLE.txt`, label: "PR title" });
  await addArtifact(outDir, branch, { kind: "pr_body", path: `.ai/out/${branch}/PR_BODY.md`, label: "PR description" });
  await addArtifact(outDir, branch, { kind: "bundle", path: `.ai/out/${branch}/BUNDLE.md`, label: "One-paste PR bundle" });
}
