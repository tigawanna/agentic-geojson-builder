import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  GetRenderedMapViewResult,
  RenderedMapView,
  WorkspaceCaptureResponseInput,
} from "../../../shared/rendered-map-view.types.js";
import { getMapScreenshotsDir } from "../pglite/map-files.service.js";
import { broadcastToRenderers } from "../../ipc/broadcast.js";

const snapshots = new Map<number, RenderedMapView>();

type PendingCapture = {
  resolve: (snapshot: RenderedMapView) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const pendingCaptures = new Map<string, PendingCapture>();

function stripImageFields(snapshot: RenderedMapView) {
  const pdfPane = snapshot.pdfPane
    ? (() => {
        const { imageBase64, ...rest } = snapshot.pdfPane;
        return {
          ...rest,
          hasImage: true,
          imageBase64Length: imageBase64.length,
        };
      })()
    : null;

  const mapPane = snapshot.mapPane
    ? (() => {
        const { imageBase64, ...rest } = snapshot.mapPane;
        return {
          ...rest,
          hasImage: true,
          imageBase64Length: imageBase64.length,
        };
      })()
    : null;

  return {
    ...snapshot,
    pdfPane,
    mapPane,
  };
}

async function persistSnapshotFiles(snapshot: RenderedMapView) {
  const dir = getMapScreenshotsDir(snapshot.mapId);
  await mkdir(dir, { recursive: true });

  if (snapshot.pdfPane) {
    await writeFile(
      join(dir, "latest-pdf.png"),
      Buffer.from(snapshot.pdfPane.imageBase64, "base64"),
    );
  }

  if (snapshot.mapPane) {
    await writeFile(
      join(dir, "latest-map.png"),
      Buffer.from(snapshot.mapPane.imageBase64, "base64"),
    );
  }

  await writeFile(
    join(dir, "latest-snapshot.json"),
    JSON.stringify(stripImageFields(snapshot), null, 2),
  );
}

export function saveRenderedMapView(snapshot: RenderedMapView) {
  snapshots.set(snapshot.mapId, snapshot);
  void persistSnapshotFiles(snapshot).catch(() => undefined);
}

export function getStoredRenderedMapView(mapId: number): GetRenderedMapViewResult {
  const snapshot = snapshots.get(mapId);
  if (!snapshot) {
    return {
      mapId,
      ready: false,
      reason: "no_client_snapshot",
      message:
        "No workspace snapshot is stored yet. Open the map workspace and call get_rendered_map_view with liveCapture enabled.",
      snapshot: null,
    };
  }

  return {
    mapId,
    ready: true,
    reason: "client_snapshot",
    capturedAt: snapshot.capturedAt,
    snapshot,
  };
}

export function completeCaptureResponse(input: WorkspaceCaptureResponseInput) {
  const pending = pendingCaptures.get(input.requestId);
  if (!pending) {
    return;
  }

  windowClearTimeout(pending.timeout);
  pendingCaptures.delete(input.requestId);

  if (input.error) {
    pending.reject(new Error(input.error));
    return;
  }

  if (!input.snapshot) {
    pending.reject(new Error("Workspace capture returned no snapshot."));
    return;
  }

  saveRenderedMapView(input.snapshot);
  pending.resolve(input.snapshot);
}

function windowClearTimeout(timeout: NodeJS.Timeout) {
  clearTimeout(timeout);
}

export async function requestLiveWorkspaceCapture(
  mapId: number,
  timeoutMs = 15000,
): Promise<RenderedMapView> {
  const requestId = randomUUID();

  return new Promise<RenderedMapView>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCaptures.delete(requestId);
      reject(
        new Error(
          "Workspace capture timed out. Open the map workspace for this map and try again.",
        ),
      );
    }, timeoutMs);

    pendingCaptures.set(requestId, {
      resolve,
      reject,
      timeout,
    });

    broadcastToRenderers("workspace:captureRequest", { requestId, mapId });
  });
}

export async function getRenderedMapView(
  mapId: number,
  options: { liveCapture?: boolean } = {},
): Promise<GetRenderedMapViewResult> {
  if (options.liveCapture) {
    try {
      const snapshot = await requestLiveWorkspaceCapture(mapId);
      return {
        mapId,
        ready: true,
        reason: "live_capture",
        capturedAt: snapshot.capturedAt,
        snapshot,
      };
    } catch (error) {
      const stored = getStoredRenderedMapView(mapId);
      if (stored.ready) {
        return stored;
      }

      return {
        mapId,
        ready: false,
        reason: "no_client_snapshot",
        message: error instanceof Error ? error.message : "Workspace capture failed.",
        snapshot: null,
      };
    }
  }

  return getStoredRenderedMapView(mapId);
}

export function renderedMapViewToolResult(result: GetRenderedMapViewResult) {
  if (!result.snapshot) {
    return result;
  }

  const snapshot = result.snapshot;
  return {
    ...result,
    snapshot: {
      ...snapshot,
      pdfPane: snapshot.pdfPane
        ? {
            ...snapshot.pdfPane,
            imageBase64: snapshot.pdfPane.imageBase64,
          }
        : null,
      mapPane: snapshot.mapPane
        ? {
            ...snapshot.mapPane,
            imageBase64: snapshot.mapPane.imageBase64,
          }
        : null,
    },
  };
}

export function renderedMapViewStructuredResult(result: GetRenderedMapViewResult) {
  if (!result.snapshot) {
    return result;
  }

  const snapshot = result.snapshot;
  return {
    ...result,
    snapshot: stripImageFields(snapshot),
  };
}
