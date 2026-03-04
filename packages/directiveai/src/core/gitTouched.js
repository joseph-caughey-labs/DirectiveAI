import { mergeBase, diffNameOnly } from "./git.js";

export async function getTouchedFilesSinceBase(root, baseBranch, branch) {
  const mb = await mergeBase(root, baseBranch, branch);
  const files = await diffNameOnly(root, mb, "HEAD");
  return { merge_base: mb, files };
}
