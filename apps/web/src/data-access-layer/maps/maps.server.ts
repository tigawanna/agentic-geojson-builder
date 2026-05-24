import "@tanstack/react-start/server-only";

import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/data-access-layer/pagination.types";
import { db } from "@/lib/drizzle/client.server";
import { mapTable, type MapRecord } from "@/lib/drizzle/schema/maps/map.schema";
import { and, asc, desc, eq, gt, like, lt } from "drizzle-orm";
import type {
  ListMapsInput,
  MapListItem,
  MapWorkspaceState,
  SaveMapPdfInput,
  UpdateMapWorkspaceInput,
} from "./maps.types";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

type MapRowWithPdfFlag = Omit<MapRecord, "pdfData"> & {
  pdfData: Uint8Array | null | undefined;
};

function toMapWorkspaceState(row: MapRowWithPdfFlag): MapWorkspaceState {
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

export async function assertMapBelongsToUser(userId: string, mapId: number) {
  const [row] = await db
    .select({ id: mapTable.id })
    .from(mapTable)
    .where(and(eq(mapTable.id, mapId), eq(mapTable.ownerId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Map not found.");
  }

  return row;
}

export async function createMapForUser(userId: string, name = "Untitled map") {
  const [row] = await db
    .insert(mapTable)
    .values({
      ownerId: userId,
      name,
    })
    .returning();

  return toMapWorkspaceState(row);
}

export async function getMapWorkspaceForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db.select().from(mapTable).where(eq(mapTable.id, mapId)).limit(1);
  if (!row) {
    return null;
  }

  return toMapWorkspaceState(row);
}

export async function loadMapPdfForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

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

  return {
    fileName: row.pdfFileName,
    pdfBase64: Buffer.from(row.pdfData).toString("base64"),
  };
}

export async function saveMapPdfForUser(userId: string, input: SaveMapPdfInput) {
  await assertMapBelongsToUser(userId, input.mapId);

  const pdfData = new Uint8Array(Buffer.from(input.pdfBase64, "base64"));
  const [row] = await db
    .update(mapTable)
    .set({
      pdfData,
      pdfFileName: input.fileName,
      pdfPageCount: input.pageCount ?? null,
      name: input.fileName.replace(/\.pdf$/i, ""),
      updatedAt: new Date(),
    })
    .where(eq(mapTable.id, input.mapId))
    .returning();

  return toMapWorkspaceState(row);
}

export async function updateMapWorkspaceForUser(userId: string, input: UpdateMapWorkspaceInput) {
  await assertMapBelongsToUser(userId, input.mapId);

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

export async function deleteMapForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);
  await db.delete(mapTable).where(eq(mapTable.id, mapId));
}

export async function listMapsForUserPaginated(
  userId: string,
  opts?: ListMapsInput,
): Promise<PaginatedResult<MapListItem>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(mapTable.ownerId, userId)];

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
    .where(and(...conditions))
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
