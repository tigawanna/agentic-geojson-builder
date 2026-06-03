export const APPLICATION_MENU_TOP_LEVELS = [
  "File",
  "Edit",
  "View",
  "Mapbox",
  "Go",
  "Help",
] as const;

export type ApplicationMenuTopLevelLabel = (typeof APPLICATION_MENU_TOP_LEVELS)[number];

export type PopupApplicationSubmenuInput = {
  label: ApplicationMenuTopLevelLabel;
  x: number;
  y: number;
};
