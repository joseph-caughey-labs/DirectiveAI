import path from "node:path";
import { minimatch } from "minimatch";
import { fileExists } from "./utils.js";

export async function selectRunnerProfile({ root, config, changedFiles = [] }) {
  const rcfg = config.runner || {};
  const auto = rcfg.auto_select || {};
  if (auto.enabled === false) return rcfg.profile || "node";

  const pri = auto.priority || ["node"];
  const signals = auto.signals || {};

  const anyExist = async (arr) => {
    if (!arr?.length) return false;
    for (const rel of arr) {
      if (await fileExists(path.join(root, rel))) return true;
    }
    return false;
  };

  const anyGlobChanged = (globs) => {
    if (!globs?.length) return false;
    return changedFiles.some((f) => globs.some((g) => minimatch(f, g, { dot: true })));
  };

  for (const p of pri) {
    const s = signals[p] || {};
    if ((await anyExist(s.any_files_exist)) || anyGlobChanged(s.any_globs_changed)) return p;
  }

  return rcfg.profile || pri[0] || "node";
}
