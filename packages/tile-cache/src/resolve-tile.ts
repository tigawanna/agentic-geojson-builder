import { fetchTileBuffer } from "./fetch-tile.js";
import { cachedTileExists, readCachedTile, writeCachedTile } from "./paths.js";
import { runWithConcurrency } from "./concurrency.js";
import type { TileCoordinate, TileStyle } from "./types.js";

export type ResolveTileInput = {
  baseDir: string;
  mapId: number;
  style: TileStyle;
  z: number;
  x: number;
  y: number;
  writeToCache?: boolean;
};

export async function resolveTileBuffer(input: ResolveTileInput): Promise<{
  buffer: Buffer;
  fromCache: boolean;
}> {
  if (await cachedTileExists(input.baseDir, input.mapId, input.style, input.z, input.x, input.y)) {
    const buffer = await readCachedTile(
      input.baseDir,
      input.mapId,
      input.style,
      input.z,
      input.x,
      input.y,
    );
    return { buffer, fromCache: true };
  }

  const buffer = await fetchTileBuffer(input.style, input.z, input.x, input.y);

  if (input.writeToCache !== false) {
    await writeCachedTile(
      input.baseDir,
      input.mapId,
      input.style,
      input.z,
      input.x,
      input.y,
      buffer,
    );
  }

  return { buffer, fromCache: false };
}

export type ResolvedTileResult = {
  tile: TileCoordinate;
  buffer: Buffer;
  fromCache: boolean;
} | null;

export async function resolveTilesParallel(input: {
  baseDir: string;
  mapId: number;
  style: TileStyle;
  tiles: TileCoordinate[];
  writeToCache?: boolean;
  concurrency?: number;
}): Promise<ResolvedTileResult[]> {
  const concurrency = input.concurrency ?? 8;
  const resolved = await runWithConcurrency(input.tiles, concurrency, async (tile) => {
    try {
      const result = await resolveTileBuffer({
        baseDir: input.baseDir,
        mapId: input.mapId,
        style: input.style,
        z: tile.z,
        x: tile.x,
        y: tile.y,
        writeToCache: input.writeToCache,
      });
      return { tile, ...result };
    } catch {
      return null;
    }
  });

  return resolved;
}
