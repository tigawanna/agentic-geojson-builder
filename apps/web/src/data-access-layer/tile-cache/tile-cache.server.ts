import "@tanstack/react-start/server-only";

import path from "node:path";
import {
  assertMapBelongsToUser,
  getMapWorkspaceForUser,
} from "@/data-access-layer/maps/maps.server";
import { db } from "@/lib/drizzle/client.server";
import { mapTileCacheTable } from "@/lib/drizzle/schema/maps/map-tile-cache.schema";
import {
  buildTileCache,
  getTileAttribution,
  isPointInSquareBounds,
  readCachedTile,
  readManifest,
  renderMapSectorFromCache,
  squareBoundsFromCenter,
  type TileStyle,
} from "@repo/tile-cache";
import { eq } from "drizzle-orm";

export type MapTileCacheConfig = {
  mapId: number;
  centerLat: number;
  centerLng: number;
  halfSideMeters: number;
  minZoom: number;
  maxZoom: number;
  style: TileStyle;
  tileCount: number;
  builtAt: string | null;
  bounds: ReturnType<typeof squareBoundsFromCenter>;
};

function getTileCacheBaseDir() {
  return path.join(process.cwd(), "data", "tile-cache");
}

function toTileStyle(value: string): TileStyle {
  if (value === "outline" || value === "standard" || value === "satellite") {
    return value;
  }
  return "satellite";
}

function toConfig(row: typeof mapTileCacheTable.$inferSelect): MapTileCacheConfig {
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
    bounds: squareBoundsFromCenter(row.centerLat, row.centerLng, row.halfSideMeters),
  };
}

export async function getMapTileCacheForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db
    .select()
    .from(mapTileCacheTable)
    .where(eq(mapTileCacheTable.mapId, mapId))
    .limit(1);

  if (!row) {
    return null;
  }

  return toConfig(row);
}

export async function setMapTileCacheBoundsForUser(
  userId: string,
  input: {
    mapId: number;
    centerLat: number;
    centerLng: number;
    halfSideMeters: number;
    minZoom?: number;
    maxZoom?: number;
    style?: TileStyle;
  },
) {
  await assertMapBelongsToUser(userId, input.mapId);

  const map = await getMapWorkspaceForUser(userId, input.mapId);
  const style = input.style ?? map?.baseMapStyle ?? "satellite";

  const [row] = await db
    .insert(mapTileCacheTable)
    .values({
      mapId: input.mapId,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      halfSideMeters: input.halfSideMeters,
      minZoom: input.minZoom ?? 14,
      maxZoom: input.maxZoom ?? 17,
      style,
      tileCount: 0,
      builtAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: mapTileCacheTable.mapId,
      set: {
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        halfSideMeters: input.halfSideMeters,
        minZoom: input.minZoom ?? 14,
        maxZoom: input.maxZoom ?? 17,
        style,
        tileCount: 0,
        builtAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return toConfig(row);
}

export async function buildMapTileCacheForUser(userId: string, mapId: number) {
  const config = await getMapTileCacheForUser(userId, mapId);
  if (!config) {
    throw new Error("Set a square tile cache area before building.");
  }

  const result = await buildTileCache({
    baseDir: getTileCacheBaseDir(),
    mapId,
    style: config.style,
    bounds: config.bounds,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
  });

  const cachedCount = result.downloadedCount + result.skippedCount;

  const [row] = await db
    .update(mapTileCacheTable)
    .set({
      tileCount: cachedCount,
      builtAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mapTileCacheTable.mapId, mapId))
    .returning();

  return {
    config: toConfig(row),
    manifest: result.manifest,
    downloadedCount: result.downloadedCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
  };
}

export async function getMapSectorViewForUser(
  userId: string,
  input: {
    mapId: number;
    latitude: number;
    longitude: number;
    zoom?: number;
    width?: number;
    height?: number;
    style?: TileStyle;
  },
) {
  const config = await getMapTileCacheForUser(userId, input.mapId);
  if (!config) {
    throw new Error("Tile cache is not configured for this map.");
  }

  if (!isPointInSquareBounds(input.latitude, input.longitude, config.bounds)) {
    throw new Error("Requested coordinates are outside the cached square bounds.");
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
  });

  let manifestAttribution: string | null = null;
  try {
    const manifest = await readManifest(getTileCacheBaseDir(), input.mapId, style);
    manifestAttribution = manifest.attribution;
  } catch {
    manifestAttribution = null;
  }

  if (!manifestAttribution) {
    manifestAttribution = getTileAttribution(style);
  }

  return {
    ...sector,
    attribution: manifestAttribution,
    cacheBounds: config.bounds,
  };
}

export async function readCachedTileForUser(
  userId: string,
  input: {
    mapId: number;
    style: TileStyle;
    z: number;
    x: number;
    y: number;
  },
) {
  await assertMapBelongsToUser(userId, input.mapId);

  const config = await getMapTileCacheForUser(userId, input.mapId);
  if (!config?.builtAt) {
    return null;
  }

  return readCachedTile(getTileCacheBaseDir(), input.mapId, input.style, input.z, input.x, input.y);
}

export function getLocalTileUrl(mapId: number, style: TileStyle) {
  return `/api/tiles/${mapId}/${style}/{z}/{x}/{y}.png`;
}
