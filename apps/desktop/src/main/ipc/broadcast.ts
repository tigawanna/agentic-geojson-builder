import { BrowserWindow } from "electron";
import type { IpcEventName, IpcEventPayload } from "../../shared/ipc-contract.js";

export function broadcastToRenderers<K extends IpcEventName>(
  event: K,
  payload: IpcEventPayload<K>,
): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(event, payload);
    }
  }
}
