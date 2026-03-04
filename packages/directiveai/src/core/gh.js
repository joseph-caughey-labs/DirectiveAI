import { execa } from "execa";

export async function ghAvailable() {
  try {
    await execa("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function ghAuthed() {
  const r = await execa("gh", ["auth", "status"], { reject: false });
  return r.exitCode === 0;
}

export async function ghRepoInfo() {
  const r = await execa("gh", ["repo", "view", "--json", "name,owner"], { reject: false });
  if (r.exitCode !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}
