import { execa } from "execa";

async function git(root, args) {
  return execa("git", args, { cwd: root });
}

export async function getCurrentBranch(root) {
  return (await git(root, ["rev-parse", "--abbrev-ref", "HEAD"])) .stdout.trim();
}

export async function pushBranch(root, branch, remote = "origin") {
  await git(root, ["push", "-u", remote, branch]);
}

export async function hasRemote(root, remote = "origin") {
  const r = await git(root, ["remote"]);
  return r.stdout.split("\n").map(s => s.trim()).includes(remote);
}
