import { hotkeyToElectronAccelerator } from "@shared/shortcuts/chord-to-accelerator.js";
import type {
  ShortcutCategory,
  ShortcutDefinition,
  ShortcutScope,
} from "@shared/shortcuts/types.js";

export const SHORTCUT_IDS = {
  showKeyboardShortcuts: "show-keyboard-shortcuts",
  newMapProject: "new-map-project",
  navigateHome: "navigate-home",
  navigateMaps: "navigate-maps",
  openAppSettings: "open-app-settings",
  mapSettings: "map-settings",
  openChangeHistory: "open-change-history",
  toggleToolsPanel: "toggle-tools-panel",
  mapboxInspect: "mapbox-inspect",
  toggleTrailInspect: "toggle-trail-inspect",
  copyInspectCoordinates: "copy-inspect-coordinates",
  mapboxPinInspect: "mapbox-pin-inspect",
  mapboxSaveToCollection: "mapbox-save-to-collection",
  undo: "undo",
  redo: "redo",
  deleteSelectedSegment: "delete-selected-segment",
  editUndo: "edit-undo",
  editRedo: "edit-redo",
  editCut: "edit-cut",
  editCopy: "edit-copy",
  editPaste: "edit-paste",
  editSelectAll: "edit-select-all",
} as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[keyof typeof SHORTCUT_IDS];

function defineShortcut(
  id: ShortcutId,
  hotkey: string,
  labelKey: string,
  categories: ShortcutCategory[],
  scope: ShortcutScope,
): ShortcutDefinition {
  const electronAccelerator =
    scope === "electronMenu" || scope === "both" ? hotkeyToElectronAccelerator(hotkey) : undefined;
  return {
    id,
    hotkey,
    labelKey,
    categories,
    scope,
    electronAccelerator,
  };
}

export const SHORTCUT_CATALOG: readonly ShortcutDefinition[] = [
  defineShortcut(
    SHORTCUT_IDS.showKeyboardShortcuts,
    "Shift+?",
    "shortcuts.items.showKeyboardShortcuts",
    ["global"],
    "renderer",
  ),
  defineShortcut(
    SHORTCUT_IDS.newMapProject,
    "Mod+N",
    "shortcuts.items.newMapProject",
    ["navigation"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.navigateHome,
    "Mod+1",
    "shortcuts.items.navigateHome",
    ["navigation"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.navigateMaps,
    "Mod+2",
    "shortcuts.items.navigateMaps",
    ["navigation"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.openAppSettings,
    "Mod+,",
    "shortcuts.items.openAppSettings",
    ["navigation"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.mapSettings,
    "Mod+,",
    "shortcuts.items.mapSettings",
    ["mapWorkspace"],
    "both",
  ),
  defineShortcut(
    SHORTCUT_IDS.openChangeHistory,
    "Mod+Shift+H",
    "shortcuts.items.openChangeHistory",
    ["mapWorkspace"],
    "both",
  ),
  defineShortcut(
    SHORTCUT_IDS.toggleToolsPanel,
    "Mod+Shift+P",
    "shortcuts.items.toggleToolsPanel",
    ["mapWorkspace"],
    "both",
  ),
  defineShortcut(
    SHORTCUT_IDS.mapboxInspect,
    "Mod+Shift+M",
    "shortcuts.items.mapboxInspect",
    ["mapWorkspace", "dataExplorer"],
    "both",
  ),
  defineShortcut(
    SHORTCUT_IDS.toggleTrailInspect,
    "Mod+Shift+T",
    "shortcuts.items.toggleTrailInspect",
    ["mapWorkspace", "dataExplorer"],
    "both",
  ),
  defineShortcut(
    SHORTCUT_IDS.copyInspectCoordinates,
    "Mod+C",
    "shortcuts.items.copyInspectCoordinates",
    ["mapWorkspace", "dataExplorer"],
    "renderer",
  ),
  defineShortcut(
    SHORTCUT_IDS.mapboxPinInspect,
    "Click",
    "shortcuts.items.mapboxPinInspect",
    ["mapWorkspace"],
    "help",
  ),
  defineShortcut(
    SHORTCUT_IDS.mapboxSaveToCollection,
    "Mod+Click",
    "shortcuts.items.mapboxSaveToCollection",
    ["mapWorkspace"],
    "help",
  ),
  defineShortcut(SHORTCUT_IDS.undo, "Mod+Z", "shortcuts.items.undo", ["mapWorkspace"], "renderer"),
  defineShortcut(
    SHORTCUT_IDS.redo,
    "Mod+Shift+Z",
    "shortcuts.items.redo",
    ["mapWorkspace"],
    "renderer",
  ),
  defineShortcut(
    SHORTCUT_IDS.deleteSelectedSegment,
    "Delete",
    "shortcuts.items.deleteSelectedSegment",
    ["mapWorkspace"],
    "renderer",
  ),
  defineShortcut(
    SHORTCUT_IDS.deleteSelectedSegment,
    "Backspace",
    "shortcuts.items.deleteSelectedSegment",
    ["mapWorkspace"],
    "renderer",
  ),
  defineShortcut(
    SHORTCUT_IDS.editUndo,
    "Mod+Z",
    "shortcuts.items.editUndo",
    ["system"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.editRedo,
    "Mod+Shift+Z",
    "shortcuts.items.editRedo",
    ["system"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.editCut,
    "Mod+X",
    "shortcuts.items.editCut",
    ["system"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.editCopy,
    "Mod+C",
    "shortcuts.items.editCopy",
    ["system"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.editPaste,
    "Mod+V",
    "shortcuts.items.editPaste",
    ["system"],
    "electronMenu",
  ),
  defineShortcut(
    SHORTCUT_IDS.editSelectAll,
    "Mod+A",
    "shortcuts.items.editSelectAll",
    ["system"],
    "electronMenu",
  ),
] as const;

const primaryById = new Map<ShortcutId, ShortcutDefinition>();

for (const entry of SHORTCUT_CATALOG) {
  if (!primaryById.has(entry.id as ShortcutId)) {
    primaryById.set(entry.id as ShortcutId, entry);
  }
}

export function getShortcut(id: ShortcutId): ShortcutDefinition {
  const entry = primaryById.get(id);
  if (!entry) {
    throw new Error(`Unknown shortcut id: ${id}`);
  }
  return entry;
}

export function getShortcutHotkeys(id: ShortcutId): string[] {
  return SHORTCUT_CATALOG.filter((entry) => entry.id === id).map((entry) => entry.hotkey);
}

export function getShortcutElectronAccelerator(id: ShortcutId): string | undefined {
  return getShortcut(id).electronAccelerator;
}

export function getCatalogEntriesForCategory(category: ShortcutCategory): ShortcutDefinition[] {
  return SHORTCUT_CATALOG.filter((entry) => entry.categories.includes(category));
}
