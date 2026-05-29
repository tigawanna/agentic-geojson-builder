import { dialog } from "electron";
import { writeFile } from "node:fs/promises";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import type { ExportGeoJsonInput } from "@shared/geo-segments.types.js";
import {
  applyFeaturePatch,
  createGeoSegment,
  deleteGeoSegment,
  exportGeoJson,
  findFeatureGapsForMap,
  listGeoSegments,
  mergeFeatureSegmentsForMap,
  updateGeoSegment,
  updateGeoSegmentStatus,
} from "@main/lib/pglite/geo-segments.service.js";
import { log } from "@main/lib/logger.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function sanitizeDownloadFilename(name: string) {
  return (
    name
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "map"
  );
}

function notifyGeoSegmentsChanged(
  mapId: number,
  reason: "created" | "updated" | "deleted" | "status-updated",
  segmentId?: number,
) {
  log.info({
    action: "geo_segment",
    message: "broadcast change event",
    mapId,
    reason,
    segmentId,
  });
  broadcastToRenderers("geoSegments:changed", { mapId, reason, segmentId });
}

export const geoSegmentsHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "geoSegments:list": async ({ mapId }) => ({ segments: await listGeoSegments(mapId) }),
  "geoSegments:create": async (input) => {
    const segment = await createGeoSegment(input);
    notifyGeoSegmentsChanged(input.mapId, "created", segment.id);
    return { segment };
  },
  "geoSegments:update": async (input) => {
    const segment = await updateGeoSegment(input);
    notifyGeoSegmentsChanged(input.mapId, "updated", segment.id);
    return { segment };
  },
  "geoSegments:delete": async (input) => {
    await deleteGeoSegment(input.mapId, input.segmentId);
    notifyGeoSegmentsChanged(input.mapId, "deleted", input.segmentId);
    return { ok: true as const };
  },
  "geoSegments:updateStatus": async (input) => {
    const segment = await updateGeoSegmentStatus(input);
    notifyGeoSegmentsChanged(input.mapId, "status-updated", segment.id);
    return { segment };
  },
  "geoSegments:export": async (input) => exportGeoJson(input),
  "geoSegments:exportToFile": async (input) => {
    const result = await exportGeoJson(input);
    if (result.featureCount === 0) {
      throw new Error("Nothing to export. Trace at least one trail segment first.");
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `${sanitizeDownloadFilename(result.mapName ?? "map")}.geojson`,
      filters: [{ name: "GeoJSON", extensions: ["geojson", "json"] }],
    });

    if (canceled || !filePath) {
      return { canceled: true as const };
    }

    await writeFile(filePath, `${JSON.stringify(result.geojson, null, 2)}\n`, "utf8");
    return { canceled: false as const, savedPath: filePath, featureCount: result.featureCount };
  },
  "geoSegments:findGaps": async (input) => findFeatureGapsForMap(input),
  "geoSegments:mergePreview": async (input) => mergeFeatureSegmentsForMap(input),
  "geoSegments:applyPatch": async (input) => {
    const result = await applyFeaturePatch(input);
    if ("deleted" in result) {
      notifyGeoSegmentsChanged(input.mapId, "deleted", result.segmentId);
    } else {
      notifyGeoSegmentsChanged(
        input.mapId,
        input.segmentId ? "updated" : "created",
        result.segment.id,
      );
    }
    return result;
  },
};

export type { ExportGeoJsonInput };
