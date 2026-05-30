import { BrowserWindow, Menu } from "electron";
import type { ShowMapWorkspaceQuickMenuInput } from "@shared/menu.types.js";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";

export function showMapWorkspaceQuickMenu(
  window: BrowserWindow,
  input: ShowMapWorkspaceQuickMenuInput,
): void {
  const menu = Menu.buildFromTemplate(
    input.items.map((item) => ({
      label: item.label,
      type: "checkbox" as const,
      checked: item.checked,
      click: () => {
        sendAppMenuAction({ type: "workspace-quick-menu-toggle", id: item.id });
      },
    })),
  );

  menu.popup({
    window,
    x: input.x,
    y: input.y,
  });
}
