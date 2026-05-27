import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import { storage } from "../storage/index.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const storageHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "store:get": async ({ key }) => storage.get(key),
  "store:set": async ({ key, value }) => {
    await storage.set(key, value);
    return { ok: true as const };
  },
  "store:delete": async ({ key }) => {
    await storage.delete(key);
    return { ok: true as const };
  },
  "store:clear": async () => {
    await storage.clear();
    return { ok: true as const };
  },
  "db:run": async ({ sql, params }) =>
    storage.run?.(sql, params) ?? { changes: 0, lastInsertRowid: 0 },
  "db:all": async ({ sql, params }) => storage.all?.(sql, params) ?? [],
  "db:get": async ({ sql, params }) => storage.getRow?.(sql, params),
};
