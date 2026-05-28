import { app, shell } from "electron";
import { sql } from "drizzle-orm";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import type {
  CreateDataBackupInput,
  DataBackupInfo,
  DataBackupListResult,
  DataBackupManifest,
  DataBackupVerifyResult,
  DeleteDataBackupInput,
  GetDataBackupInput,
  PruneDataBackupsInput,
  PruneDataBackupsResult,
  RestoreDataBackupInput,
  VerifyDataBackupInput,
  DataBackupStoragePaths,
} from "@shared/data-backup.types.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { log } from "@main/lib/logger.js";
import { getMapsRootDir } from "@main/lib/pglite/map-files.service.js";
import { getPgliteDataDir } from "@main/lib/pglite/paths.js";
import { getPgliteDb, initPgliteDb, shutdownPgliteDb } from "@main/lib/pglite/client.js";
import {
  BACKUP_ID_PATTERN,
  DEFAULT_MAX_BACKUPS,
  LIVE_STAGING_PREFIX,
  MAPS_SUBDIR,
  PGDATA_SUBDIR,
  SAFETY_BACKUP_LABEL,
  STAGING_SUFFIX,
} from "@main/lib/data-backup/constants.js";
import {
  copyDirectoryTree,
  finalizeStagingDirectory,
  moveDirectory,
  pathExists,
  removeDirectory,
} from "@main/lib/data-backup/fs.js";
import { getDataBackupDir, getDataBackupsDir } from "@main/lib/data-backup/paths.js";
import {
  assertValidBackupId,
  buildManifestV2,
  collectComponentStats,
  createBackupId,
  isLegacyManifest,
  manifestHasMaps,
  readBackupManifest,
  toBackupInfo,
  verifyBackupDirectory,
  writeBackupManifest,
} from "@main/lib/data-backup/manifest.js";

let operationLock: Promise<void> = Promise.resolve();
let legacyRootMigrated = false;

async function withBackupLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = operationLock.then(fn);
  operationLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function migrateLegacyBackupRoot(): Promise<void> {
  if (legacyRootMigrated) return;
  legacyRootMigrated = true;

  const legacyRoot = join(app.getPath("userData"), "pglite-backups");
  const currentRoot = getDataBackupsDir();

  if (!(await pathExists(legacyRoot))) {
    return;
  }

  if (await pathExists(currentRoot)) {
    return;
  }

  await rename(legacyRoot, currentRoot);
  log.info({
    action: "data-backup",
    message: "migrated legacy backup directory",
    from: legacyRoot,
    to: currentRoot,
  });
}

async function readMapCount(): Promise<number> {
  const db = getPgliteDb();
  const result = await db.execute(sql`select count(*)::int as count from map`);
  const row = result.rows[0] as { count: number } | undefined;
  return row?.count ?? 0;
}

async function assertDatabaseHealthy(): Promise<void> {
  const db = getPgliteDb();
  await db.execute(sql`select 1 as ok`);
  await db.execute(sql`select count(*)::int as count from map`);
}

async function ensureDatabaseOpen(): Promise<void> {
  try {
    getPgliteDb();
  } catch {
    await initPgliteDb();
  }
}

async function listBackupIds(): Promise<string[]> {
  await migrateLegacyBackupRoot();
  const backupsRoot = getDataBackupsDir();
  await mkdir(backupsRoot, { recursive: true });

  const entries = await readdir(backupsRoot);
  return entries.filter((entry) => BACKUP_ID_PATTERN.test(entry));
}

function emitBackupChanged(
  reason: "created" | "restored" | "deleted" | "pruned",
  backupId?: string,
): void {
  broadcastToRenderers("dbBackup:changed", { reason, backupId });
  broadcastToRenderers("maps:changed", { reason: "updated" });
}

export async function listDataBackups(): Promise<DataBackupListResult> {
  const backupIds = await listBackupIds();
  const backups: DataBackupInfo[] = [];

  for (const backupId of backupIds) {
    const backupDir = getDataBackupDir(backupId);
    const manifest = await readBackupManifest(backupDir);
    if (!manifest) continue;
    backups.push(await toBackupInfo(backupDir, manifest));
  }

  backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { backups };
}

export async function getDataBackup(input: GetDataBackupInput): Promise<DataBackupInfo> {
  assertValidBackupId(input.backupId);
  const backupDir = getDataBackupDir(input.backupId);
  const manifest = await readBackupManifest(backupDir);
  if (!manifest) {
    throw new Error(`Backup not found: ${input.backupId}`);
  }
  return toBackupInfo(backupDir, manifest);
}

export async function verifyDataBackup(
  input: VerifyDataBackupInput,
): Promise<DataBackupVerifyResult> {
  assertValidBackupId(input.backupId);
  const backupDir = getDataBackupDir(input.backupId);
  const manifest = await readBackupManifest(backupDir);
  if (!manifest) {
    return {
      backupId: input.backupId,
      ok: false,
      status: "corrupt",
      issues: ["Backup not found"],
    };
  }
  return verifyBackupDirectory(backupDir);
}

