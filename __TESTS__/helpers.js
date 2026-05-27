import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLI = path.resolve(here, "..", "packages/directiveai/bin/ai.js");

// Spawn the DirectiveAI CLI in a given cwd. Returns { code, stdout, stderr }.
// Never throws on non-zero exit — tests assert on `code` explicitly.
export function runCli(cwd, args = [], { env = {} } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
  return {
    code: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || ""
  };
}

// Run an arbitrary shell command in a cwd. Same return shape as runCli.
export function sh(cwd, cmd, args = []) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

// Make a fresh git repo in a tmpdir with one initial commit on `main`.
// Returns the absolute path; tests should pass it to cleanup() in their teardown.
export async function makeRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dai-int-"));
  sh(dir, "git", ["init", "-q"]);
  sh(dir, "git", ["config", "user.email", "test@test.test"]);
  sh(dir, "git", ["config", "user.name", "Test"]);
  sh(dir, "git", ["checkout", "-q", "-b", "main"]);
  await fs.writeFile(path.join(dir, "README.md"), "# test repo\n");
  sh(dir, "git", ["add", "-A"]);
  sh(dir, "git", ["commit", "-q", "-m", "init"]);
  return dir;
}

export async function cleanup(dir) {
  if (!dir) return;
  await fs.rm(dir, { recursive: true, force: true });
}

// Convenience: write a file inside `repo` and `git add -A` + commit it.
export async function commit(repo, files, message = "wip") {
  for (const [rel, content] of Object.entries(files)) {
    const fp = path.join(repo, rel);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content);
  }
  sh(repo, "git", ["add", "-A"]);
  sh(repo, "git", ["commit", "-q", "-m", message]);
}

export async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export async function readText(p) {
  return await fs.readFile(p, "utf8");
}

// List entries (non-recursive) under a directory; returns [] if missing.
export async function ls(p) {
  try { return await fs.readdir(p); } catch { return []; }
}
