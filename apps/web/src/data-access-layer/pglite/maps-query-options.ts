import type { PgliteDb } from "@/lib/pglite/client";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import { and, asc, desc, eq, gt, like, lt } from "drizzle-orm";
import { keepPreviousData, mutationOptions, queryOptions } from "@tanstack/react-query";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "../pagination.types";
import { queryKeyPrefixes } from "../query-keys";
import { toast } from "sonner";
import { unwrapUnknownError } from "@/utils/errors";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export type MapListItem = typeof mapTable.$inferSelect;

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

export const listMapsQueryOptions = (db: PgliteDb, opts?: ListMapsOpts) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.maps, opts?.keyword, opts?.cursor, opts?.direction],
    queryFn: () => listMapsPaginated(db, opts),
    placeholderData: keepPreviousData,
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
