import type { SquareBounds, TileCoordinate } from "./types";

const TILE_SIZE = 256;
const EARTH_RADIUS_METERS = 6378137;

export function squareBoundsFromCenter(
  centerLatitude: number,
  centerLongitude: number,
  halfSideMeters: number,
): SquareBounds {
  const latDelta = (halfSideMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const lngDelta =
    (halfSideMeters / (EARTH_RADIUS_METERS * Math.cos((centerLatitude * Math.PI) / 180))) *
    (180 / Math.PI);

  return {
    centerLatitude,
    centerLongitude,
    halfSideMeters,
    north: centerLatitude + latDelta,
    south: centerLatitude - latDelta,
    east: centerLongitude + lngDelta,
    west: centerLongitude - lngDelta,
  };
}

export function isPointInSquareBounds(
  latitude: number,
  longitude: number,
  bounds: SquareBounds,
) {
  return (
    latitude <= bounds.north &&
    latitude >= bounds.south &&
    longitude <= bounds.east &&
    longitude >= bounds.west
  );
}

export function lonToTileX(longitude: number, zoom: number) {
  const scale = 2 ** zoom;
  return Math.floor(((longitude + 180) / 360) * scale);
}

export function latToTileY(latitude: number, zoom: number) {
  const scale = 2 ** zoom;
  const latRad = (latitude * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  );
}

export function tileXToLon(x: number, zoom: number) {
  return (x / 2 ** zoom) * 360 - 180;
}

export function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function latLngToWorldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function worldPixelToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude, longitude };
}

export function listTilesForBounds(bounds: SquareBounds, zoom: number): TileCoordinate[] {
  const minX = lonToTileX(bounds.west, zoom);
  const maxX = lonToTileX(bounds.east, zoom);
  const minY = latToTileY(bounds.north, zoom);
  const maxY = latToTileY(bounds.south, zoom);
  const tiles: TileCoordinate[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ z: zoom, x, y });
    }
  }

  return tiles;
}

export function sectorBoundsFromCenter(
  centerLatitude: number,
  centerLongitude: number,
  zoom: number,
  width: number,
  height: number,
) {
  const center = latLngToWorldPixel(centerLatitude, centerLongitude, zoom);
  const topLeft = { x: center.x - width / 2, y: center.y - height / 2 };
  const bottomRight = { x: center.x + width / 2, y: center.y + height / 2 };
  const northWest = worldPixelToLatLng(topLeft.x, topLeft.y, zoom);
  const southEast = worldPixelToLatLng(bottomRight.x, bottomRight.y, zoom);

  return {
    north: northWest.latitude,
    south: southEast.latitude,
    east: southEast.longitude,
    west: northWest.longitude,
  };
}

export function metersPerPixel(latitude: number, zoom: number) {
  return (
    (Math.cos((latitude * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS_METERS) /
    (TILE_SIZE * 2 ** zoom)
  );
}

export function tilesForSector(
  centerLatitude: number,
  centerLongitude: number,
  zoom: number,
  width: number,
  height: number,
) {
  const center = latLngToWorldPixel(centerLatitude, centerLongitude, zoom);
  const topLeftX = center.x - width / 2;
  const topLeftY = center.y - height / 2;
  const bottomRightX = center.x + width / 2;
  const bottomRightY = center.y + height / 2;

  const minTileX = Math.floor(topLeftX / TILE_SIZE);
  const maxTileX = Math.floor(bottomRightX / TILE_SIZE);
  const minTileY = Math.floor(topLeftY / TILE_SIZE);
  const maxTileY = Math.floor(bottomRightY / TILE_SIZE);

  const tiles: TileCoordinate[] = [];
  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      tiles.push({ z: zoom, x, y });
    }
  }

  return {
    tiles,
    topLeftX,
    topLeftY,
    minTileX,
    minTileY,
  };
}

export { TILE_SIZE };
