import type { MapWorkspaceState } from "@shared/maps.types";
import { mapsQueryKeys } from "@renderer/features/maps/maps-query-keys";

export const mapWorkspaceQueryKeys = {
  workspace: (mapId: number) => [...mapsQueryKeys.all, "workspace", mapId] as const,
  source: (mapId: number) => [...mapsQueryKeys.all, "source", mapId] as const,
};

export async function fetchMapWorkspace(mapId: number): Promise<MapWorkspaceState | null> {
  return window.api.invoke("maps:getWorkspace", { mapId });
}

export async function fetchMapSource(mapId: number) {
  return window.api.invoke("maps:readSource", { mapId });
}

export function fileBase64ToDataUrl(mimeType: string, fileBase64: string): string {
  return `data:${mimeType};base64,${fileBase64}`;
}
