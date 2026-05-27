import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import { checkForUpdates, downloadUpdate, quitAndInstallUpdate } from "../updater.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const updaterHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "updater:check": async () => checkForUpdates(),
  "updater:download": async () => {
    await downloadUpdate();
    return { ok: true as const };
  },
  "updater:quitAndInstall": async () => {
    quitAndInstallUpdate();
    return { ok: true as const };
  },
};
