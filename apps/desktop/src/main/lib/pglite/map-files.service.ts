import { app } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAP_THUMBNAIL_FILE_NAME = "thumbnail.webp";

export function getMapsRootDir(): string {
  return join(app.getPath("userData"), "maps");
}

export function getMapDir(mapId: number): string {
  return join(getMapsRootDir(), String(mapId));
}

export function getMapScreenshotsDir(mapId: number): string {
  return join(getMapDir(mapId), "screenshots");
}

export function getMapReferenceGeoJsonDir(mapId: number): string {
  return join(getMapDir(mapId), "reference-geojson");
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureMapDirs(mapId: number): Promise<string> {
  const mapDir = getMapDir(mapId);
  await mkdir(getMapScreenshotsDir(mapId), { recursive: true });
  return mapDir;
}

export async function saveMapSourceFile(
  mapId: number,
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const mapDir = await ensureMapDirs(mapId);
  const safeName = sanitizeFileName(fileName);
  await writeFile(join(mapDir, safeName), buffer);
  return mapDir;
}

export async function readMapSourceFile(mapDir: string, fileName: string): Promise<Buffer> {
  return readFile(join(mapDir, sanitizeFileName(fileName)));
}

export async function saveMapThumbnailFile(mapId: number, buffer: Buffer): Promise<string> {
  const screenshotsDir = getMapScreenshotsDir(mapId);
  await mkdir(screenshotsDir, { recursive: true });
  const filePath = join(screenshotsDir, MAP_THUMBNAIL_FILE_NAME);
  await writeFile(filePath, buffer);
  return MAP_THUMBNAIL_FILE_NAME;
}

export async function readMapThumbnailFile(mapDir: string, fileName: string): Promise<Buffer> {
  return readFile(join(mapDir, "screenshots", sanitizeFileName(fileName)));
}

export async function deleteMapAssets(mapId: number): Promise<void> {
  await rm(getMapDir(mapId), { recursive: true, force: true });
}
