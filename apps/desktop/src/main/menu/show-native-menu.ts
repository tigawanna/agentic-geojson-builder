import { BrowserWindow, Menu } from "electron";
import type { ShowNativeMenuInput } from "@shared/menu.types.js";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";

export function showNativeMenu(window: BrowserWindow, input: ShowNativeMenuInput): void {
  const menu = Menu.buildFromTemplate(
    input.items.map((entry) => {
      if (entry.kind === "separator") {
        return { type: "separator" as const };
      }

      if (entry.kind === "header") {
        return {
          label: entry.label,
          enabled: false,
        };
      }

      if (entry.kind === "checkbox") {
        return {
          label: entry.label,
          type: "checkbox" as const,
          checked: entry.checked,
          click: () => {
            sendAppMenuAction({ type: "native-menu", id: entry.id });
          },
        };
      }

      if (entry.kind === "action") {
        return {
          label: entry.label,
          click: () => {
            sendAppMenuAction({ type: "native-menu", id: entry.id });
          },
        };
      }

      return {
        label: entry.label,
        type: "radio" as const,
        checked: entry.checked,
        click: () => {
          sendAppMenuAction({ type: "native-menu", id: entry.id });
        },
      };
    }),
  );

  menu.popup({
    window,
    x: input.x,
    y: input.y,
  });
}
