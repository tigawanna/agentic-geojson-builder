import sharp from "sharp";
import { resolveTilesParallel } from "./resolve-tile.js";
import { metersPerPixel, sectorBoundsFromCenter, TILE_SIZE, tilesForSector } from "./tile-math.js";
import type { MapSectorView, SquareBounds, TileStyle } from "./types.js";

export type RenderMapSectorInput = {
  baseDir: string;
  mapId: number;
  style: TileStyle;
  bounds: SquareBounds;
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
  width?: number;
  height?: number;
  writeToCache?: boolean;
};

export async function renderMapSectorFromCache(
  input: RenderMapSectorInput,
): Promise<MapSectorView> {
  const width = input.width ?? 768;
  const height = input.height ?? 768;
  const { tiles, topLeftX, topLeftY } = tilesForSector(
    input.centerLatitude,
    input.centerLongitude,
    input.zoom,
    width,
    height,
  );

  const resolvedTiles = await resolveTilesParallel({
    baseDir: input.baseDir,
    mapId: input.mapId,
    style: input.style,
    tiles,
    writeToCache: input.writeToCache,
    concurrency: 8,
  });

  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  let missingTileCount = 0;

  for (const resolved of resolvedTiles) {
    if (!resolved) {
      missingTileCount += 1;
      continue;
    }

    composites.push({
      input: resolved.buffer,
      left: Math.round(resolved.tile.x * TILE_SIZE - topLeftX),
      top: Math.round(resolved.tile.y * TILE_SIZE - topLeftY),
    });
  }

  const imageBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 226, g: 232, b: 240, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const bounds = sectorBoundsFromCenter(
    input.centerLatitude,
    input.centerLongitude,
    input.zoom,
    width,
    height,
  );

  const cacheHit = resolvedTiles.every((tile) => tile?.fromCache ?? false);

  return {
    mapId: input.mapId,
    style: input.style,
    center: {
      latitude: input.centerLatitude,
      longitude: input.centerLongitude,
    },
    zoom: input.zoom,
    width,
    height,
    bounds,
    metersPerPixel: metersPerPixel(input.centerLatitude, input.zoom),
    mimeType: "image/png",
    imageBase64: imageBuffer.toString("base64"),
    cacheHit,
    missingTileCount,
  };
}

export function getSectorTileSummary(
  centerLatitude: number,
  centerLongitude: number,
  zoom: number,
  width: number,
  height: number,
) {
  return tilesForSector(centerLatitude, centerLongitude, zoom, width, height);
}
