import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { aiRoot } from "../core/paths.js";
import { nowIso, safeJson } from "../core/utils.js";

// Minimal ingest implementation:
// - Scans text files under provided roots for lines containing "@ai:".
// - Creates one directive file per match into .ai/directives/pending.
// - Does not modify source files (writeback can be added later).

const DEFAULT_EXTS = new Set([".js", ".ts", ".vue", ".jsx", ".tsx", ".md", ".txt", ".scss", ".css", ".py", ".go", ".java", ".rb"]);

export async function cmdIngest({ paths: pathsCsv }) {
  const root = process.cwd();
  const aiDir = aiRoot(root);
  const pendingDir = path.join(aiDir, "directives", "pending");
  await fs.mkdir(pendingDir, { recursive: true });

  const roots = String(pathsCsv || "").split(",").map(s => s.trim()).filter(Boolean);
  const targets = roots.length ? roots : ["src", "functions"]; 

  const files = [];
  for (const r of targets) {
    const abs = path.join(root, r);
    await walk(abs, files);
  }

  let created = 0;
  for (const fp of files) {
    const rel = path.relative(root, fp);
    const text = await fs.readFile(fp, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.indexOf("@ai:");
      if (idx === -1) continue;

      const title = line.slice(idx + 4).trim() || "Untitled directive";
      const id = makeId();
      const doc = {
        id,
        title,
        intent: "",
        priority: "med",
        status: "pending",
        created_at: nowIso(),
        source: { file: rel, line: i + 1 },
        directive: {
          kind: "inline-marker",
          marker: "@ai:",
          raw: line.trim()
        },
        tasks: [
          { type: "analyze", text: title }
        ]
      };

      const out = path.join(pendingDir, `${id}.json`);
      await fs.writeFile(out, safeJson(doc), "utf8");
      created++;
    }
  }

  console.log(chalk.green(`\nIngest complete. Created ${created} pending directive(s).\n`));
}

async function walk(dir, out) {
  let ents;
  try {
    ents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".ai") continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) await walk(fp, out);
    else {
      const ext = path.extname(e.name).toLowerCase();
      if (DEFAULT_EXTS.has(ext)) out.push(fp);
    }
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}
