import { SHORTCUT_CATEGORIES, type ShortcutCategory } from "@shared/shortcuts/types.js";

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function isMapWorkspacePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return /^\/maps\/[^/]+$/.test(normalized) && normalized !== "/maps/new";
}

function isDataExplorerPath(pathname: string): boolean {
  return /^\/data\/[^/]+$/.test(normalizePathname(pathname));
}

export function getVisibleShortcutCategories(pathname: string): ShortcutCategory[] {
  const categories: ShortcutCategory[] = ["global", "navigation", "system"];

  if (isMapWorkspacePath(pathname)) {
    categories.push("mapWorkspace");
  }

  if (isDataExplorerPath(pathname)) {
    categories.push("dataExplorer");
  }

  return categories;
}

export function isShortcutCategoryVisible(category: ShortcutCategory, pathname: string): boolean {
  return getVisibleShortcutCategories(pathname).includes(category);
}

export { SHORTCUT_CATEGORIES };
