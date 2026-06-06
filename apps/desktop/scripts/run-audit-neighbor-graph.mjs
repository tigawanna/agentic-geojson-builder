import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, "..");
const require = createRequire(import.meta.url);
const vitestDir = dirname(require.resolve("vitest/package.json"));
const viteNodeCli = join(vitestDir, "..", "vite-node", "dist", "cli.mjs");
const auditScript = join(scriptDir, "audit-neighbor-graph.ts");
const configPath = join(packageRoot, "vitest.config.ts");

const result = spawnSync(
  process.execPath,
  [viteNodeCli, "--config", configPath, auditScript, ...process.argv.slice(2)],
  { stdio: "inherit", cwd: packageRoot },
);

process.exit(result.status ?? 1);
