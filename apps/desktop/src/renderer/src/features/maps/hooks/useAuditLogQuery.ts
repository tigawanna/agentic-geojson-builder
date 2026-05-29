import { keepPreviousData } from "@tanstack/react-query";
import { useIpcQuery } from "@renderer/hooks/useIpc";

type AuditLogFilters = {
  entityType?: string;
  entityId?: number;
};

export function useAuditLogQuery(
  mapId: number | null,
  page: number,
  perPage: number = 20,
  filters?: AuditLogFilters,
) {
  const offset = (page - 1) * perPage;

  return useIpcQuery(
    "auditLog:list",
    {
      mapId: mapId ?? 0,
      limit: perPage,
      offset,
      entityType: filters?.entityType,
      entityId: filters?.entityId,
    },
    {
      enabled: mapId != null,
      placeholderData: keepPreviousData,
    },
  );
}
