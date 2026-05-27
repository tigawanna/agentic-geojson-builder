import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MapWorkspaceState, UpdateMapWorkspaceInput } from "@shared/maps.types";
import { useMapWorkspaceActions } from "../store/MapWorkspaceProvider";
import { mapWorkspaceQueryKeys } from "./map-workspace-api";
import { mapsQueryKeys } from "../maps-query-keys";

function patchFromSavedInput(
  workspace: MapWorkspaceState,
  input: UpdateMapWorkspaceInput,
): Partial<MapWorkspaceState> {
  const patch: Partial<MapWorkspaceState> = {};

  if (input.name !== undefined) {
    patch.name = workspace.name;
  }
  if (input.description !== undefined) {
    patch.description = workspace.description;
  }
  if (input.locationQuery !== undefined) {
    patch.locationQuery = workspace.locationQuery;
  }
  if (input.mapCenterLat !== undefined) {
    patch.mapCenterLat = workspace.mapCenterLat;
  }
  if (input.mapCenterLng !== undefined) {
    patch.mapCenterLng = workspace.mapCenterLng;
  }
  if (input.mapZoom !== undefined) {
    patch.mapZoom = workspace.mapZoom;
  }
  if (input.baseMapStyle !== undefined) {
    patch.baseMapStyle = workspace.baseMapStyle;
  }
  if (input.pdfScale !== undefined) {
    patch.pdfScale = workspace.pdfScale;
  }
  if (input.pdfRotation !== undefined) {
    patch.pdfRotation = workspace.pdfRotation;
  }
  if (input.pdfPanX !== undefined) {
    patch.pdfPanX = workspace.pdfPanX;
  }
  if (input.pdfPanY !== undefined) {
    patch.pdfPanY = workspace.pdfPanY;
  }

  return patch;
}

export function useUpdateMapWorkspaceMutation() {
  const queryClient = useQueryClient();
  const { patchWorkspace } = useMapWorkspaceActions();

  return useMutation({
    mutationFn: (input: UpdateMapWorkspaceInput) =>
      window.api.invoke("maps:updateWorkspace", input),
    onSuccess: (workspace, input) => {
      const patch = patchFromSavedInput(workspace, input);
      patchWorkspace(patch);
      queryClient.setQueryData(mapWorkspaceQueryKeys.workspace(workspace.id), (current) =>
        current ? { ...current, ...patch } : workspace,
      );
      void queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
    },
  });
}
