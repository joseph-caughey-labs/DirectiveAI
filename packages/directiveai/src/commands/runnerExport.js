import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

import { fileExists } from "../core/utils.js";

export async function cmdRunnerExport({ force = false }) {
  const root = process.cwd();

  const dockerfile = path.join(root, "Dockerfile");
  const dockerignore = path.join(root, ".dockerignore");
  const scriptDir = path.join(root, "scripts");
  const script = path.join(scriptDir, "ai-runner.sh");

  await fs.mkdir(scriptDir, { recursive: true });

  if (force || !(await fileExists(dockerfile))) await fs.writeFile(dockerfile, defaultDockerfile(), "utf8");
  if (force || !(await fileExists(dockerignore))) await fs.writeFile(dockerignore, defaultDockerignore(), "utf8");
  if (force || !(await fileExists(script))) {
    await fs.writeFile(script, defaultRunnerScript(), "utf8");
    await fs.chmod(script, 0o755);
  }

  console.log(chalk.green("\nRunner files generated: Dockerfile, .dockerignore, scripts/ai-runner.sh\n"));
}

function defaultDockerfile() {
  return `FROM node:20-bookworm\n\nRUN apt-get update && apt-get install -y --no-install-recommends \\\n  git ca-certificates bash \\\n  && rm -rf /var/lib/apt/lists/*\n\nWORKDIR /work\n`;
}

function defaultDockerignore() {
  return `node_modules\n.git\n.ai/out\ndist\nbuild\ncoverage\n*.log\n`;
}

function defaultRunnerScript() {
  return `#!/usr/bin/env bash\nset -euo pipefail\n\nIMAGE=\"\${AI_RUNNER_IMAGE:-ai-runner:latest}\"\nWORKDIR=\"\${AI_RUNNER_WORKDIR:-/work}\"\nMOUNT_MODE=\"\${AI_RUNNER_MOUNT_MODE:-rw}\"\n\nENV_ARGS=()\nfor V in OPENAI_API_KEY ANTHROPIC_API_KEY; do\n  if [ -n \"\${!V:-}\" ]; then\n    ENV_ARGS+=(\"-e\" \"$V=\${!V}\")\n  fi\ndone\n\ndocker run --rm -it \\\n  -v \"$(pwd):\${WORKDIR}:\${MOUNT_MODE}\" \\\n  -w \"\${WORKDIR}\" \\\n  \"\${ENV_ARGS[@]}\" \\\n  \"$IMAGE\" \\\n  bash -lc \"$*\"\n`;
}
