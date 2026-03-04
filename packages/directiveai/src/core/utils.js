import fs from "node:fs/promises";

export function nowIso() {
  return new Date().toISOString();
}

export async function fileExists(fp) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

export function safeJson(obj) {
  return JSON.stringify(obj, null, 2);
}
