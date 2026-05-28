import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMapWorkspaceActions } from "@renderer/features/maps/store/MapWorkspaceProvider";
import {
  fetchMapSource,
  fetchMapWorkspace,
  mapWorkspaceQueryKeys,
} from "@renderer/features/maps/hooks/map-workspace-api";

export function useHydrateMapWorkspace(mapId: number) {
  const { setLoading, setReady, setError } = useMapWorkspaceActions();

  const workspaceQuery = useQuery({
    queryKey: mapWorkspaceQueryKeys.workspace(mapId),
    queryFn: () => fetchMapWorkspace(mapId),
  });

  const sourceQuery = useQuery({
    queryKey: mapWorkspaceQueryKeys.source(mapId),
    queryFn: () => fetchMapSource(mapId),
    enabled: Boolean(workspaceQuery.data?.hasSourceFile),
  });

  useEffect(() => {
    setLoading(mapId);
  }, [mapId, setLoading]);

  useEffect(() => {
    if (workspaceQuery.isLoading || sourceQuery.isLoading) {
      return;
    }

    if (workspaceQuery.isError) {
      setError(
        workspaceQuery.error instanceof Error ? workspaceQuery.error.message : "Failed to load map",
      );
      return;
    }

    if (!workspaceQuery.data) {
      setError("Map not found");
      return;
    }

    setReady(mapId, workspaceQuery.data, sourceQuery.data ?? null);
  }, [
    mapId,
    setError,
    setReady,
    sourceQuery.data,
    sourceQuery.isLoading,
    workspaceQuery.data,
    workspaceQuery.error,
    workspaceQuery.isError,
    workspaceQuery.isLoading,
  ]);

  return { workspaceQuery, sourceQuery };
}
