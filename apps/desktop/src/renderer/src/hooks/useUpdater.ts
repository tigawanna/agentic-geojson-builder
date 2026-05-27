import { useCallback, useEffect, useState } from "react";
import type { IpcEventPayload } from "../../../shared/ipc-contract";
import { ipcInvoke } from "./useIpc";

export type UpdaterStatus = IpcEventPayload<"updater:status">;

/**
 * React hook that subscribes to `updater:status` events from the main process
 * and exposes imperative actions to trigger update checks/downloads/install.
 */
export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null);

  useEffect(() => {
    return window.api.on("updater:status", setStatus);
  }, []);

  const checkForUpdates = useCallback(() => ipcInvoke("updater:check", undefined), []);
  const downloadUpdate = useCallback(() => ipcInvoke("updater:download", undefined), []);
  const quitAndInstall = useCallback(() => ipcInvoke("updater:quitAndInstall", undefined), []);

  return { status, checkForUpdates, downloadUpdate, quitAndInstall };
}
