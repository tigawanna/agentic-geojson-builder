import type { MapboxGlStyleId } from "@shared/mapbox-menu.types";
import type { MapBaseMapStyle } from "@shared/maps.types";

export type { MapboxGlStyleId } from "@shared/mapbox-menu.types";
export { MAPBOX_GL_STYLE_ORDER, MAPBOX_GL_STYLE_MENU_LABELS } from "@shared/mapbox-menu.types";

export const MAPBOX_GL_STYLES: Record<MapboxGlStyleId, string> = {
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  "satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
};

export function resolveMapboxGlStyleId(
  explicit: MapboxGlStyleId | null,
  baseMapStyle: MapBaseMapStyle,
): MapboxGlStyleId {
  if (explicit) {
    return explicit;
  }
  if (baseMapStyle === "satellite" || baseMapStyle === "mapbox-satellite") {
    return "satellite-streets";
  }
  return "outdoors";
}