async function copyBackupComponentsToStaging(input: {
  stagingDir: string;
  includeMaps: boolean;
}): Promise<{
  pglite: Awaited<ReturnType<typeof collectComponentStats>>;
  maps: Awaited<ReturnType<typeof collectComponentStats>>;
}> {
  await copyDirectoryTree(getPgliteDataDir(), join(input.stagingDir, PGDATA_SUBDIR));

  if (input.includeMaps) {
    await copyDirectoryTree(getMapsRootDir(), join(input.stagingDir, MAPS_SUBDIR));
  }

  const pglite = await collectComponentStats(input.stagingDir, PGDATA_SUBDIR);
  const maps = input.includeMaps
    ? await collectComponentStats(input.stagingDir, MAPS_SUBDIR)
    : null;

  if (!pglite) {
    throw new Error("Backup failed: PGlite data directory is empty");
  }

  return { pglite, maps };
}

async function createDataBackupUnchecked(
  input: CreateDataBackupInput = {},
): Promise<DataBackupInfo> {
  const includeMaps = input.includeMaps !== false;
  const mapCount = await readMapCount();
  const backupId = createBackupId();
  const createdAt = new Date().toISOString();
  const label = input.label?.trim() ? input.label.trim() : null;
  const backupDir = getDataBackupDir(backupId);
  const stagingDir = `${backupDir}${STAGING_SUFFIX}`;

  log.info({
    action: "data-backup",
    message: "creating backup",
    backupId,
    mapCount,
    includeMaps,
  });

  await shutdownPgliteDb();

  try {
    await removeDirectory(stagingDir);
    await mkdir(stagingDir, { recursive: true });

    const components = await copyBackupComponentsToStaging({
      stagingDir,
      includeMaps,
    });

    const manifest = buildManifestV2({
      id: backupId,
      createdAt,
      label,
      appVersion: app.getVersion(),
      mapCount,
      pglite: components.pglite,
      maps: components.maps,
    });

    await writeBackupManifest(stagingDir, manifest);

    const verification = await verifyBackupDirectory(stagingDir);
    if (!verification.ok) {
      throw new Error(`Backup verification failed: ${verification.issues.join("; ")}`);
    }

    await finalizeStagingDirectory(stagingDir, backupDir);

    const info = await toBackupInfo(backupDir, manifest);

    log.info({
      action: "data-backup",
      message: "backup created",
      backupId,
      sizeBytes: info.sizeBytes,
      isDual: info.isDual,
    });

    const maxBackups = input.maxBackups ?? DEFAULT_MAX_BACKUPS;
    if (maxBackups > 0) {
      await pruneDataBackupsUnchecked(maxBackups);
    }

    emitBackupChanged("created", backupId);
    return info;
  } catch (error) {
    await removeDirectory(stagingDir);
    throw error;
  } finally {
    await initPgliteDb();
  }
}

export async function createDataBackup(input: CreateDataBackupInput = {}): Promise<DataBackupInfo> {
  return withBackupLock(() => createDataBackupUnchecked(input));
}

async function moveLiveDataToStaging(stagingRoot: string): Promise<void> {
  await mkdir(stagingRoot, { recursive: true });

  if (await pathExists(getPgliteDataDir())) {
    await moveDirectory(getPgliteDataDir(), join(stagingRoot, PGDATA_SUBDIR));
  }

  if (await pathExists(getMapsRootDir())) {
    await moveDirectory(getMapsRootDir(), join(stagingRoot, MAPS_SUBDIR));
  }
}

async function restoreLiveDataFromBackup(
  backupDir: string,
  manifest: DataBackupManifest,
): Promise<void> {
  const pgliteSource = join(backupDir, PGDATA_SUBDIR);

  if (!(await pathExists(pgliteSource))) {
    throw new Error("Backup is missing PGlite data");
  }

  await copyDirectoryTree(pgliteSource, getPgliteDataDir());

  const restoreMaps = !isLegacyManifest(manifest) && manifestHasMaps(manifest);
  if (restoreMaps) {
    await removeDirectory(getMapsRootDir());
    await copyDirectoryTree(join(backupDir, MAPS_SUBDIR), getMapsRootDir());
  }
}

async function rollbackLiveDataFromStaging(stagingRoot: string): Promise<void> {
  await removeDirectory(getPgliteDataDir());
  await removeDirectory(getMapsRootDir());

  const stagedPglite = join(stagingRoot, PGDATA_SUBDIR);
  const stagedMaps = join(stagingRoot, MAPS_SUBDIR);

  if (await pathExists(stagedPglite)) {
    await moveDirectory(stagedPglite, getPgliteDataDir());
  }

  if (await pathExists(stagedMaps)) {
    await moveDirectory(stagedMaps, getMapsRootDir());
  }
}

