export const DATA_BACKUP_MANIFEST_VERSION = 2;

export type BackupComponentKey = "pglite" | "maps";

export type BackupComponentStats = {
  present: true;
  fileCount: number;
  sizeBytes: number;
};

export type DataBackupManifestV2 = {
  version: typeof DATA_BACKUP_MANIFEST_VERSION;
  id: string;
  createdAt: string;
  label: string | null;
  appVersion: string;
  mapCount: number;
  components: {
    pglite: BackupComponentStats | null;
    maps: BackupComponentStats | null;
  };
};

export type DataBackupManifestLegacy = {
  id: string;
  createdAt: string;
  label: string | null;
  mapCount: number;
};

export type DataBackupManifest = DataBackupManifestV2 | DataBackupManifestLegacy;

export type BackupHealthStatus = "healthy" | "incomplete" | "corrupt";

export type DataBackupInfo = {
  id: string;
  createdAt: string;
  label: string | null;
  appVersion: string | null;
  mapCount: number;
  sizeBytes: number;
  status: BackupHealthStatus;
  isDual: boolean;
  components: {
    pglite: boolean;
    maps: boolean;
  };
};

export type DataBackupListResult = {
  backups: DataBackupInfo[];
};

export type DataBackupVerifyResult = {
  backupId: string;
  ok: boolean;
  status: BackupHealthStatus;
  issues: string[];
};

export type CreateDataBackupInput = {
  label?: string;
  includeMaps?: boolean;
  maxBackups?: number;
};

export type RestoreDataBackupInput = {
  backupId: string;
  createSafetyBackup?: boolean;
};

export type DeleteDataBackupInput = {
  backupId: string;
};

export type PruneDataBackupsInput = {
  keepCount: number;
};

export type PruneDataBackupsResult = {
  deletedIds: string[];
  remainingCount: number;
};

export type GetDataBackupInput = {
  backupId: string;
};

export type VerifyDataBackupInput = {
  backupId: string;
};

export type DbBackupChangedEvent = {
  reason: "created" | "restored" | "deleted" | "pruned";
  backupId?: string;
};

export type DataBackupStoragePaths = {
  userDataDir: string;
  backupsDir: string;
  pgliteDir: string;
  mapsDir: string;
};
