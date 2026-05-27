import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import {
  createControlPoint,
  deleteControlPoint,
  listControlPoints,
  updateControlPoint,
} from "../lib/pglite/control-points.service.js";
import {
  convertMapPanePixel,
  convertPdfPanePixel,
  createControlPointFromViewportPixels,
} from "../lib/viewport-coordinates/viewport-coordinates.service.js";
import { broadcastToRenderers } from "./broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyControlPointsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted",
  controlPointId?: number,
) {
  broadcastToRenderers("controlPoints:changed", { mapId, reason, controlPointId });
}

export const controlPointsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "controlPoints:list": async ({ mapId }) => ({ controlPoints: await listControlPoints(mapId) }),
  "controlPoints:create": async (input) => {
    const controlPoint = await createControlPoint(input);
    notifyControlPointsChanged(input.mapId, "created", controlPoint.id);
    return { controlPoint };
  },
  "controlPoints:update": async (input) => {
    const controlPoint = await updateControlPoint(input);
    notifyControlPointsChanged(input.mapId, "updated", controlPoint.id);
    return { controlPoint };
  },
  "controlPoints:delete": async (input) => {
    await deleteControlPoint(input);
    notifyControlPointsChanged(input.mapId, "deleted", input.controlPointId);
    return { ok: true as const };
  },
  "controlPoints:mapPanePixelToLonLat": async (input) => convertMapPanePixel(input),
  "controlPoints:pdfPanePixelToImageXY": async (input) => convertPdfPanePixel(input),
  "controlPoints:createFromViewportPixels": async (input) => {
    const result = await createControlPointFromViewportPixels(input);
    notifyControlPointsChanged(input.mapId, "created", result.controlPoint.id);
    return result;
  },
};
