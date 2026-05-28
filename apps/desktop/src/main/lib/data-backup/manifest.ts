import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BackupComponentStats,
  BackupHealthStatus,
  DataBackupInfo,
  DataBackupManifest,
  DataBackupManifestLegacy,
  DataBackupManifestV2,
  DataBackupVerifyResult,
} from "@shared/data-backup.types.js";
import { DATA_BACKUP_MANIFEST_VERSION } from "@shared/data-backup.types.js";
import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_ID_PATTERN,
  MANIFEST_FILE,
  MAPS_SUBDIR,
  PGDATA_SUBDIR,
} from "@main/lib/data-backup/constants.js";
import { inventoryDirectory, pathExists } from "@main/lib/data-backup/fs.js";

function isManifestV2(value: DataBackupManifest): value is DataBackupManifestV2 {
  return "version" in value && value.version === DATA_BACKUP_MANIFEST_VERSION;
}

export function createBackupId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function assertValidBackupId(backupId: string): void {
  if (!BACKUP_ID_PATTERN.test(backupId)) {
    throw new Error(`Invalid backup id: ${backupId}`);
  }
}

export async function readBackupManifest(backupDir: string): Promise<DataBackupManifest | null> {
  try {
    const raw = await readFile(join(backupDir, MANIFEST_FILE), "utf8");
    const parsed = JSON.parse(raw) as DataBackupManifest;
    if (typeof parsed.id !== "string" || typeof parsed.createdAt !== "string") {
      return null;
    }
    if (!BACKUP_ID_PATTERN.test(parsed.id)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeBackupManifest(
  backupDir: string,
  manifest: DataBackupManifestV2,
): Promise<void> {
  await writeFile(join(backupDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2), "utf8");
}

export function manifestHasMaps(manifest: DataBackupManifest): boolean {
  if (isManifestV2(manifest)) {
    return manifest.components.maps !== null;
  }
  return false;
}

export function manifestAppVersion(manifest: DataBackupManifest): string | null {
  if (isManifestV2(manifest)) {
    return manifest.appVersion;
  }
  return null;
}

export async function collectComponentStats(
  backupDir: string,
  component: typeof PGDATA_SUBDIR | typeof MAPS_SUBDIR,
): Promise<BackupComponentStats | null> {
  const componentDir = join(backupDir, component);
  if (!(await pathExists(componentDir))) {
    return null;
  }

  const inventory = await inventoryDirectory(componentDir, component === MAPS_SUBDIR);
  if (inventory.fileCount === 0) {
    return null;
  }

  return {
    present: true,
    fileCount: inventory.fileCount,
    sizeBytes: inventory.sizeBytes,
  };
}

export async function verifyBackupDirectory(backupDir: string): Promise<DataBackupVerifyResult> {
  const backupId = backupDir.split("/").pop() ?? "";
  const issues: string[] = [];
  const manifest = await readBackupManifest(backupDir);

  if (!manifest) {
    return {
      backupId,
      ok: false,
      status: "corrupt",
      issues: ["manifest.json is missing or invalid"],
    };
  }

  const pgliteDir = join(backupDir, PGDATA_SUBDIR);
  const mapsDir = join(backupDir, MAPS_SUBDIR);

  if (!(await pathExists(pgliteDir))) {
    issues.push("pglite data directory is missing");
  } else {
    const pgliteInventory = await inventoryDirectory(pgliteDir, false);
    if (pgliteInventory.fileCount === 0) {
      issues.push("pglite data directory is empty");
    }
  }

  const expectsMaps = manifestHasMaps(manifest);
  if (expectsMaps) {
    if (!(await pathExists(mapsDir))) {
      issues.push("maps directory is missing");
    } else {
      const mapsInventory = await inventoryDirectory(mapsDir, true);
      if (mapsInventory.fileCount === 0) {
        issues.push("maps directory is empty");
      }
    }
  }

  let status: BackupHealthStatus = "healthy";
  if (issues.some((issue) => issue.includes("pglite"))) {
    status = "corrupt";
  } else if (issues.length > 0) {
    status = "incomplete";
  }

  return {
    backupId: manifest.id,
    ok: issues.length === 0,
    status,
    issues,
  };
}

export async function toBackupInfo(
  backupDir: string,
  manifest: DataBackupManifest,
): Promise<DataBackupInfo> {
  const verify = await verifyBackupDirectory(backupDir);
  const pgliteStats = await collectComponentStats(backupDir, PGDATA_SUBDIR);
  const mapsStats = await collectComponentStats(backupDir, MAPS_SUBDIR);
  const sizeBytes = (pgliteStats?.sizeBytes ?? 0) + (mapsStats?.sizeBytes ?? 0);

  return {
    id: manifest.id,
    createdAt: manifest.createdAt,
    label: manifest.label,
    appVersion: manifestAppVersion(manifest),
    mapCount: manifest.mapCount,
    sizeBytes,
    status: verify.status,
    isDual: manifestHasMaps(manifest),
    components: {
      pglite: pgliteStats !== null,
      maps: mapsStats !== null,
    },
  };
}

export function buildManifestV2(input: {
  id: string;
  createdAt: string;
  label: string | null;
  appVersion: string;
  mapCount: number;
  pglite: BackupComponentStats | null;
  maps: BackupComponentStats | null;
}): DataBackupManifestV2 {
  return {
    version: BACKUP_MANIFEST_VERSION,
    id: input.id,
    createdAt: input.createdAt,
    label: input.label,
    appVersion: input.appVersion,
    mapCount: input.mapCount,
    components: {
      pglite: input.pglite,
      maps: input.maps,
    },
  };
}

export function isLegacyManifest(
  manifest: DataBackupManifest,
): manifest is DataBackupManifestLegacy {
  return !("version" in manifest);
}
