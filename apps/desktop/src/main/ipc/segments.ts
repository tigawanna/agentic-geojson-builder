import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import {
  buildSegmentsFromPath,
  createSegmentEdge,
  createSegmentEdgeFromPoints,
  deleteSegmentEdge,
  listSegmentEdges,
  previewBuildSegmentsFromPath,
  updateSegmentEdge,
} from "@main/lib/pglite/segment-edges.service.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function notifyChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted" | "built",
  segmentId?: number,
) {
  broadcastToRenderers("segments:changed", { mapId, reason, segmentId });
  broadcastToRenderers("mapLinks:changed", { mapId, reason, segmentId });
}

export const segmentsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "segments:list": async ({ mapId }) => ({ segments: await listSegmentEdges(mapId) }),
  "segments:create": async (input) => {
    const segment = await createSegmentEdge(input);
    notifyChanged(input.mapId, "created", segment.id);
    return { segment };
  },
  "segments:createFromPoints": async (input) => {
    const segment = await createSegmentEdgeFromPoints(input);
    notifyChanged(input.mapId, "created", segment.id);
    return { segment };
  },
  "segments:update": async (input) => {
    const segment = await updateSegmentEdge(input);
    notifyChanged(input.mapId, "updated", segment.id);
    return { segment };
  },
  "segments:delete": async (input) => {
    await deleteSegmentEdge(input);
    notifyChanged(input.mapId, "deleted", input.segmentId);
    return { ok: true as const };
  },
  "segments:previewBuildFromPath": async (input) => previewBuildSegmentsFromPath(input),
  "segments:buildFromPath": async (input) => {
    const result = await buildSegmentsFromPath(input);
    notifyChanged(input.mapId, "built");
    return result;
  },
};
