import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  createMap,
  createMapProject,
  deleteMap,
  getMapWorkspace,
  listMaps,
  readMapSourcePayload,
  readMapThumbnail,
  replaceMapSource,
  updateMapWorkspace,
} from "@main/lib/pglite/maps.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const mapsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "maps:list": async () => listMaps(),
  "maps:create": async (input) => {
    const map = await createMap(input);
    broadcastToRenderers("maps:changed", { reason: "created", mapId: map.id });
    return map;
  },
  "maps:createProject": async (input) => {
    const workspace = await createMapProject(input);
    broadcastToRenderers("maps:changed", { reason: "created", mapId: workspace.id });
    return workspace;
  },
  "maps:getWorkspace": async ({ mapId }) => getMapWorkspace(mapId),
  "maps:readSource": async ({ mapId }) => readMapSourcePayload(mapId),
  "maps:updateWorkspace": async (input) => {
    const workspace = await updateMapWorkspace(input);
    broadcastToRenderers("maps:changed", { reason: "updated", mapId: workspace.id });
    return workspace;
  },
  "maps:replaceSource": async (input) => {
    const source = await replaceMapSource(input);
    broadcastToRenderers("maps:changed", { reason: "updated", mapId: input.mapId });
    return source;
  },
  "maps:readThumbnail": async ({ mapId }) => readMapThumbnail(mapId),
  "maps:delete": async ({ mapId }) => {
    await deleteMap(mapId);
    broadcastToRenderers("maps:changed", { reason: "deleted", mapId });
    return { ok: true as const };
  },
};
