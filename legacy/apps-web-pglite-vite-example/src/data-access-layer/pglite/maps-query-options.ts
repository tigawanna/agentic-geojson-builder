import type { PgliteDb } from "@/lib/pglite/client";
import { mapTable, type MapRecord } from "@/lib/pglite/schema/map.schema";
import { and, asc, desc, eq, gt, like, lt } from "drizzle-orm";
import { keepPreviousData, mutationOptions, queryOptions } from "@tanstack/react-query";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "../pagination.types";
import { queryKeyPrefixes } from "../query-keys";
import { toast } from "sonner";
import { unwrapUnknownError } from "@/utils/errors";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export type MapListItem = Pick<MapRecord, "id" | "name" | "pdfFileName" | "updatedAt">;

export type MapBaseMapStyle = "outline" | "standard" | "satellite";

export type MapWorkspaceState = {
  id: number;
  name: string;
  locationQuery: string;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number | null;
  baseMapStyle: MapBaseMapStyle;
  pdfScale: number;
  pdfRotation: number;
  pdfPanX: number;
  pdfPanY: number;
  pdfFileName: string | null;
  pdfPageCount: number | null;
  hasPdf: boolean;
};

export type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type UpdateMapWorkspaceInput = {
  mapId: number;
  locationQuery?: string;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  mapZoom?: number | null;
  baseMapStyle?: MapBaseMapStyle;
  pdfScale?: number;
  pdfRotation?: number;
  pdfPanX?: number;
  pdfPanY?: number;
  pdfPageCount?: number | null;
  name?: string;
};

function toMapWorkspaceState(row: MapRecord): MapWorkspaceState {
  return {
    id: row.id,
    name: row.name,
    locationQuery: row.locationQuery ?? "",
    mapCenterLat: row.mapCenterLat,
    mapCenterLng: row.mapCenterLng,
    mapZoom: row.mapZoom,
    baseMapStyle:
      row.baseMapStyle === "outline"
        ? "outline"
        : row.baseMapStyle === "satellite"
          ? "satellite"
          : "standard",
    pdfScale: row.pdfScale,
    pdfRotation: row.pdfRotation,
    pdfPanX: row.pdfPanX,
    pdfPanY: row.pdfPanY,
    pdfFileName: row.pdfFileName,
    pdfPageCount: row.pdfPageCount,
    hasPdf: row.pdfData !== null && row.pdfData !== undefined && row.pdfData.length > 0,
  };
}

export async function createMap(db: PgliteDb, name = "Untitled map") {
  const [row] = await db.insert(mapTable).values({ name }).returning();
  return row;
}

export async function getMapWorkspace(db: PgliteDb, mapId: number) {
  const [row] = await db.select().from(mapTable).where(eq(mapTable.id, mapId)).limit(1);
  if (!row) {
    return null;
  }
  return toMapWorkspaceState(row);
}

export async function loadMapPdfFile(db: PgliteDb, mapId: number) {
  const [row] = await db
    .select({
      pdfData: mapTable.pdfData,
      pdfFileName: mapTable.pdfFileName,
    })
    .from(mapTable)
    .where(eq(mapTable.id, mapId))
    .limit(1);

  if (!row?.pdfData || !row.pdfFileName) {
    return null;
  }

  const pdfBytes = Uint8Array.from(row.pdfData);
  return new File([pdfBytes], row.pdfFileName, { type: "application/pdf" });
}

export async function saveMapPdf(
  db: PgliteDb,
  input: { mapId: number; file: File; pageCount?: number | null },
) {
  const pdfData = new Uint8Array(await input.file.arrayBuffer());
  const [row] = await db
    .update(mapTable)
    .set({
      pdfData,
      pdfFileName: input.file.name,
      pdfPageCount: input.pageCount ?? null,
      name: input.file.name.replace(/\.pdf$/i, ""),
      updatedAt: new Date(),
    })
    .where(eq(mapTable.id, input.mapId))
    .returning();

  return toMapWorkspaceState(row);
}

export async function updateMapWorkspace(db: PgliteDb, input: UpdateMapWorkspaceInput) {
  const { mapId, ...values } = input;
  const [row] = await db
    .update(mapTable)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(mapTable.id, mapId))
    .returning();

  return toMapWorkspaceState(row);
}

type ListMapsOpts = {
  keyword?: string;
  cursor?: string;
  direction?: "after" | "before";
};

export async function listMapsPaginated(
  db: PgliteDb,
  opts?: ListMapsOpts,
): Promise<PaginatedResult<MapListItem>> {
  const direction = opts?.direction ?? "after";
  const conditions = [];

  if (opts?.keyword) {
    conditions.push(like(mapTable.name, `%${opts.keyword}%`));
  }

  if (opts?.cursor) {
    const cursorId = Number(opts.cursor);
    conditions.push(direction === "before" ? lt(mapTable.id, cursorId) : gt(mapTable.id, cursorId));
  }

  const rows = await db
    .select({
      id: mapTable.id,
      name: mapTable.name,
      pdfFileName: mapTable.pdfFileName,
      updatedAt: mapTable.updatedAt,
    })
    .from(mapTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(direction === "before" ? desc(mapTable.id) : asc(mapTable.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const orderedRows =
    direction === "before" ? rows.slice(0, PAGE_SIZE).reverse() : rows.slice(0, PAGE_SIZE);

  const items = orderedRows;

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (direction === "after") {
    nextCursor = hasMore ? String(items[items.length - 1].id) : undefined;
    previousCursor = opts?.cursor !== undefined ? String(items[0]?.id) : undefined;
  } else {
    previousCursor = hasMore ? String(items[0]?.id) : undefined;
    nextCursor = items.length > 0 ? String(items[items.length - 1].id) : undefined;
  }

  return { items, nextCursor, previousCursor };
}

export const getMapWorkspaceQueryOptions = (db: PgliteDb, mapId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.maps, mapId],
    queryFn: () => getMapWorkspace(db, mapId),
  });

export const listMapsQueryOptions = (db: PgliteDb, opts?: ListMapsOpts) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.maps, "list", opts?.keyword, opts?.cursor, opts?.direction],
    queryFn: () => listMapsPaginated(db, opts),
    placeholderData: keepPreviousData,
  });

export const saveMapPdfMutationOptions = (db: PgliteDb) =>
  mutationOptions({
    mutationFn: (input: { mapId: number; file: File; pageCount?: number | null }) =>
      saveMapPdf(db, input),
    onSuccess: (map, __, ___, ctx) => {
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, map.id] });
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, "list"] });
      toast.success("PDF saved");
    },
    onError: (err: unknown) => {
      toast.error("Failed to save PDF", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const updateMapWorkspaceMutationOptions = (db: PgliteDb) =>
  mutationOptions({
    mutationFn: (input: UpdateMapWorkspaceInput) => updateMapWorkspace(db, input),
    onSuccess: (map, __, ___, ctx) => {
      void ctx.client.setQueryData([queryKeyPrefixes.maps, map.id], map);
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, "list"] });
    },
    onError: (err: unknown) => {
      toast.error("Failed to save map preferences", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const deleteMapMutationOptions = (db: PgliteDb) =>
  mutationOptions({
    mutationFn: async (id: number) => {
      await db.delete(mapTable).where(eq(mapTable.id, id));
    },
    onSuccess: (_, __, ___, ctx) => {
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps] });
      toast.success("Map deleted");
    },
    onError: (err: unknown) => {
      toast.error("Failed to delete map", {
        description: unwrapUnknownError(err).message,
      });
    },
  });
