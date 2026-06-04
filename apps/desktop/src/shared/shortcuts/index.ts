export {
  SHORTCUT_CATALOG,
  SHORTCUT_IDS,
  getCatalogEntriesForCategory,
  getShortcut,
  getShortcutElectronAccelerator,
  getShortcutHotkeys,
  type ShortcutId,
} from "@shared/shortcuts/catalog.js";
export { hotkeyToElectronAccelerator } from "@shared/shortcuts/chord-to-accelerator.js";
export {
  SHORTCUT_CATEGORIES,
  type ShortcutCategory,
  type ShortcutDefinition,
  type ShortcutScope,
} from "@shared/shortcuts/types.js";
export { getVisibleShortcutCategories } from "@shared/shortcuts/get-visible-categories.js";
