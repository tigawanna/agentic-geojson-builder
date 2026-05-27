import { desc } from "drizzle-orm";
import type { CreateMapInput, MapListItem } from "../../../shared/maps.types.js";
import { getPgliteDb } from "./client.js";
import { mapTable, type MapRecord } from "./schema/map.schema.js";

function toMapListItem(row: Pick<MapRecord, "id" | "name" | "updatedAt">): MapListItem {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMaps() {
  const db = getPgliteDb();
  const rows = await db
    .select({
      id: mapTable.id,
      name: mapTable.name,
      updatedAt: mapTable.updatedAt,
    })
    .from(mapTable)
    .orderBy(desc(mapTable.id));

  return rows.map(toMapListItem);
}

export async function createMap(input: CreateMapInput = {}): Promise<MapListItem> {
  const db = getPgliteDb();
  const [row] = await db
    .insert(mapTable)
    .values({ name: input.name?.trim() || "Untitled map" })
    .returning({
      id: mapTable.id,
      name: mapTable.name,
      updatedAt: mapTable.updatedAt,
    });

  if (!row) {
    throw new Error("Failed to create map");
  }

  return toMapListItem(row);
}
