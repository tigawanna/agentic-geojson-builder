import { fetchTileBuffer } from "./fetch-tile";
import { writeCachedTile, writeManifest } from "./paths";
import { listTilesForBounds } from "./tile-math";
import { getTileAttribution } from "./tile-url";
import type { SquareBounds, TileCacheManifest, TileStyle } from "./types";

export type BuildTileCacheInput = {
  baseDir: string;
  mapId: number;
  style: TileStyle;
  bounds: SquareBounds;
  minZoom: number;
  maxZoom: number;
  onProgress?: (progress: { completed: number; total: number; z: number }) => void;
};

export type BuildTileCacheResult = {
  manifest: TileCacheManifest;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
};

export async function buildTileCache(input: BuildTileCacheInput): Promise<BuildTileCacheResult> {
  const tileJobs: Array<{ z: number; x: number; y: number }> = [];

  for (let zoom = input.minZoom; zoom <= input.maxZoom; zoom += 1) {
    const tiles = listTilesForBounds(input.bounds, zoom);
    tileJobs.push(...tiles);
  }

  let completed = 0;
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const tile of tileJobs) {
    try {
      const buffer = await fetchTileBuffer(input.style, tile.z, tile.x, tile.y);
      await writeCachedTile(input.baseDir, input.mapId, input.style, tile.z, tile.x, tile.y, buffer);
      downloadedCount += 1;
    } catch {
      failedCount += 1;
    }

    completed += 1;
    input.onProgress?.({ completed, total: tileJobs.length, z: tile.z });
  }

  const manifest: TileCacheManifest = {
    mapId: input.mapId,
    style: input.style,
    bounds: input.bounds,
    minZoom: input.minZoom,
    maxZoom: input.maxZoom,
    tileCount: downloadedCount,
    builtAt: new Date().toISOString(),
    attribution: getTileAttribution(input.style),
  };

  await writeManifest(input.baseDir, input.mapId, input.style, manifest);

  return {
    manifest,
    downloadedCount,
    skippedCount,
    failedCount,
  };
}
