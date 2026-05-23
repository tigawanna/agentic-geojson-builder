import type { PgliteDb } from "@/lib/pglite/client";
import { controlPointTable } from "@/lib/pglite/schema/control-point.schema";
import { createMap } from "@/data-access-layer/pglite/maps-query-options";
import { unwrapUnknownError } from "@/utils/errors";
import { asc, eq } from "drizzle-orm";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "../query-keys";
import { toast } from "sonner";

export type ControlPointRecord = typeof controlPointTable.$inferSelect;

export type ControlPointViewModel = {
  id: number;
  mapId: number;
  label: string | null;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  createdAt: Date;
};

function toControlPointViewModel(row: ControlPointRecord): ControlPointViewModel {
  return {
    id: row.id,
    mapId: row.mapId,
    label: row.label,
    imageX: row.imageX,
    imageY: row.imageY,
    longitude: row.location.x,
    latitude: row.location.y,
    createdAt: row.createdAt,
  };
}

export async function ensureDraftMap(db: PgliteDb, name = "Untitled map") {
  return createMap(db, name);
}

export async function listControlPoints(db: PgliteDb, mapId: number) {
  const rows = await db
    .select()
    .from(controlPointTable)
    .where(eq(controlPointTable.mapId, mapId))
    .orderBy(asc(controlPointTable.id));

  return rows.map(toControlPointViewModel);
}

type CreateControlPointInput = {
  mapId: number;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  label?: string;
};

export async function createControlPoint(db: PgliteDb, input: CreateControlPointInput) {
  const [row] = await db
    .insert(controlPointTable)
    .values({
      mapId: input.mapId,
      imageX: input.imageX,
      imageY: input.imageY,
      location: { x: input.longitude, y: input.latitude },
      label: input.label ?? null,
    })
    .returning();

  return toControlPointViewModel(row);
}

export const listControlPointsQueryOptions = (db: PgliteDb, mapId: number | null) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.controlPoints, mapId],
    queryFn: () => {
      if (mapId === null) {
        return Promise.resolve([]);
      }
      return listControlPoints(db, mapId);
    },
    enabled: mapId !== null,
  });

export const createControlPointMutationOptions = (db: PgliteDb) =>
  mutationOptions({
    mutationFn: (input: CreateControlPointInput) => createControlPoint(db, input),
    onSuccess: (point, __, ___, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.controlPoints, point.mapId],
      });
      toast.success("Reference point saved");
    },
    onError: (err: unknown) => {
      toast.error("Failed to save reference point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });
