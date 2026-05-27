import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateMapInput, MapListItem } from "../../../../shared/maps.types";
import { mapsQueryKeys } from "./maps-query-keys";

type CreateMapContext = {
  previous: MapListItem[] | undefined;
  tempId: number;
};

export function useCreateMapMutation() {
  const queryClient = useQueryClient();

  return useMutation<MapListItem, Error, CreateMapInput, CreateMapContext>({
    mutationFn: (input) => window.api.invoke("maps:create", input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: mapsQueryKeys.list() });

      const previous = queryClient.getQueryData<MapListItem[]>(mapsQueryKeys.list());
      const tempId = -Date.now();
      const optimistic: MapListItem = {
        id: tempId,
        name: input.name?.trim() || "Untitled map",
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<MapListItem[]>(mapsQueryKeys.list(), (current = []) => [
        optimistic,
        ...current,
      ]);

      return { previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(mapsQueryKeys.list(), context.previous);
      }
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<MapListItem[]>(mapsQueryKeys.list(), (current = []) => {
        const withoutTemp = current.filter((map) => map.id !== context?.tempId);
        return [created, ...withoutTemp.filter((map) => map.id !== created.id)];
      });
    },
  });
}
