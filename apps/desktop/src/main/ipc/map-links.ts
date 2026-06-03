import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createMapLink,
  createMapLinkFromPoints,
  deleteMapLink,
  listMapLinks,
  updateMapLink,
} from "@main/lib/pglite/map-links.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(mapId: number, reason: "created" | "updated" | "deleted", linkId?: number) {
  broadcastToRenderers("mapLinks:changed", { mapId, reason, linkId });
}

export const mapLinksHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "mapLinks:list": async ({ mapId }) => ({ links: await listMapLinks(mapId) }),
  "mapLinks:create": async (input) => {
    const link = await createMapLink(input);
    notifyChanged(input.mapId, "created", link.id);
    return { link };
  },
  "mapLinks:createFromPoints": async (input) => {
    const link = await createMapLinkFromPoints(input);
    notifyChanged(input.mapId, "created", link.id);
    return { link };
  },
  "mapLinks:update": async (input) => {
    const link = await updateMapLink(input);
    notifyChanged(input.mapId, "updated", link.id);
    return { link };
  },
  "mapLinks:delete": async (input) => {
    await deleteMapLink(input);
    notifyChanged(input.mapId, "deleted", input.linkId);
    return { ok: true as const };
  },
};
