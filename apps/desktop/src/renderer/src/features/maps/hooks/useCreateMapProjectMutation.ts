import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { mapWorkspaceStore } from "../store/map-workspace-store";
import { useCreateMapWizardStore } from "../store/create-map-wizard-store";
import { mapWorkspaceQueryKeys } from "./map-workspace-api";
import { mapsQueryKeys } from "../maps-query-keys";

type CreateMapProjectMutationInput = {
  name: string;
  file: File;
  description?: string;
  locationQuery?: string;
  mapCenterLat?: number;
  mapCenterLng?: number;
};

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
  const setCreating = () => mapWorkspaceStore.getState().setCreating();

  return useMutation({
    mutationFn: async (input: CreateMapProjectMutationInput) => {
      const fileBase64 = await fileToBase64(input.file);
      return window.api.invoke("maps:createProject", {
        name: input.name,
        fileName: input.file.name,
        mimeType: input.file.type || "application/octet-stream",
        fileBase64,
        ...(input.description ? { description: input.description } : {}),
        ...(input.locationQuery ? { locationQuery: input.locationQuery } : {}),
        ...(input.mapCenterLat !== undefined ? { mapCenterLat: input.mapCenterLat } : {}),
        ...(input.mapCenterLng !== undefined ? { mapCenterLng: input.mapCenterLng } : {}),
      });
    },
    onMutate: () => {
      setCreating();
      useCreateMapWizardStore.getState().setStep("processing");
    },
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
      queryClient.setQueryData(mapWorkspaceQueryKeys.workspace(workspace.id), workspace);
      useCreateMapWizardStore.getState().reset();
      await navigate({ to: "/maps/$mapId", params: { mapId: String(workspace.id) } });
    },
    onError: (error) => {
      mapWorkspaceStore
        .getState()
        .setError(error instanceof Error ? error.message : "Failed to create map project");
      useCreateMapWizardStore.getState().setStep("details");
    },
  });
}
