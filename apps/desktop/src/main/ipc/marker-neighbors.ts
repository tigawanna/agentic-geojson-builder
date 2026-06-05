import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  listMarkerNeighbors,
  replaceMarkerNeighbors,
} from "@main/lib/pglite/marker-neighbors.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(mapId: number, fromMarkerId: number) {
  broadcastToRenderers("markerNeighbors:changed", { mapId, reason: "replaced", fromMarkerId });
}

export const markerNeighborsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "markerNeighbors:list": async ({ mapId }) => ({
    neighbors: await listMarkerNeighbors(mapId),
  }),
  "markerNeighbors:replace": async (input) => {
    const neighbors = await replaceMarkerNeighbors(input);
    notifyChanged(input.mapId, input.fromMarkerId);
    return { neighbors };
  },
};
