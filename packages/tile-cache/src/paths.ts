import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TileCacheManifest, TileStyle } from "./types";

export function getMapCacheRoot(baseDir: string, mapId: number) {
  return path.join(baseDir, `map-${mapId}`);
}

export function getStyleCacheRoot(baseDir: string, mapId: number, style: TileStyle) {
  return path.join(getMapCacheRoot(baseDir, mapId), style);
}

export function getTilePath(
  baseDir: string,
  mapId: number,
  style: TileStyle,
  z: number,
  x: number,
  y: number,
) {
  return path.join(getStyleCacheRoot(baseDir, mapId, style), String(z), String(x), `${y}.png`);
}

export function getManifestPath(baseDir: string, mapId: number, style: TileStyle) {
  return path.join(getStyleCacheRoot(baseDir, mapId, style), "manifest.json");
}

export async function writeManifest(
  baseDir: string,
  mapId: number,
  style: TileStyle,
  manifest: TileCacheManifest,
) {
  const manifestPath = getManifestPath(baseDir, mapId, style);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

export async function readManifest(baseDir: string, mapId: number, style: TileStyle) {
  const manifestPath = getManifestPath(baseDir, mapId, style);
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as TileCacheManifest;
}

export async function readCachedTile(
  baseDir: string,
  mapId: number,
  style: TileStyle,
  z: number,
  x: number,
  y: number,
) {
  const tilePath = getTilePath(baseDir, mapId, style, z, x, y);
  return readFile(tilePath);
}

export async function writeCachedTile(
  baseDir: string,
  mapId: number,
  style: TileStyle,
  z: number,
  x: number,
  y: number,
  data: Buffer,
) {
  const tilePath = getTilePath(baseDir, mapId, style, z, x, y);
  await mkdir(path.dirname(tilePath), { recursive: true });
  await writeFile(tilePath, data);
}
