import { BrowserWindow, Menu } from "electron";
import type { PopupApplicationSubmenuInput } from "@shared/application-menu.types.js";

export function popupApplicationSubmenu(
  window: BrowserWindow,
  input: PopupApplicationSubmenuInput,
): boolean {
  const applicationMenu = Menu.getApplicationMenu();
  if (!applicationMenu) {
    return false;
  }

  const match = applicationMenu.items.find((item) => item.label === input.label);
  if (!match?.submenu) {
    return false;
  }

  match.submenu.popup({
    window,
    x: Math.round(input.x),
    y: Math.round(input.y),
  });
  return true;
}
