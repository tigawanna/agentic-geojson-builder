export const BACKUP_MANIFEST_VERSION = 2;
export const MANIFEST_FILE = "manifest.json";
export const PGDATA_SUBDIR = "pglite";
export const MAPS_SUBDIR = "maps";
export const STAGING_SUFFIX = ".staging";
export const LIVE_STAGING_PREFIX = ".restore-live-";
export const DEFAULT_MAX_BACKUPS = 10;
export const SAFETY_BACKUP_LABEL = "Auto backup before restore";

export const BACKUP_ID_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z$/;
