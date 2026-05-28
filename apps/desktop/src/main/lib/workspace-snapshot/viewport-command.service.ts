import { randomUUID } from "node:crypto";
import type { SetMapViewportResponse } from "@shared/rendered-map-view.types.js";
import { broadcastToRenderers } from "@main/ipc/broadcast.js";

type PendingViewportCommand = {
  resolve: (result: { latitude: number; longitude: number; zoom: number }) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const pending = new Map<string, PendingViewportCommand>();

export function completeViewportCommand(response: SetMapViewportResponse) {
  const entry = pending.get(response.requestId);
  if (!entry) {
    return;
  }

  clearTimeout(entry.timeout);
  pending.delete(response.requestId);

  if (response.error) {
    entry.reject(new Error(response.error));
    return;
  }

  if (!response.viewport) {
    entry.reject(new Error("Viewport command returned no result."));
    return;
  }

  entry.resolve(response.viewport);
}

type SetViewportInput = {
  mapId: number;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  fitBounds?: { north: number; south: number; east: number; west: number };
};

export async function requestSetMapViewport(
  input: SetViewportInput,
  timeoutMs = 10000,
): Promise<{ latitude: number; longitude: number; zoom: number }> {
  const requestId = randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Viewport command timed out. Is the map workspace open?"));
    }, timeoutMs);

    pending.set(requestId, { resolve, reject, timeout });

    broadcastToRenderers("workspace:setMapViewport", {
      requestId,
      mapId: input.mapId,
      latitude: input.latitude,
      longitude: input.longitude,
      zoom: input.zoom,
      fitBounds: input.fitBounds,
    });
  });
}
