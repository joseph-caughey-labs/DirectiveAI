import { execa } from "execa";

export async function git(root, args, opts = {}) {
  return execa("git", args, { cwd: root, ...opts });
}

// Paths owned by DirectiveAI's own bookkeeping. Changes to these don't count
// against the "working tree must be clean before run" safety check — they
// happen as part of the normal ingest/accept/run flow and aren't user code.
const SYSTEM_PATH_PREFIXES = [".ai/directives/", ".ai/out/"];

export async function ensureClean(root, { ignorePrefixes = SYSTEM_PATH_PREFIXES } = {}) {
  // --untracked-files=all so a brand-new `.ai/` directory is reported as its
  // individual files (rather than just `?? .ai/`), which lets us prefix-filter
  // DirectiveAI's own bookkeeping accurately.
  const r = await git(root, ["status", "--porcelain", "--untracked-files=all"]);
  const lines = r.stdout.split("\n").filter(Boolean);
  if (!lines.length) return true;
  if (!ignorePrefixes.length) return false;

  for (const line of lines) {
    // Porcelain format: "XY path" (rename: "XY old -> new").
    const rest = line.slice(3);
    const paths = rest.includes(" -> ") ? rest.split(" -> ") : [rest];
    const userPath = paths.some(p => !ignorePrefixes.some(pre => stripQuotes(p).startsWith(pre)));
    if (userPath) return false;
  }
  return true;
}

function stripQuotes(p) {
  return p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p;
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
