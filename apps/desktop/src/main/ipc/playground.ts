import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname } from "node:path";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { storage } from "@main/storage/index.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
  window: BrowserWindow | null,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

const LAST_GEOJSON_DIRECTORY_KEY = "playground.geojsonLastDirectory";
const MAX_GEOJSON_BYTES = 12 * 1024 * 1024;

function layerNameFromPath(filePath: string) {
  const base = basename(filePath);
  return base.replace(/\.(geojson|json)$/i, "") || "Imported layer";
}

function readLastGeoJsonDirectory() {
  const value = storage.get(LAST_GEOJSON_DIRECTORY_KEY);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function rememberGeoJsonDirectory(filePath: string) {
  storage.set(LAST_GEOJSON_DIRECTORY_KEY, dirname(filePath));
}

export const playgroundHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "playground:pickGeoJsonFiles": async (_req, window) => {
    const parentWindow = window ?? BrowserWindow.getFocusedWindow() ?? undefined;
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
      return { canceled: true as const };
    }

    const firstPath = filePaths[0];
    if (firstPath) {
      rememberGeoJsonDirectory(firstPath);
    }

    const files: Array<{ name: string; text: string }> = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const filePath of filePaths) {
      const name = layerNameFromPath(filePath);
      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
          failed.push({ name, error: "Not a regular file." });
          continue;
        }
        if (fileStat.size > MAX_GEOJSON_BYTES) {
          failed.push({ name, error: "GeoJSON file must be 12 MB or smaller." });
          continue;
        }

        const text = await readFile(filePath, "utf8");
        files.push({ name, text });
      } catch (error) {
        failed.push({
          name,
          error: error instanceof Error ? error.message : "Could not read file.",
        });
      }
    }

    if (files.length === 0 && failed.length > 0) {
      throw new Error(failed.map((entry) => `${entry.name}: ${entry.error}`).join("\n"));
    }

    return {
      canceled: false as const,
      files,
      failed,
    };
  },
};
