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
  return [
    "FROM node:20-bookworm",
    "",
    "RUN apt-get update && apt-get install -y --no-install-recommends \\",
    "  git ca-certificates bash \\",
    "  && rm -rf /var/lib/apt/lists/*",
    "",
    "WORKDIR /work",
    ""
  ].join("\n");
}

function defaultDockerignore() {
  return [
    "node_modules",
    ".git",
    ".ai/out",
    "dist",
    "build",
    "coverage",
    "*.log",
    ""
  ].join("\n");
}

function defaultRunnerScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'IMAGE="${AI_RUNNER_IMAGE:-ai-runner:latest}"',
    'WORKDIR="${AI_RUNNER_WORKDIR:-/work}"',
    'MOUNT_MODE="${AI_RUNNER_MOUNT_MODE:-rw}"',
    "",
    "ENV_ARGS=()",
    "for V in OPENAI_API_KEY ANTHROPIC_API_KEY; do",
    '  if [ -n "${!V:-}" ]; then',
    '    ENV_ARGS+=("-e" "$V=${!V}")',
    "  fi",
    "done",
    "",
    "docker run --rm -it \\",
    '  -v "$(pwd):${WORKDIR}:${MOUNT_MODE}" \\',
    '  -w "${WORKDIR}" \\',
    '  "${ENV_ARGS[@]}" \\',
    '  "$IMAGE" \\',
    '  bash -lc "$*"',
    ""
  ].join("\n");
}
