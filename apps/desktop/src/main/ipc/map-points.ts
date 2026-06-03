import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createMapPoint,
  deleteMapPoint,
  listMapPoints,
  updateMapPoint,
} from "@main/lib/pglite/map-points.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(mapId: number, reason: "created" | "updated" | "deleted", pointId?: number) {
  broadcastToRenderers("mapPoints:changed", { mapId, reason, pointId });
}

export const mapPointsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "mapPoints:list": async ({ mapId }) => ({ points: await listMapPoints(mapId) }),
  "mapPoints:create": async (input) => {
    const point = await createMapPoint(input);
    notifyChanged(input.mapId, "created", point.id);
    return { point };
  },
  "mapPoints:update": async (input) => {
    const point = await updateMapPoint(input);
    notifyChanged(input.mapId, "updated", point.id);
    return { point };
  },
  "mapPoints:delete": async (input) => {
    await deleteMapPoint(input);
    notifyChanged(input.mapId, "deleted", input.pointId);
    return { ok: true as const };
  },
};
