export type AppMenuNavigatePath = "/" | "/maps" | "/settings" | "/about";

export type MapWorkspaceQuickMenuItemId =
  | "reference-overlay"
  | "reference-inspect-tooltip"
  | "control-point-drag";

export type MapWorkspaceQuickMenuItem = {
  id: MapWorkspaceQuickMenuItemId;
  label: string;
  checked: boolean;
};

export type ShowMapWorkspaceQuickMenuInput = {
  x: number;
  y: number;
  items: MapWorkspaceQuickMenuItem[];
};

export type AppMenuAction =
  | { type: "navigate"; path: AppMenuNavigatePath }
  | { type: "new-map-project" }
  | { type: "map-open"; mapId: number }
  | { type: "check-updates" }
  | { type: "workspace-quick-menu-toggle"; id: MapWorkspaceQuickMenuItemId };

export type ShowMapContextMenuInput = {
  mapId: number;
  mapName: string;
};
