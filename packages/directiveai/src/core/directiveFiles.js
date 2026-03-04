import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

export const DIRECTIVE_FILE_EXTS = [".json", ".yaml", ".yml", ".md"];
const DIRECTIVE_FILE_EXT_SET = new Set(DIRECTIVE_FILE_EXTS);
const FRONT_MATTER_RE = /^---\s*(?:\r?\n)([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/;

export function isDirectiveFile(name = "") {
  return DIRECTIVE_FILE_EXT_SET.has(path.extname(name).toLowerCase());
}

export function filterDirectiveFiles(list = []) {
  return list.filter(isDirectiveFile);
}

export async function readDirectiveFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  const raw = await fs.readFile(fp, "utf8");
  try {
    if (ext === ".json") return JSON.parse(raw);
    if (ext === ".md") return loadMarkdownFrontMatter(raw);
    return ensureDirectiveObject(yaml.load(raw));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse directive ${path.basename(fp)}: ${msg}`);
  }
}

function loadMarkdownFrontMatter(raw) {
  const normalized = raw.replace(/^\uFEFF/, "");
  const match = FRONT_MATTER_RE.exec(normalized);
  if (!match) throw new Error("Missing YAML frontmatter block (---) at top of markdown directive");
  return ensureDirectiveObject(yaml.load(match[1]));
}

function ensureDirectiveObject(doc) {
  if (!doc || typeof doc !== "object") throw new Error("Empty directive content");
  return doc;
}
