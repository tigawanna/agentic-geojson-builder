import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import {
  createMap,
  createMapProject,
  getMapWorkspace,
  listMaps,
  readMapSourcePayload,
} from "../lib/pglite/maps.service.js";
import { broadcastToRenderers } from "./broadcast.js";

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
};
