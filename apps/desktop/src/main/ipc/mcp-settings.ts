import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { setMcpEnabled } from "@main/storage/app-settings.js";
import { getMcpStatus, syncMcpServer } from "@main/mcp/index.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const mcpSettingsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "mcp:getStatus": async () => getMcpStatus(),
  "mcp:setEnabled": async ({ enabled }) => {
    setMcpEnabled(enabled);
    return syncMcpServer();
  },
};
