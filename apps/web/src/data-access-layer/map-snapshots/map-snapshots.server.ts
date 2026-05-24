import "@tanstack/react-start/server-only";

import { assertMapBelongsToUser } from "@/data-access-layer/maps/maps.server";
import { db } from "@/lib/drizzle/client.server";
import { mapRenderSnapshotTable } from "@/lib/drizzle/schema/maps/map-render-snapshot.schema";
import type { RenderedMapView } from "@/lib/rendered-map-view/types";
import { eq } from "drizzle-orm";

export async function saveRenderedMapViewForUser(
  userId: string,
  mapId: number,
  snapshot: RenderedMapView,
) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db
    .insert(mapRenderSnapshotTable)
    .values({
      mapId,
      source: snapshot.source,
      snapshotJson: snapshot,
      capturedAt: new Date(snapshot.capturedAt),
    })
    .onConflictDoUpdate({
      target: mapRenderSnapshotTable.mapId,
      set: {
        source: snapshot.source,
        snapshotJson: snapshot,
        capturedAt: new Date(snapshot.capturedAt),
      },
    })
    .returning();

  return row.snapshotJson;
}

export async function getRenderedMapViewForUser(userId: string, mapId: number) {
  await assertMapBelongsToUser(userId, mapId);

  const [row] = await db
    .select()
    .from(mapRenderSnapshotTable)
    .where(eq(mapRenderSnapshotTable.mapId, mapId))
    .limit(1);

  if (!row) {
    return {
      mapId,
      ready: false as const,
      reason: "no_client_snapshot" as const,
      message:
        "No workspace snapshot is stored yet. Open the map workspace and capture the view, or send a message from the in-app assistant to auto-capture.",
      snapshot: null,
    };
  }

  return {
    mapId,
    ready: true as const,
    reason: "client_snapshot" as const,
    capturedAt: row.capturedAt.toISOString(),
    snapshot: row.snapshotJson,
  };
}
