import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createDataBackup,
  deleteDataBackup,
  getDataBackup,
  getDataBackupStoragePaths,
  listDataBackups,
  openDataBackupStorageFolder,
  pruneDataBackups,
  restoreDataBackup,
  verifyDataBackup,
} from "@main/lib/data-backup/data-backup.service.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const dataBackupHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "dbBackup:list": async () => listDataBackups(),
  "dbBackup:get": async (input) => getDataBackup(input),
  "dbBackup:verify": async (input) => verifyDataBackup(input),
  "dbBackup:create": async (input) => createDataBackup(input),
  "dbBackup:restore": async (input) => restoreDataBackup(input),
  "dbBackup:delete": async (input) => deleteDataBackup(input),
  "dbBackup:prune": async (input) => pruneDataBackups(input),
  "dbBackup:getStoragePaths": async () => getDataBackupStoragePaths(),
  "dbBackup:openStorageFolder": async (input) => openDataBackupStorageFolder(input.target),
};
