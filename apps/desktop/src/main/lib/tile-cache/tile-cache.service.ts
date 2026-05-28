import {
  boundsFromCorners,
  buildTileCache,
  getTileAttribution,
  isPointInSquareBounds,
  readCachedTile,
  readManifest,
  renderMapSectorFromCache,
  type SquareBounds,
  type TileStyle,
} from "@repo/tile-cache";
import { eq } from "drizzle-orm";
import type {
  BuildTileCacheResult,
  GetMapSectorViewInput,
  MapSectorViewResult,
  MapTileCacheConfig,
  SetTileCacheBoundsInput,
  TileCacheBuildProgressEvent,
} from "../../../shared/tile-cache.types.js";
import {
  TILE_CACHE_DEFAULT_MAX_ZOOM,
  TILE_CACHE_DEFAULT_MIN_ZOOM,
} from "../../../shared/tile-cache.types.js";
import type { MapBaseMapStyle } from "../../../shared/maps.types.js";
import { getPgliteDb } from "../pglite/client.js";
import {
  mapTileCacheTable,
  type MapTileCacheRecord,
} from "../pglite/schema/map-tile-cache.schema.js";
import { getTileCacheBaseDir } from "./paths.js";

function toTileStyle(value: string): TileStyle {
  if (value === "outline" || value === "standard" || value === "satellite") {
    return value;
  }
  return "standard";
}

function rowToBounds(row: MapTileCacheRecord): SquareBounds {
  return {
    north: row.boundsNorth,
    south: row.boundsSouth,
    east: row.boundsEast,
    west: row.boundsWest,
    centerLatitude: row.centerLat,
    centerLongitude: row.centerLng,
    halfSideMeters: row.halfSideMeters,
  };
}

function toConfig(row: MapTileCacheRecord): MapTileCacheConfig {
  return {
    mapId: row.mapId,
    centerLat: row.centerLat,
    centerLng: row.centerLng,
    halfSideMeters: row.halfSideMeters,
    minZoom: row.minZoom,
    maxZoom: row.maxZoom,
    style: toTileStyle(row.style),
    tileCount: row.tileCount,
    builtAt: row.tileCount > 0 ? (row.builtAt?.toISOString() ?? null) : null,
    bounds: rowToBounds(row),
  };
}

export async function getMapTileCache(mapId: number): Promise<MapTileCacheConfig | null> {
  const db = getPgliteDb();
  const [row] = await db
    .select()
    .from(mapTileCacheTable)
    .where(eq(mapTileCacheTable.mapId, mapId))
    .limit(1);

  return row ? toConfig(row) : null;
}

export async function setMapTileCacheBoundsFromCorners(
  input: SetTileCacheBoundsInput,
): Promise<MapTileCacheConfig> {
  const bounds = boundsFromCorners(input.corners);
  const style = input.style ?? "standard";
  const db = getPgliteDb();

  const [row] = await db
    .insert(mapTileCacheTable)
    .values({
      mapId: input.mapId,
      centerLat: bounds.centerLatitude,
      centerLng: bounds.centerLongitude,
      halfSideMeters: bounds.halfSideMeters,
      boundsNorth: bounds.north,
      boundsSouth: bounds.south,
      boundsEast: bounds.east,
      boundsWest: bounds.west,
      minZoom: input.minZoom ?? TILE_CACHE_DEFAULT_MIN_ZOOM,
      maxZoom: input.maxZoom ?? TILE_CACHE_DEFAULT_MAX_ZOOM,
      style,
      tileCount: 0,
      builtAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: mapTileCacheTable.mapId,
      set: {
        centerLat: bounds.centerLatitude,
        centerLng: bounds.centerLongitude,
        halfSideMeters: bounds.halfSideMeters,
        boundsNorth: bounds.north,
        boundsSouth: bounds.south,
        boundsEast: bounds.east,
        boundsWest: bounds.west,
        minZoom: input.minZoom ?? TILE_CACHE_DEFAULT_MIN_ZOOM,
        maxZoom: input.maxZoom ?? TILE_CACHE_DEFAULT_MAX_ZOOM,
        style,
        tileCount: 0,
        builtAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save tile cache bounds.");
  }

  return toConfig(row);
}

export async function buildMapTileCache(
  mapId: number,
  onProgress?: (progress: TileCacheBuildProgressEvent) => void,
): Promise<BuildTileCacheResult> {
  const config = await getMapTileCache(mapId);
  if (!config) {
    throw new Error("Set tile cache bounds before building.");
  }

  const result = await buildTileCache({
    baseDir: getTileCacheBaseDir(),
    mapId,
    style: config.style,
    bounds: config.bounds,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    onProgress: (progress) => {
      onProgress?.({ mapId, ...progress });
    },
  });

  const cachedCount = result.downloadedCount + result.skippedCount;
  const db = getPgliteDb();
  const [row] = await db
    .update(mapTileCacheTable)
    .set({
      tileCount: cachedCount,
      builtAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mapTileCacheTable.mapId, mapId))
    .returning();

  if (!row) {
    throw new Error("Failed to update tile cache status.");
  }

  return {
    config: toConfig(row),
    downloadedCount: result.downloadedCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
  };
}

export async function readCachedTileForMap(
  mapId: number,
  style: MapBaseMapStyle,
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  const config = await getMapTileCache(mapId);
  if (!config?.builtAt) {
    return null;
  }

  try {
    return await readCachedTile(getTileCacheBaseDir(), mapId, style, z, x, y);
  } catch {
    return null;
  }
}

export async function getMapSectorView(input: GetMapSectorViewInput): Promise<MapSectorViewResult> {
  const config = await getMapTileCache(input.mapId);
  if (!config) {
    throw new Error("Tile cache is not configured for this map.");
  }

  if (!isPointInSquareBounds(input.latitude, input.longitude, config.bounds)) {
    throw new Error("Requested coordinates are outside the cached bounds.");
  }

  const style = input.style ?? config.style;
  const sector = await renderMapSectorFromCache({
    baseDir: getTileCacheBaseDir(),
    mapId: input.mapId,
    style,
    bounds: config.bounds,
    centerLatitude: input.latitude,
    centerLongitude: input.longitude,
    zoom: input.zoom ?? Math.round(config.maxZoom),
    width: input.width,
    height: input.height,
    writeToCache: false,
  });

  let manifestAttribution: string | null = null;
  try {
    const manifest = await readManifest(getTileCacheBaseDir(), input.mapId, style);
    manifestAttribution = manifest.attribution;
  } catch {
    manifestAttribution = null;
  }

  return {
    ...sector,
    style,
    attribution: manifestAttribution ?? getTileAttribution(style),
    cacheBounds: config.bounds,
  };
}
