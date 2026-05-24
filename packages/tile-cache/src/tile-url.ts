import type { TileStyle } from "./types";

const STYLE_ATTRIBUTION: Record<TileStyle, string> = {
  outline:
    "© OpenStreetMap © CARTO — tiles cached for offline agent prototype use",
  standard: "© OpenStreetMap contributors — tiles cached for offline agent prototype use",
  satellite:
    "© Esri — tiles cached for offline agent prototype use",
};

export function getTileAttribution(style: TileStyle) {
  return STYLE_ATTRIBUTION[style];
}

export function buildTileUrl(style: TileStyle, z: number, x: number, y: number) {
  switch (style) {
    case "standard":
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    case "satellite":
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    case "outline":
      return `https://a.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}@2x.png`;
    default: {
      const exhaustive: never = style;
      return exhaustive;
    }
  }
}
