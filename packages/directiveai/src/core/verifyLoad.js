import fs from "node:fs/promises";
import path from "node:path";
import { fileExists } from "./utils.js";

export async function loadVerifyMeta(outDir) {
  const fp = path.join(outDir, "verify.json");
  if (!(await fileExists(fp))) return null;
  return JSON.parse(await fs.readFile(fp, "utf8"));
}
