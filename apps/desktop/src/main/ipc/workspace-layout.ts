import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";
import {
  closeSourceDocumentWindow,
  isSourceDocumentWindowOpen,
} from "@main/workspace/source-document-window.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

const uiSyncByMapId = new Map<
  number,
  import("@shared/workspace-layout.types.js").WorkspaceUiSyncState
>();

export const workspaceLayoutHandlers = {
  "workspace:closeSourceDocumentWindow": ((req) => {
    return { closed: closeSourceDocumentWindow(req.mapId) };
  }) satisfies Handler<"workspace:closeSourceDocumentWindow">,

  "workspace:getSourceDocumentWindowOpen": ((req) => {
    return { open: isSourceDocumentWindowOpen(req.mapId) };
  }) satisfies Handler<"workspace:getSourceDocumentWindowOpen">,

  "workspace:publishUiSync": ((req) => {
    uiSyncByMapId.set(req.mapId, req.state);
    broadcastToRenderers("workspace:uiSync", req.state);
    return { ok: true as const };
  }) satisfies Handler<"workspace:publishUiSync">,

  "workspace:getUiSync": ((req) => {
    return { state: uiSyncByMapId.get(req.mapId) ?? null };
  }) satisfies Handler<"workspace:getUiSync">,
} satisfies Partial<{ [K in IpcChannel]: Handler<K> }>;
