import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createMapboxGroundCapture,
  deleteMapboxGroundCapture,
  listMapboxGroundCaptures,
  updateMapboxGroundCapture,
} from "@main/lib/pglite/mapbox-ground-capture.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(reason: "created" | "updated" | "deleted", captureId?: number) {
  broadcastToRenderers("mapboxCaptures:changed", { reason, captureId });
}

export const mapboxCapturesHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "mapboxCaptures:list": async () => ({ captures: await listMapboxGroundCaptures() }),
  "mapboxCaptures:create": async (input) => {
    const capture = await createMapboxGroundCapture(input);
    notifyChanged("created", capture.id);
    return { capture };
  },
  "mapboxCaptures:update": async (input) => {
    const capture = await updateMapboxGroundCapture(input);
    notifyChanged("updated", capture.id);
    return { capture };
  },
  "mapboxCaptures:delete": async (input) => {
    await deleteMapboxGroundCapture(input.captureId);
    notifyChanged("deleted", input.captureId);
    return { ok: true as const };
  },
};
