import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  deleteMapReferenceGeoJsonLayer,
  importMapReferenceGeoJsonLayer,
  listMapReferenceGeoJsonLayers,
  setMapReferenceGeoJsonLayerVisibility,
} from "@main/lib/pglite/reference-geojson.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
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
