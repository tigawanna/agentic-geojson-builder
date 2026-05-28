import { app } from "electron";
import { join } from "node:path";

export function getDataBackupsDir(): string {
  return join(app.getPath("userData"), "data-backups");
}

export function getDataBackupDir(backupId: string): string {
  return join(getDataBackupsDir(), backupId);
}
