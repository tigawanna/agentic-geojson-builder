import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createTrail,
  deleteTrail,
  listTrails,
  setTrailMembers,
  updateTrail,
} from "@main/lib/pglite/trails.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted" | "members-updated",
  trailId?: number,
) {
  broadcastToRenderers("trails:changed", { mapId, reason, trailId });
}

export const trailsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "trails:list": async ({ mapId }) => ({ trails: await listTrails(mapId) }),
  "trails:create": async (input) => {
    const trail = await createTrail(input);
    notifyChanged(input.mapId, "created", trail.id);
    return { trail };
  },
  "trails:update": async (input) => {
    const trail = await updateTrail(input);
    notifyChanged(input.mapId, "updated", trail.id);
    return { trail };
  },
  "trails:delete": async (input) => {
    await deleteTrail(input);
    notifyChanged(input.mapId, "deleted", input.trailId);
    return { ok: true as const };
  },
  "trails:setMembers": async (input) => {
    const trail = await setTrailMembers(input);
    notifyChanged(input.mapId, "members-updated", trail.id);
    return { trail };
  },
};
