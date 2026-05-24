import { runWithConcurrency } from "./concurrency.js";
import { fetchTileBuffer } from "./fetch-tile.js";
import { cachedTileExists, writeCachedTile, writeManifest } from "./paths.js";
import { listTilesForBounds } from "./tile-math.js";
import { getTileAttribution } from "./tile-url.js";
import type { SquareBounds, TileCacheManifest, TileStyle } from "./types.js";

export type BuildTileCacheInput = {
  baseDir: string;
  mapId: number;
  style: TileStyle;
  bounds: SquareBounds;
  minZoom: number;
  maxZoom: number;
  concurrency?: number;
  onProgress?: (progress: { completed: number; total: number; z: number }) => void;
};

export type BuildTileCacheResult = {
  manifest: TileCacheManifest;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
};

type TileJob = { z: number; x: number; y: number };

type TileJobResult = {
  downloaded: number;
  skipped: number;
  failed: number;
  z: number;
};

export async function buildTileCache(input: BuildTileCacheInput): Promise<BuildTileCacheResult> {
  const tileJobs: TileJob[] = [];

  for (let zoom = input.minZoom; zoom <= input.maxZoom; zoom += 1) {
    tileJobs.push(...listTilesForBounds(input.bounds, zoom));
  }

  const concurrency = input.concurrency ?? 12;
  let completed = 0;

  const results = await runWithConcurrency(
    tileJobs,
    concurrency,
    async (tile): Promise<TileJobResult> => {
      try {
        if (
          await cachedTileExists(input.baseDir, input.mapId, input.style, tile.z, tile.x, tile.y)
        ) {
          return { downloaded: 0, skipped: 1, failed: 0, z: tile.z };
        }

        const buffer = await fetchTileBuffer(input.style, tile.z, tile.x, tile.y);
        await writeCachedTile(
          input.baseDir,
          input.mapId,
          input.style,
          tile.z,
          tile.x,
          tile.y,
          buffer,
        );
        return { downloaded: 1, skipped: 0, failed: 0, z: tile.z };
      } catch {
        return { downloaded: 0, skipped: 0, failed: 1, z: tile.z };
      } finally {
        completed += 1;
        input.onProgress?.({ completed, total: tileJobs.length, z: tile.z });
      }
    },
  );

  const downloadedCount = results.reduce((sum, result) => sum + result.downloaded, 0);
  const skippedCount = results.reduce((sum, result) => sum + result.skipped, 0);
  const failedCount = results.reduce((sum, result) => sum + result.failed, 0);
  const cachedCount = downloadedCount + skippedCount;

  if (cachedCount === 0) {
    throw new Error(
      `No tiles were cached (${failedCount} failed). Try again or use a smaller area.`,
    );
  }

  const manifest: TileCacheManifest = {
    mapId: input.mapId,
    style: input.style,
    bounds: input.bounds,
    minZoom: input.minZoom,
    maxZoom: input.maxZoom,
    tileCount: cachedCount,
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
