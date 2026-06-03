export type AppMenuNavigatePath = "/" | "/maps" | "/mapbox" | "/settings" | "/about";

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

export type NativeMenuHeaderEntry = {
  kind: "header";
  label: string;
};

export type NativeMenuCheckboxEntry = {
  kind: "checkbox";
  id: string;
  label: string;
  checked: boolean;
};

export type NativeMenuRadioEntry = {
  kind: "radio";
  id: string;
  label: string;
  checked: boolean;
};

export type NativeMenuSeparatorEntry = {
  kind: "separator";
};

export type NativeMenuActionEntry = {
  kind: "action";
  id: string;
  label: string;
};

export type NativeMenuEntry =
  | NativeMenuHeaderEntry
  | NativeMenuCheckboxEntry
  | NativeMenuRadioEntry
  | NativeMenuSeparatorEntry
  | NativeMenuActionEntry;

export type ShowNativeMenuInput = {
  x: number;
  y: number;
  items: NativeMenuEntry[];
};

export type AppMenuAction =
  | { type: "navigate"; path: AppMenuNavigatePath }
  | { type: "new-map-project" }
  | { type: "map-open"; mapId: number }
  | { type: "check-updates" }
  | { type: "workspace-quick-menu-toggle"; id: MapWorkspaceQuickMenuItemId }
  | { type: "native-menu"; id: string }
  | { type: "mapbox-menu"; id: string }
  | { type: "map-workspace-menu"; id: string };

export type ShowMapContextMenuInput = {
  mapId: number;
  mapName: string;
};
