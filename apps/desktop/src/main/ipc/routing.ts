import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { findRoute, reachableFrom } from "@main/lib/pglite/routing.service.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const routingHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "routing:findRoute": async (input) => findRoute(input),
  "routing:reachableFrom": async (input) => reachableFrom(input),
};
