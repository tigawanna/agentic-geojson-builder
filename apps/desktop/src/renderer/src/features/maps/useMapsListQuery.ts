import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { mapsQueryKeys } from "./maps-query-keys";

export function useMapsListQuery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return window.api.on("maps:changed", () => {
      void queryClient.invalidateQueries({ queryKey: mapsQueryKeys.list() });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: mapsQueryKeys.list(),
    queryFn: () => window.api.invoke("maps:list", undefined),
  });
}
