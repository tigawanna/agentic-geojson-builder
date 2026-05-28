import type { MapBaseMapStyle } from "./maps.types.js";

export type TileCacheCorner = {
  latitude: number;
  longitude: number;
};

export type TileCacheBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
  centerLatitude: number;
  centerLongitude: number;
  halfSideMeters: number;
};

export type MapTileCacheConfig = {
  mapId: number;
  centerLat: number;
  centerLng: number;
  halfSideMeters: number;
  minZoom: number;
  maxZoom: number;
  style: MapBaseMapStyle;
  tileCount: number;
  builtAt: string | null;
  bounds: TileCacheBounds;
};

export type SetTileCacheBoundsInput = {
  mapId: number;
  corners: TileCacheCorner[];
  style?: MapBaseMapStyle;
  minZoom?: number;
  maxZoom?: number;
};

export type BuildTileCacheResult = {
  config: MapTileCacheConfig;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
};

export type TileCacheBuildProgressEvent = {
  mapId: number;
  completed: number;
  total: number;
  z: number;
};

export type GetMapSectorViewInput = {
  mapId: number;
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  style?: MapBaseMapStyle;
};

export type MapSectorViewResult = {
  mapId: number;
  style: MapBaseMapStyle;
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
  attribution: string;
  cacheBounds: TileCacheBounds;
};

export const TILE_CACHE_ZOOM_MIN = 10;
export const TILE_CACHE_ZOOM_MAX = 19;
export const TILE_CACHE_DEFAULT_MIN_ZOOM = 11;
export const TILE_CACHE_DEFAULT_MAX_ZOOM = 17;

export const TILE_SERVER_PORT = 3848;

export function getLocalTileUrl(mapId: number, style: MapBaseMapStyle): string {
  return `http://127.0.0.1:${TILE_SERVER_PORT}/tiles/${mapId}/${style}/{z}/{x}/{y}.png`;
}
