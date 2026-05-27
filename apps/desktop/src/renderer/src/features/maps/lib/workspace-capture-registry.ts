import type { RenderedMapView } from "@shared/rendered-map-view.types";

export type WorkspaceCaptureFn = () => Promise<RenderedMapView>;

const captures = new Map<number, WorkspaceCaptureFn>();

export function registerWorkspaceCapture(mapId: number, capture: WorkspaceCaptureFn) {
  captures.set(mapId, capture);
  return () => {
    if (captures.get(mapId) === capture) {
      captures.delete(mapId);
    }
  };
}

export function getWorkspaceCapture(mapId: number) {
  return captures.get(mapId) ?? null;
}
