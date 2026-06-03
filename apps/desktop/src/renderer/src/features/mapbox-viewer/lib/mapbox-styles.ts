import type { MapboxGlStyleId } from "@shared/mapbox-menu.types";

export type { MapboxGlStyleId } from "@shared/mapbox-menu.types";
export { MAPBOX_GL_STYLE_ORDER } from "@shared/mapbox-menu.types";

export const MAPBOX_GL_STYLES: Record<MapboxGlStyleId, string> = {
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  "satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
};
