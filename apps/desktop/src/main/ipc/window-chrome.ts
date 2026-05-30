import type { BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
  window: BrowserWindow | null,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const windowChromeHandlers = {
  "window:minimize": ((_req, window) => {
    window?.minimize();
    return { ok: true as const };
  }) satisfies Handler<"window:minimize">,

  "window:toggleMaximize": ((_req, window) => {
    if (!window) {
      return { ok: true as const, maximized: false };
    }
    if (window.isMaximized()) {
      window.unmaximize();
      return { ok: true as const, maximized: false };
    }
    window.maximize();
    return { ok: true as const, maximized: true };
  }) satisfies Handler<"window:toggleMaximize">,

  "window:close": ((_req, window) => {
    window?.close();
    return { ok: true as const };
  }) satisfies Handler<"window:close">,
} satisfies Partial<{ [K in IpcChannel]: Handler<K> }>;
