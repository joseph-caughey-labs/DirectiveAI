import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { aiRoot } from "./paths.js";
import { fileExists } from "./utils.js";

export async function loadConfig(root) {
  const fp = path.join(aiRoot(root), "config.yml");
  if (!(await fileExists(fp))) return {};
  const raw = await fs.readFile(fp, "utf8");
  return yaml.load(raw) || {};
}
