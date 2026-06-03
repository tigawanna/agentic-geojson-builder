import type { BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  patchMapWorkspaceMenuState,
  setMapWorkspaceMenuState,
} from "@main/lib/map-workspace-menu-state.js";
import { popupApplicationSubmenu } from "@main/menu/popup-application-submenu.js";
import { showMapContextMenu } from "@main/menu/show-map-context-menu.js";
import { showNativeMenu } from "@main/menu/show-native-menu.js";
import { showMapWorkspaceQuickMenu } from "@main/menu/show-map-workspace-quick-menu.js";

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
  "app:showMapWorkspaceQuickMenu": (input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    showMapWorkspaceQuickMenu(window, input);
    return { ok: true as const };
  },
  "app:showNativeMenu": (input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    showNativeMenu(window, input);
    return { ok: true as const };
  },
  "mapWorkspaceMenu:syncState": (input) => {
    setMapWorkspaceMenuState(input);
    return { ok: true as const };
  },
  "mapWorkspaceMenu:patchState": (input) => {
    patchMapWorkspaceMenuState(input);
    return { ok: true as const };
  },
  "app:popupApplicationSubmenu": (input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    return { ok: popupApplicationSubmenu(window, input) };
  },
  "app:hardReload": (_input, window) => {
    if (!window) {
      return { ok: false as const };
    }

    window.webContents.reloadIgnoringCache();
    return { ok: true as const };
  },
};
