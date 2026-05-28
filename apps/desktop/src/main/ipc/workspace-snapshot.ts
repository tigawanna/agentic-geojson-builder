import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  completeCaptureResponse,
  getRenderedMapView,
  getStoredRenderedMapView,
  saveRenderedMapView,
} from "@main/lib/workspace-snapshot/workspace-snapshot.service.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const workspaceSnapshotHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "workspace:captureResponse": (req) => {
    completeCaptureResponse(req);
    return { ok: true as const };
  },
  "workspace:saveRenderedView": (req) => {
    saveRenderedMapView(req.snapshot);
    return { ok: true as const };
  },
  "workspace:getRenderedView": async (req) => getStoredRenderedMapView(req.mapId),
  "workspace:requestRenderedView": async (req) =>
    getRenderedMapView(req.mapId, { liveCapture: req.liveCapture ?? true }),
};
