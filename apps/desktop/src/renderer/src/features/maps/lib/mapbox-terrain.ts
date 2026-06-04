import type mapboxgl from "mapbox-gl";

const TERRAIN_SOURCE_ID = "mapbox-terrain-dem";
const SKY_LAYER_ID = "mapbox-terrain-sky";

export function enableMapboxTerrain(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) {
    return;
  }

  try {
    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });

    if (!map.getLayer(SKY_LAYER_ID)) {
      map.addLayer({
        id: SKY_LAYER_ID,
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0, 0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });
    }
  } catch {
    return;
  }
}
