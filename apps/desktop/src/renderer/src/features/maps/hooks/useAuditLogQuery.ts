import { keepPreviousData } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";

export type AuditLogFilters = {
  mapId?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
  source?: string;
  search?: string;
};

export function useAuditLogQuery(
  mapId: number | undefined,
  page: number,
  perPage: number = 20,
  filters?: AuditLogFilters,
) {
  const offset = (page - 1) * perPage;
  const scopedMapId = mapId ?? filters?.mapId;

  return useIpcQuery(
    "auditLog:list",
    {
      mapId: scopedMapId,
      limit: perPage,
      offset,
      entityType: filters?.entityType,
      entityId: filters?.entityId,
      action: filters?.action,
      source: filters?.source,
      search: filters?.search,
    },
    {
      enabled: mapId == null || mapId > 0,
      placeholderData: keepPreviousData,
    },
  );
}
