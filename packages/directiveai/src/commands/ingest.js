import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { aiRoot } from "../core/paths.js";
import { nowIso, safeJson, fileExists } from "../core/utils.js";
import { filterDirectiveFiles, readDirectiveFile } from "../core/directiveFiles.js";

// Minimal ingest implementation:
// - Scans text files under provided roots for lines containing "@ai:".
// - Creates one directive file per match into .ai/directives/pending.
// - Deduplicates against existing directives (pending/ready/done) by source {file, line}.
// - Does not modify source files (writeback is a deliberate future feature).

const DEFAULT_EXTS = new Set([".js", ".ts", ".vue", ".jsx", ".tsx", ".md", ".txt", ".scss", ".css", ".py", ".go", ".java", ".rb"]);

export async function cmdIngest({ paths: pathsCsv }) {
  const root = process.cwd();
  const aiDir = aiRoot(root);
  const pendingDir = path.join(aiDir, "directives", "pending");
  await fs.mkdir(pendingDir, { recursive: true });

  const existing = await loadExistingSources(aiDir);

  const roots = String(pathsCsv || "").split(",").map(s => s.trim()).filter(Boolean);
  const targets = roots.length ? roots : ["src", "functions"];

  const files = [];
  for (const r of targets) {
    const abs = path.join(root, r);
    await walk(abs, files);
  }

  let created = 0;
  let skipped = 0;
  for (const fp of files) {
    const rel = path.relative(root, fp);
    const text = await fs.readFile(fp, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.indexOf("@ai:");
      if (idx === -1) continue;

      const key = `${rel}:${i + 1}`;
      if (existing.has(key)) { skipped++; continue; }

      const parsed = parseMarker(line.slice(idx + 4));
      const id = makeId();
      const doc = {
        id,
        title: parsed.title,
        intent: parsed.intent,
        priority: parsed.priority,
        status: "pending",
        created_at: nowIso(),
        source: { file: rel, line: i + 1 },
        directive: {
          kind: "inline-marker",
          marker: "@ai:",
          raw: line.trim()
        },
        tasks: [
          { type: "analyze", text: parsed.title }
        ]
      };

      const out = path.join(pendingDir, `${id}.json`);
      await fs.writeFile(out, safeJson(doc), "utf8");
      existing.add(key);
      created++;
    }
  }

  const skippedSuffix = skipped ? chalk.dim(` (skipped ${skipped} already-ingested)`) : "";
  console.log(chalk.green(`\nIngest complete. Created ${created} pending directive(s).${skippedSuffix}\n`));
}

// Parses the substring after "@ai:" — extracts [k=v] metadata brackets,
// strips an optional "TASK:" or "TODO:" lead-in, and returns the cleaned title.
export function parseMarker(rest) {
  let s = String(rest || "").trim();
  const meta = {};

  // Repeatedly consume leading [key=value] brackets.
  for (;;) {
    const m = /^\[([^=\]\s]+)\s*=\s*([^\]]*)\]\s*/.exec(s);
    if (!m) break;
    meta[m[1].toLowerCase()] = m[2].trim();
    s = s.slice(m[0].length);
  }

  // Drop an optional TASK:/TODO:/NOTE: prefix.
  s = s.replace(/^(TASK|TODO|NOTE|FIXME)\s*:\s*/i, "").trim();

  return {
    title: s || "Untitled directive",
    intent: meta.intent || "",
    priority: meta.priority || meta.prio || "med"
  };
}

async function loadExistingSources(aiDir) {
  const set = new Set();
  for (const status of ["pending", "ready", "done"]) {
    const dir = path.join(aiDir, "directives", status);
    if (!(await fileExists(dir))) continue;
    const names = filterDirectiveFiles(await fs.readdir(dir));
    for (const n of names) {
      try {
        const doc = await readDirectiveFile(path.join(dir, n));
        if (doc?.source?.file && doc?.source?.line != null) {
          set.add(`${doc.source.file}:${doc.source.line}`);
        }
      } catch {
        // Skip unreadable directives — they don't contribute to dedup.
      }
    }
  }
  return set;
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
