import type { BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  importMapReferenceGeoJsonLayer,
  importMapReferenceGeoJsonLayerFromPath,
  deleteMapReferenceGeoJsonLayer,
  listMapReferenceGeoJsonLayers,
  setMapReferenceGeoJsonLayerVisibility,
} from "@main/lib/pglite/reference-geojson.service.js";
import { layerNameFromPath, pickGeoJsonFilePaths } from "@main/lib/geojson/pick-geojson-files.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
  window: BrowserWindow | null,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyReferenceGeoJsonChanged(
  mapId: number,
  reason: "imported" | "deleted" | "visibility",
  layerId?: string,
) {
  broadcastToRenderers("referenceGeoJson:changed", { mapId, reason, layerId });
}

export const referenceGeoJsonHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "referenceGeoJson:list": async ({ mapId }) => ({
    layers: await listMapReferenceGeoJsonLayers(mapId),
  }),
  "referenceGeoJson:import": async (input) => {
    const layer = await importMapReferenceGeoJsonLayer(input);
    notifyReferenceGeoJsonChanged(input.mapId, "imported", layer.id);
    return { layer };
  },
  "referenceGeoJson:pickAndImport": async ({ mapId }, window) => {
    const filePaths = await pickGeoJsonFilePaths(window);
    if (!filePaths) {
      return { canceled: true as const };
    }

    const layers = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const filePath of filePaths) {
      const name = layerNameFromPath(filePath);
      try {
        const layer = await importMapReferenceGeoJsonLayerFromPath(mapId, filePath);
        notifyReferenceGeoJsonChanged(mapId, "imported", layer.id);
        layers.push(layer);
      } catch (error) {
        failed.push({
          name,
          error: error instanceof Error ? error.message : "Could not import GeoJSON.",
        });
      }
    }

    if (layers.length === 0 && failed.length > 0) {
      throw new Error(failed.map((entry) => `${entry.name}: ${entry.error}`).join("\n"));
    }

    return {
      canceled: false as const,
      layers,
      failed,
    };
  },
  "referenceGeoJson:delete": async (input) => {
    await deleteMapReferenceGeoJsonLayer(input.mapId, input.layerId);
    notifyReferenceGeoJsonChanged(input.mapId, "deleted", input.layerId);
    return { ok: true as const };
  },
  "referenceGeoJson:setVisibility": async (input) => {
    const layer = await setMapReferenceGeoJsonLayerVisibility(
      input.mapId,
      input.layerId,
      input.visible,
    );
    if (!layer) {
      throw new Error("Reference GeoJSON layer not found.");
    }
    notifyReferenceGeoJsonChanged(input.mapId, "visibility", input.layerId);
    return { layer };
  },
};
