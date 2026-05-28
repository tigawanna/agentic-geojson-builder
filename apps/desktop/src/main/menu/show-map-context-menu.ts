import { BrowserWindow, Menu } from "electron";
import type { ShowMapContextMenuInput } from "@shared/menu.types.js";
import { deleteMap } from "@main/lib/pglite/maps.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import { confirmDeleteMap } from "@main/menu/confirm-delete-map.js";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";

export function showMapContextMenu(window: BrowserWindow, input: ShowMapContextMenuInput): void {
  const menu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        sendAppMenuAction({ type: "map-open", mapId: input.mapId });
      },
    },
    { type: "separator" },
    {
      label: "Delete",
      click: () => {
        void (async () => {
          const confirmed = await confirmDeleteMap(window, input.mapName);
          if (!confirmed) {
            return;
          }

          await deleteMap(input.mapId);
          broadcastToRenderers("maps:changed", { reason: "deleted", mapId: input.mapId });
        })();
      },
    },
  ]);

  menu.popup({ window });
}
