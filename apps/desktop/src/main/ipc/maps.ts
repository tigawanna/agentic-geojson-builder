import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import { createMap, listMaps } from "../lib/pglite/maps.service.js";
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
};
