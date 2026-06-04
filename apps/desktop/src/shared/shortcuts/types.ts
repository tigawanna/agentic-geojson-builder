export const SHORTCUT_CATEGORIES = [
  "global",
  "navigation",
  "mapWorkspace",
  "dataExplorer",
  "system",
] as const;

export type ShortcutCategory = (typeof SHORTCUT_CATEGORIES)[number];

export type ShortcutScope = "renderer" | "electronMenu" | "both" | "help";

export type ShortcutDefinition = {
  id: string;
  hotkey: string;
  labelKey: string;
  categories: ShortcutCategory[];
  scope: ShortcutScope;
  electronAccelerator?: string;
};
