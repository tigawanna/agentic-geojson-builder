import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

function parsePostmasterPid(contents: string): number | null {
  const firstLine = contents.split("\n")[0]?.trim();
  if (!firstLine) return null;
  const pid = Number.parseInt(firstLine, 10);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function removeStalePostmasterPid(dataDir: string): boolean {
  const pidPath = join(dataDir, "postmaster.pid");
  if (!existsSync(pidPath)) return false;

  const pid = parsePostmasterPid(readFileSync(pidPath, "utf8"));
  if (pid !== null && isProcessAlive(pid)) return false;

  unlinkSync(pidPath);
  return true;
}
