import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReplaceMapSourceInput } from "@shared/maps.types";
import { useMapWorkspaceActions } from "../store/MapWorkspaceProvider";
import { mapsQueryKeys } from "../maps-query-keys";
import { mapWorkspaceQueryKeys } from "./map-workspace-api";
import { mapThumbnailQueryKeys } from "./useMapThumbnailQuery";

export function useReplaceMapSourceMutation() {
  const queryClient = useQueryClient();
  const { setSourceFile } = useMapWorkspaceActions();

  return useMutation({
    mutationFn: (input: ReplaceMapSourceInput) => window.api.invoke("maps:replaceSource", input),
    onSuccess: (sourceFile, input) => {
      setSourceFile(sourceFile);
      queryClient.setQueryData(mapWorkspaceQueryKeys.source(input.mapId), sourceFile);
      void queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: mapThumbnailQueryKeys.thumbnail(input.mapId),
      });
    },
  });
}
