import { dialog, type BrowserWindow, type OpenDialogOptions } from "electron";
import { basename, dirname } from "node:path";
import { storage } from "@main/storage/index.js";

export const LAST_GEOJSON_DIRECTORY_KEY = "geojson.lastDirectory";
export const MAX_GEOJSON_BYTES = 12 * 1024 * 1024;

export function layerNameFromPath(filePath: string) {
  const base = basename(filePath);
  return base.replace(/\.(geojson|json)$/i, "") || "Imported layer";
}

export function readLastGeoJsonDirectory() {
  const stored = storage.get(LAST_GEOJSON_DIRECTORY_KEY);
  if (typeof stored === "string" && stored.trim().length > 0) {
    return stored;
  }

  const legacy = storage.get("playground.geojsonLastDirectory");
  return typeof legacy === "string" && legacy.trim().length > 0 ? legacy : undefined;
}

export function rememberGeoJsonDirectory(filePath: string) {
  storage.set(LAST_GEOJSON_DIRECTORY_KEY, dirname(filePath));
}

export async function pickGeoJsonFilePaths(window: BrowserWindow | null | undefined) {
  const parentWindow = window ?? undefined;
  const dialogOptions: OpenDialogOptions = {
    title: "Import GeoJSON",
    defaultPath: readLastGeoJsonDirectory(),
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "GeoJSON", extensions: ["geojson", "json"] }],
  };

  const { canceled, filePaths } = parentWindow
    ? await dialog.showOpenDialog(parentWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const firstPath = filePaths[0];
  if (firstPath) {
    rememberGeoJsonDirectory(firstPath);
  }

  return filePaths;
}
