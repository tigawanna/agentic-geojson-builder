export type TileStyle = "outline" | "standard" | "satellite";

export type SquareBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
  centerLatitude: number;
  centerLongitude: number;
  halfSideMeters: number;
};

export type TileCoordinate = {
  z: number;
  x: number;
  y: number;
};

export type TileCacheManifest = {
  mapId: number;
  style: TileStyle;
  bounds: SquareBounds;
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  builtAt: string;
  attribution: string;
};

export type MapSectorView = {
  mapId: number;
  style: TileStyle;
  center: { latitude: number; longitude: number };
  zoom: number;
  width: number;
  height: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  metersPerPixel: number;
  mimeType: "image/png";
  imageBase64: string;
  cacheHit: boolean;
  missingTileCount: number;
};
