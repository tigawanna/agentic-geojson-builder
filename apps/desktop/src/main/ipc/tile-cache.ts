import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import {
  buildMapTileCache,
  getMapSectorView,
  getMapTileCache,
  setMapTileCacheBoundsFromCorners,
} from "@main/lib/tile-cache/tile-cache.service.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const tileCacheHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "tileCache:getStatus": async ({ mapId }) => getMapTileCache(mapId),
  "tileCache:setBoundsFromCorners": async (input) => setMapTileCacheBoundsFromCorners(input),
  "tileCache:build": async ({ mapId }) =>
    buildMapTileCache(mapId, (progress) => {
      broadcastToRenderers("tileCache:buildProgress", progress);
    }),
  "tileCache:getSectorView": async (input) => getMapSectorView(input),
};
