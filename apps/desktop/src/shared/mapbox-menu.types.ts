export type MapboxGlStyleId = "outdoors" | "satellite-streets" | "streets" | "light" | "dark";

export const MAPBOX_GL_STYLE_ORDER: MapboxGlStyleId[] = [
  "outdoors",
  "satellite-streets",
  "streets",
  "light",
  "dark",
];

export const MAPBOX_GL_STYLE_MENU_LABELS: Record<MapboxGlStyleId, string> = {
  outdoors: "Outdoors",
  "satellite-streets": "Satellite",
  streets: "Streets",
  light: "Light",
  dark: "Dark",
};

export type MapboxMenuSyncState = {
  routeActive: boolean;
  styleId: MapboxGlStyleId;
  inspectMode: boolean;
  showPendingCaptures: boolean;
  showApprovedCaptures: boolean;
};

export const DEFAULT_MAPBOX_MENU_SYNC_STATE: MapboxMenuSyncState = {
  routeActive: false,
  styleId: "outdoors",
  inspectMode: false,
  showPendingCaptures: true,
  showApprovedCaptures: true,
};
