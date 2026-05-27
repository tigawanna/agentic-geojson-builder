import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { mapWorkspaceStore } from "../store/map-workspace-store";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { mapWorkspaceQueryKeys } from "./map-workspace-api";
import { mapsQueryKeys } from "../maps-query-keys";
import { tileCacheQueryKeys } from "./tile-cache-api";

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function useCreateMapProjectMutation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const state = useCreateMapWizardStore.getState();
      const {
        file,
        name,
        description,
        locationQuery,
        latitude,
        longitude,
        cacheCorners,
        cacheStyle,
      } = state;

      if (!file || !name.trim() || cacheCorners.length !== 4) {
        throw new Error("Missing required project details.");
      }

      const parsedLat = latitude.trim() ? Number(latitude) : undefined;
      const parsedLng = longitude.trim() ? Number(longitude) : undefined;
      const fileBase64 = await fileToBase64(file);

      useCreateMapWizardStore.getState().setBuildMessage("Creating project…");

      const workspace = await window.api.invoke("maps:createProject", {
        name: name.trim(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(locationQuery.trim() ? { locationQuery: locationQuery.trim() } : {}),
        ...(parsedLat !== undefined && Number.isFinite(parsedLat)
          ? { mapCenterLat: parsedLat }
          : {}),
        ...(parsedLng !== undefined && Number.isFinite(parsedLng)
          ? { mapCenterLng: parsedLng }
          : {}),
        baseMapStyle: cacheStyle,
      });

      useCreateMapWizardStore.getState().setBuildMessage("Saving cache bounds…");

      await window.api.invoke("tileCache:setBoundsFromCorners", {
        mapId: workspace.id,
        corners: cacheCorners,
        style: cacheStyle,
      });

      useCreateMapWizardStore.getState().setBuildMessage("Downloading map tiles locally…");

      const buildResult = await window.api.invoke("tileCache:build", { mapId: workspace.id });

      return { workspace, buildResult };
    },
    onMutate: () => {
      mapWorkspaceStore.getState().setCreating();
      useCreateMapWizardStore.getState().setStep("cacheBuilding");
      useCreateMapWizardStore.getState().setBuildProgress(null);
      useCreateMapWizardStore.getState().setBuildMessage(null);
    },
    onSuccess: async ({ workspace, buildResult }) => {
      await queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
      queryClient.setQueryData(mapWorkspaceQueryKeys.workspace(workspace.id), workspace);
      queryClient.setQueryData(tileCacheQueryKeys.status(workspace.id), buildResult.config);
      useCreateMapWizardStore.getState().reset();
      await navigate({ to: "/maps/$mapId", params: { mapId: String(workspace.id) } });
    },
    onError: (error) => {
      mapWorkspaceStore
        .getState()
        .setError(error instanceof Error ? error.message : "Failed to create map project");
      useCreateMapWizardStore.getState().setStep("cacheBounds");
    },
  });
}
