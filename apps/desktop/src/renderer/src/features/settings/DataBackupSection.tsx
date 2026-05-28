import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import type {
  BackupHealthStatus,
  DataBackupInfo,
  DataBackupStoragePaths,
} from "@shared/data-backup.types";
import { useIpcMutation, useIpcQuery } from "@renderer/hooks/useIpc";

const backupListQueryKey = ["dbBackup:list", undefined] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function statusBadgeClass(status: BackupHealthStatus): string {
  if (status === "healthy") return "badge-success";
  if (status === "incomplete") return "badge-warning";
  return "badge-error";
}

export function DataBackupSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyBackupId, setBusyBackupId] = useState<string | null>(null);

  const backups = useIpcQuery("dbBackup:list", undefined);
  const storagePaths = useIpcQuery("dbBackup:getStoragePaths", undefined, {
    staleTime: Number.POSITIVE_INFINITY,
  });
  const openFolder = useIpcMutation("dbBackup:openStorageFolder");

  useEffect(() => {
    return window.api.on("dbBackup:changed", () => {
      void queryClient.invalidateQueries({ queryKey: backupListQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["maps:list"] });
    });
  }, [queryClient]);

  const createBackup = useIpcMutation("dbBackup:create", {
    onSuccess: () => {
      setMessage(t("settings.backup.created"));
      setLabel("");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const restoreBackup = useIpcMutation("dbBackup:restore", {
    onSuccess: () => {
      setMessage(t("settings.backup.restored"));
      setError(null);
      setBusyBackupId(null);
    },
    onError: (err) => {
      setError(err.message);
      setBusyBackupId(null);
    },
  });

  const deleteBackup = useIpcMutation("dbBackup:delete", {
    onSuccess: () => {
      setMessage(t("settings.backup.deleted"));
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const pruneBackups = useIpcMutation("dbBackup:prune", {
    onSuccess: (result) => {
      setMessage(t("settings.backup.pruned", { count: result.deletedIds.length }));
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const isBusy =
    createBackup.isPending ||
    restoreBackup.isPending ||
    deleteBackup.isPending ||
    pruneBackups.isPending;

  function handleCreate() {
    setMessage(null);
    setError(null);
    createBackup.mutate({
      label: label.trim() || undefined,
      includeMaps: true,
    });
  }

  function handleRestore(backup: DataBackupInfo) {
    if (backup.status === "corrupt") return;
    const confirmed = window.confirm(
      t("settings.backup.restoreConfirm", { date: formatDate(backup.createdAt) }),
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setBusyBackupId(backup.id);
    restoreBackup.mutate({
      backupId: backup.id,
      createSafetyBackup: true,
    });
  }

  function handleDelete(backup: DataBackupInfo) {
    const confirmed = window.confirm(
      t("settings.backup.deleteConfirm", { date: formatDate(backup.createdAt) }),
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    deleteBackup.mutate({ backupId: backup.id });
  }

  function handlePrune() {
    setMessage(null);
    setError(null);
    pruneBackups.mutate({ keepCount: 10 });
  }

  const items = backups.data?.backups ?? [];

  return (
    <article className="glass-card p-5">
      <h3 className="text-base font-semibold">{t("settings.backup.heading")}</h3>
      <p className="mt-1 text-sm text-base-content/60">{t("settings.backup.description")}</p>

      {storagePaths.data ? (
        <div className="mt-5 rounded-lg border border-base-content/10 bg-base-200/30 p-4">
          <h4 className="text-sm font-medium">{t("settings.backup.locationsHeading")}</h4>
          <p className="mt-1 text-xs text-base-content/60">{t("settings.backup.locationsHint")}</p>
          <ul className="mt-3 space-y-2">
            <StoragePathRow
              label={t("settings.backup.pathUserData")}
              path={storagePaths.data.userDataDir}
              target="userDataDir"
              disabled={isBusy || openFolder.isPending}
              onOpen={(target) => openFolder.mutate({ target })}
              onCopy={async (path) => {
                await navigator.clipboard.writeText(path);
                setMessage(t("settings.backup.copiedPath"));
                setError(null);
              }}
              openLabel={t("settings.backup.openFolder")}
              copyLabel={t("settings.backup.copyPath")}
            />
            <StoragePathRow
              label={t("settings.backup.pathBackups")}
              path={storagePaths.data.backupsDir}
              target="backupsDir"
              disabled={isBusy || openFolder.isPending}
              onOpen={(target) => openFolder.mutate({ target })}
              onCopy={async (path) => {
                await navigator.clipboard.writeText(path);
                setMessage(t("settings.backup.copiedPath"));
                setError(null);
              }}
              openLabel={t("settings.backup.openFolder")}
              copyLabel={t("settings.backup.copyPath")}
            />
            <StoragePathRow
              label={t("settings.backup.pathDatabase")}
              path={storagePaths.data.pgliteDir}
              target="pgliteDir"
              disabled={isBusy || openFolder.isPending}
              onOpen={(target) => openFolder.mutate({ target })}
              onCopy={async (path) => {
                await navigator.clipboard.writeText(path);
                setMessage(t("settings.backup.copiedPath"));
                setError(null);
              }}
              openLabel={t("settings.backup.openFolder")}
              copyLabel={t("settings.backup.copyPath")}
            />
            <StoragePathRow
              label={t("settings.backup.pathMaps")}
              path={storagePaths.data.mapsDir}
              target="mapsDir"
              disabled={isBusy || openFolder.isPending}
              onOpen={(target) => openFolder.mutate({ target })}
              onCopy={async (path) => {
                await navigator.clipboard.writeText(path);
                setMessage(t("settings.backup.copiedPath"));
                setError(null);
              }}
              openLabel={t("settings.backup.openFolder")}
              copyLabel={t("settings.backup.copyPath")}
            />
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="form-control min-w-0 flex-1">
          <span className="label-text mb-1 text-xs text-base-content/60">
            {t("settings.backup.labelOptional")}
          </span>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={isBusy}
            className="input-bordered selectable input w-full"
            placeholder={t("settings.backup.labelPlaceholder")}
          />
        </label>
        <button type="button" onClick={handleCreate} disabled={isBusy} className="btn btn-primary">
          {createBackup.isPending ? t("settings.backup.creating") : t("settings.backup.create")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePrune}
          disabled={isBusy || items.length === 0}
          className="btn btn-outline btn-sm"
        >
          {t("settings.backup.prune")}
        </button>
        <button
          type="button"
          onClick={() => void queryClient.invalidateQueries({ queryKey: backupListQueryKey })}
          disabled={isBusy}
          className="btn btn-ghost btn-sm"
        >
          {t("settings.backup.refresh")}
        </button>
      </div>

      {backups.isLoading ? (
        <p className="mt-4 text-sm text-base-content/60">{t("settings.backup.loading")}</p>
      ) : null}

      {items.length === 0 && !backups.isLoading ? (
        <p className="mt-4 text-sm text-base-content/60">{t("settings.backup.empty")}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-base-content/10 rounded-lg border border-base-content/10">
          {items.map((backup) => (
            <li
              key={backup.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {backup.label ?? formatDate(backup.createdAt)}
                  </span>
                  <span className={`badge badge-sm ${statusBadgeClass(backup.status)}`}>
                    {t(`settings.backup.status.${backup.status}`)}
                  </span>
                  {backup.isDual ? (
                    <span className="badge badge-outline badge-sm">
                      {t("settings.backup.dual")}
                    </span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">
                      {t("settings.backup.databaseOnly")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-base-content/60">
                  {formatDate(backup.createdAt)} · {formatBytes(backup.sizeBytes)} ·{" "}
                  {t("settings.backup.mapCount", { count: backup.mapCount })}
                </p>
                {backup.label ? (
                  <p className="mt-0.5 font-mono text-xs text-base-content/50">{backup.id}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(backup)}
                  disabled={isBusy || backup.status === "corrupt"}
                  className="btn btn-outline btn-sm"
                >
                  {busyBackupId === backup.id && restoreBackup.isPending
                    ? t("settings.backup.restoring")
                    : t("settings.backup.restore")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(backup)}
                  disabled={isBusy}
                  className="btn text-error btn-ghost btn-sm"
                >
                  {t("settings.backup.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
    </article>
  );
}

type StoragePathTarget = keyof Pick<
  DataBackupStoragePaths,
  "userDataDir" | "backupsDir" | "pgliteDir" | "mapsDir"
>;

function StoragePathRow({
  label,
  path,
  target,
  disabled,
  onOpen,
  onCopy,
  openLabel,
  copyLabel,
}: {
  label: string;
  path: string;
  target: StoragePathTarget;
  disabled: boolean;
  onOpen: (target: StoragePathTarget) => void;
  onCopy: (path: string) => Promise<void>;
  openLabel: string;
  copyLabel: string;
}) {
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-base-content/70">{label}</p>
        <p className="mt-0.5 font-mono text-xs break-all text-base-content/80">{path}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onCopy(path)}
          className="btn btn-ghost btn-xs"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onOpen(target)}
          className="btn btn-outline btn-xs"
        >
          {openLabel}
        </button>
      </div>
    </li>
  );
}
