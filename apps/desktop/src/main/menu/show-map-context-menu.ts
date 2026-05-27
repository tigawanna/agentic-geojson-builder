import { BrowserWindow, Menu } from "electron";
import type { ShowMapContextMenuInput } from "../../shared/menu.types.js";
import { sendAppMenuAction } from "./menu-actions.js";

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
        sendAppMenuAction({
          type: "map-delete",
          mapId: input.mapId,
          mapName: input.mapName,
        });
      },
    },
  ]);

  menu.popup({ window });
}
