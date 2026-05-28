import type { BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { showMapContextMenu } from "@main/menu/show-map-context-menu.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
  window: BrowserWindow | null,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const appMenuHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "app:showMapContextMenu": (input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    showMapContextMenu(window, input);
    return { ok: true as const };
  },
  "app:hardReload": (_input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    window.webContents.reloadIgnoringCache();
    return { ok: true as const };
  },
};
