import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import type { MapBaseRenderer } from "@shared/maps.types";
import { isMapBaseRenderer } from "@shared/maps.types";

export const MAP_BASE_RENDERER_STORE_KEY = "maps.baseRenderer";

const mapBaseRendererQueryKey = ["settings", "mapBaseRenderer"] as const;

export function useMapBaseRendererQuery() {
  return useQuery({
    queryKey: mapBaseRendererQueryKey,
    queryFn: async (): Promise<MapBaseRenderer> => {
      const value = await ipcInvoke("store:get", { key: MAP_BASE_RENDERER_STORE_KEY });
      if (typeof value === "string" && isMapBaseRenderer(value)) {
        return value;
      }
      return "leaflet";
    },
    staleTime: Infinity,
  });
}

export function useSetMapBaseRendererMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renderer: MapBaseRenderer) => {
      await ipcInvoke("store:set", { key: MAP_BASE_RENDERER_STORE_KEY, value: renderer });
      return renderer;
    },
    onSuccess: (renderer) => {
      queryClient.setQueryData(mapBaseRendererQueryKey, renderer);
    },
  });
}