async function restoreDataBackupUnchecked(input: RestoreDataBackupInput): Promise<{ ok: true }> {
  const backupDir = getDataBackupDir(input.backupId);
  const manifest = await readBackupManifest(backupDir);
  if (!manifest) {
    throw new Error(`Backup not found: ${input.backupId}`);
  }

  const verification = await verifyBackupDirectory(backupDir);
  if (verification.status === "corrupt") {
    throw new Error(`Cannot restore corrupt backup: ${verification.issues.join("; ")}`);
  }

  if (input.createSafetyBackup !== false) {
    await createDataBackupUnchecked({
      label: SAFETY_BACKUP_LABEL,
      includeMaps: true,
      maxBackups: 0,
    });
  }

  const liveStagingRoot = join(
    app.getPath("userData"),
    `${LIVE_STAGING_PREFIX}${createBackupId()}`,
  );

  log.info({
    action: "data-backup",
    message: "restoring backup",
    backupId: input.backupId,
    createdAt: manifest.createdAt,
    isDual: manifestHasMaps(manifest),
  });

  await shutdownPgliteDb();
  await removeDirectory(liveStagingRoot);

  try {
    await moveLiveDataToStaging(liveStagingRoot);

    try {
      await restoreLiveDataFromBackup(backupDir, manifest);
      await initPgliteDb();
      await assertDatabaseHealthy();
      await removeDirectory(liveStagingRoot);

      log.info({
        action: "data-backup",
        message: "backup restored",
        backupId: input.backupId,
      });

      emitBackupChanged("restored", input.backupId);
      return { ok: true as const };
    } catch (restoreError) {
      log.error({
        action: "data-backup",
        message: "restore failed, rolling back",
        backupId: input.backupId,
        error: restoreError instanceof Error ? restoreError.message : String(restoreError),
      });

      await shutdownPgliteDb();
      await rollbackLiveDataFromStaging(liveStagingRoot);
      await initPgliteDb();
      await assertDatabaseHealthy();

      throw restoreError instanceof Error
        ? restoreError
        : new Error("Restore failed and live data was rolled back");
    }
  } finally {
    if (await pathExists(liveStagingRoot)) {
      await removeDirectory(liveStagingRoot);
    }
    await ensureDatabaseOpen();
  }
}

export async function restoreDataBackup(input: RestoreDataBackupInput): Promise<{ ok: true }> {
  return withBackupLock(async () => {
    assertValidBackupId(input.backupId);
    return restoreDataBackupUnchecked(input);
  });
}

async function deleteDataBackupUnchecked(input: DeleteDataBackupInput): Promise<{ ok: true }> {
  const backupDir = getDataBackupDir(input.backupId);
  const manifest = await readBackupManifest(backupDir);
  if (!manifest) {
    throw new Error(`Backup not found: ${input.backupId}`);
  }

  await removeDirectory(backupDir);
  await removeDirectory(`${backupDir}${STAGING_SUFFIX}`);

  log.info({
    action: "data-backup",
    message: "backup deleted",
    backupId: input.backupId,
  });

  emitBackupChanged("deleted", input.backupId);
  return { ok: true as const };
}

export async function deleteDataBackup(input: DeleteDataBackupInput): Promise<{ ok: true }> {
  return withBackupLock(async () => {
    assertValidBackupId(input.backupId);
    return deleteDataBackupUnchecked(input);
  });
}

async function pruneDataBackupsUnchecked(keepCount: number): Promise<PruneDataBackupsResult> {
  const { backups } = await listDataBackups();
  const sorted = [...backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const toDelete = sorted.slice(keepCount);
  const deletedIds: string[] = [];

  for (const backup of toDelete) {
    await removeDirectory(getDataBackupDir(backup.id));
    deletedIds.push(backup.id);
  }

  if (deletedIds.length > 0) {
    emitBackupChanged("pruned");
  }

  return {
    deletedIds,
    remainingCount: sorted.length - deletedIds.length,
  };
}

export async function pruneDataBackups(
  input: PruneDataBackupsInput,
): Promise<PruneDataBackupsResult> {
  return withBackupLock(async () => {
    if (!Number.isFinite(input.keepCount) || input.keepCount < 1) {
      throw new Error("keepCount must be at least 1");
    }

    const result = await pruneDataBackupsUnchecked(input.keepCount);

    log.info({
      action: "data-backup",
      message: "backups pruned",
      deletedCount: result.deletedIds.length,
      remainingCount: result.remainingCount,
    });

    return result;
  });
}

export function getDataBackupStoragePaths(): DataBackupStoragePaths {
  return {
    userDataDir: app.getPath("userData"),
    backupsDir: getDataBackupsDir(),
    pgliteDir: getPgliteDataDir(),
    mapsDir: getMapsRootDir(),
  };
}

export async function openDataBackupStorageFolder(
  target: keyof Pick<
    DataBackupStoragePaths,
    "userDataDir" | "backupsDir" | "pgliteDir" | "mapsDir"
  >,
): Promise<{ ok: true }> {
  const paths = getDataBackupStoragePaths();
  const dir = paths[target];
  await mkdir(dir, { recursive: true });

  const errorMessage = await shell.openPath(dir);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return { ok: true as const };
}
