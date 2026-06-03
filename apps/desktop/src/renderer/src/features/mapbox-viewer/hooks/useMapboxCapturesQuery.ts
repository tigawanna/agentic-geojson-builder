import { useQueryClient } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";
import { useIpcEvent } from "@renderer/hooks/useIpcEvent";

export const mapboxCapturesQueryKey = ["mapboxCaptures:list"] as const;

export function useMapboxCapturesQuery() {
  const queryClient = useQueryClient();

  useIpcEvent("mapboxCaptures:changed", () => {
    void queryClient.invalidateQueries({ queryKey: mapboxCapturesQueryKey });
  });

  return useIpcQuery("mapboxCaptures:list", undefined, {
    staleTime: 0,
    refetchOnMount: "always",
  });
}
