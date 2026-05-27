import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteMapInput } from "@shared/maps.types";
import { mapsQueryKeys } from "../maps-query-keys";
import { mapThumbnailQueryKeys } from "./useMapThumbnailQuery";

export function useDeleteMapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteMapInput) => window.api.invoke("maps:delete", input),
    onSuccess: async (_result, input) => {
      queryClient.removeQueries({ queryKey: mapThumbnailQueryKeys.thumbnail(input.mapId) });
      await queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
    },
  });
}
