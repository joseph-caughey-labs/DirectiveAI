import path from "node:path";

export function aiRoot(root) {
  return path.join(root, ".ai");
}
