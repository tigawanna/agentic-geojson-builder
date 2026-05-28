import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReplaceMapSourceInput } from "@shared/maps.types";
import { useMapWorkspaceActions } from "@renderer/features/maps/store/MapWorkspaceProvider";
import { mapsQueryKeys } from "@renderer/features/maps/maps-query-keys";
import { mapWorkspaceQueryKeys } from "@renderer/features/maps/hooks/map-workspace-api";
import { mapThumbnailQueryKeys } from "@renderer/features/maps/hooks/useMapThumbnailQuery";

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
