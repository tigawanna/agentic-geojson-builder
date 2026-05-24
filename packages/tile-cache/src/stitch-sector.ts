import sharp from "sharp";
import { readCachedTile } from "./paths";
import {
  metersPerPixel,
  sectorBoundsFromCenter,
  TILE_SIZE,
  tilesForSector,
} from "./tile-math";
import type { MapSectorView, SquareBounds, TileStyle } from "./types";

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
};

export async function renderMapSectorFromCache(
  input: RenderMapSectorInput,
): Promise<MapSectorView> {
  const width = input.width ?? 768;
  const height = input.height ?? 768;
  const { tiles, topLeftX, topLeftY, minTileX, minTileY } = tilesForSector(
    input.centerLatitude,
    input.centerLongitude,
    input.zoom,
    width,
    height,
  );

  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  let missingTileCount = 0;

  for (const tile of tiles) {
    try {
      const buffer = await readCachedTile(
        input.baseDir,
        input.mapId,
        input.style,
        tile.z,
        tile.x,
        tile.y,
      );
      composites.push({
        input: buffer,
        left: tile.x * TILE_SIZE - topLeftX,
        top: tile.y * TILE_SIZE - topLeftY,
      });
    } catch {
      missingTileCount += 1;
    }
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
    cacheHit: missingTileCount === 0,
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

export { minTileX, minTileY, topLeftX, topLeftY };
