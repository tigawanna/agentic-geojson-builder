import { BrowserWindow } from "electron";
import { readFile, stat } from "node:fs/promises";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  deletePlaygroundLayerFile,
  listPlaygroundLayerFiles,
  savePlaygroundLayerFile,
  updatePlaygroundLayerFile,
} from "@main/lib/playground/playground-layers.service.js";
import {
  layerNameFromPath,
  MAX_GEOJSON_BYTES,
  pickGeoJsonFilePaths,
} from "@main/lib/geojson/pick-geojson-files.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
  window: BrowserWindow | null,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const playgroundHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "playground:pickGeoJsonFiles": async (_req, window) => {
    const filePaths = await pickGeoJsonFilePaths(window);
    if (!filePaths) {
      return { canceled: true as const };
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

  "playground:listLayers": async () => {
    const layers = await listPlaygroundLayerFiles();
    return { layers };
  },

  "playground:saveLayer": async (req) => {
    const layer = await savePlaygroundLayerFile(req);
    return { layer };
  },

  "playground:updateLayer": async (req) => {
    const layer = await updatePlaygroundLayerFile(req);
    return { layer };
  },

  "playground:deleteLayer": async (req) => {
    const ok = await deletePlaygroundLayerFile(req.id);
    return { ok };
  },
};
