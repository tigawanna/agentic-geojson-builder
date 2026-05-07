import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { queryOptions } from "@tanstack/react-query";
import { getMapProjectWorkspaceFn, listMapProjectsFn } from "./map-projects.functions";
import type { MapProjectWorkspace } from "./map-projects.types";

export const mapProjectsQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.mapProjects],
  queryFn: async () => listMapProjectsFn(),
});

export const mapProjectWorkspaceQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.mapProjects, projectId],
    queryFn: async (): Promise<MapProjectWorkspace> => getMapProjectWorkspaceFn({ data: { projectId } }),
  });
