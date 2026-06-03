import type { MenuItemConstructorOptions } from "electron";
import { MAPBOX_GL_STYLE_MENU_LABELS, MAPBOX_GL_STYLE_ORDER } from "@shared/mapbox-menu.types.js";
import { getMapboxMenuState } from "@main/lib/mapbox-menu-state.js";
import { sendAppMenuAction } from "@main/menu/menu-actions.js";

export function buildMapboxMenuSubmenu(): MenuItemConstructorOptions[] {
  const state = getMapboxMenuState();

  const styleSubmenu: MenuItemConstructorOptions[] = MAPBOX_GL_STYLE_ORDER.map((styleId) => ({
    label: MAPBOX_GL_STYLE_MENU_LABELS[styleId],
    type: "radio",
    checked: state.styleId === styleId,
    click: () => {
      sendAppMenuAction({ type: "mapbox-menu", id: `style:${styleId}` });
    },
  }));

  return [
    {
      label: "Base Map Style",
      submenu: styleSubmenu,
    },
    { type: "separator" },
    {
      label: "Toggle Inspect Mode",
      accelerator: "CmdOrCtrl+Shift+I",
      type: "checkbox",
      checked: state.inspectMode,
      click: () => {
        sendAppMenuAction({ type: "mapbox-menu", id: "inspect-mode" });
      },
    },
    {
      label: "Show Pending Captures",
      type: "checkbox",
      checked: state.showPendingCaptures,
      click: () => {
        sendAppMenuAction({ type: "mapbox-menu", id: "show-pending" });
      },
    },
    {
      label: "Show Approved Captures",
      type: "checkbox",
      checked: state.showApprovedCaptures,
      click: () => {
        sendAppMenuAction({ type: "mapbox-menu", id: "show-approved" });
      },
    },
    { type: "separator" },
    {
      label: "Open Collection…",
      click: () => {
        sendAppMenuAction({ type: "mapbox-menu", id: "open-collection" });
      },
    },
  ];
}
