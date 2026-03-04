import { execa } from "execa";

export async function git(root, args, opts = {}) {
  return execa("git", args, { cwd: root, ...opts });
}

export async function ensureClean(root) {
  const r = await git(root, ["status", "--porcelain"]);
  return r.stdout.trim().length === 0;
}

export async function checkout(root, ref) {
  await git(root, ["checkout", ref]);
}

export async function createBranch(root, branch, base) {
  const exists = await execa("git", ["rev-parse", "--verify", branch], { cwd: root, reject: false });
  if (exists.exitCode === 0) {
    // Prefer non-destructive checkout; caller can reset explicitly if desired.
    await git(root, ["checkout", branch]);
  } else {
    await git(root, ["checkout", "-b", branch, base]);
  }
}

export async function mergeBase(root, base, head = "HEAD") {
  const r = await git(root, ["merge-base", base, head]);
  return r.stdout.trim();
}

export async function diffNameOnly(root, from, to = "HEAD") {
  const r = await git(root, ["diff", "--name-only", `${from}..${to}`]);
  return r.stdout.split("\n").map(s => s.trim()).filter(Boolean);
}

export async function diffText(root, from, to = "HEAD") {
  const r = await git(root, ["diff", `${from}..${to}`]);
  return r.stdout || "";
}

export async function diffStat(root, from, to = "HEAD") {
  const r = await git(root, ["diff", "--stat", `${from}..${to}`]);
  return r.stdout || "";
}
