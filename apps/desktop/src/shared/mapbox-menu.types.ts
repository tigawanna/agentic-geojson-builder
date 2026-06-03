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
