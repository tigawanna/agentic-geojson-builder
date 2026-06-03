import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipcInvoke } from "@renderer/hooks/useIpc";

export const MAPBOX_TOKEN_STORE_KEY = "maps.mapboxAccessToken";

const mapboxTokenQueryKey = ["settings", "mapboxToken"] as const;

export function useMapboxTokenQuery() {
  return useQuery({
    queryKey: mapboxTokenQueryKey,
    queryFn: async (): Promise<string | null> => {
      const value = await ipcInvoke("store:get", { key: MAPBOX_TOKEN_STORE_KEY });
      return typeof value === "string" && value.trim().length > 0 ? value : null;
    },
    staleTime: Infinity,
  });
}

export function useSetMapboxTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string | null) => {
      const trimmed = token?.trim() ?? "";
      if (trimmed.length === 0) {
        await ipcInvoke("store:delete", { key: MAPBOX_TOKEN_STORE_KEY });
        return null;
      }

      await ipcInvoke("store:set", { key: MAPBOX_TOKEN_STORE_KEY, value: trimmed });
      return trimmed;
    },
    onSuccess: (value) => {
      queryClient.setQueryData(mapboxTokenQueryKey, value);
    },
  });
}
