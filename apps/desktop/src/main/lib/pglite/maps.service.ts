import { desc, eq } from "drizzle-orm";
import type {
  CreateMapInput,
  CreateMapProjectInput,
  MapListItem,
  MapSourceFilePayload,
  MapThumbnailPayload,
  MapWorkspaceState,
  ReplaceMapSourceInput,
  UpdateMapWorkspaceInput,
} from "../../../shared/maps.types.js";
import { deleteMapAssets, readMapSourceFile, saveMapSourceFile } from "./map-files.service.js";
import {
  generateMapThumbnailFromSource,
  readMapThumbnailPayload,
  saveMapThumbnailFromBase64,
} from "./map-thumbnail.service.js";
import { getPgliteDb } from "./client.js";
import { mapTable, type MapRecord } from "./schema/map.schema.js";
import { getTileCacheBaseDir } from "../tile-cache/paths.js";
import { rm } from "node:fs/promises";
import { getMapCacheRoot } from "@repo/tile-cache/paths";

function toBaseMapStyle(value: string | null): MapWorkspaceState["baseMapStyle"] {
  if (value === "outline" || value === "standard" || value === "satellite") {
    return value;
  }
  return "satellite";
}

export function toMapWorkspaceState(row: MapRecord): MapWorkspaceState {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    locationQuery: row.locationQuery ?? "",
    mapCenterLat: row.mapCenterLat,
    mapCenterLng: row.mapCenterLng,
    mapZoom: row.mapZoom,
    baseMapStyle: toBaseMapStyle(row.baseMapStyle),
    pdfScale: row.pdfScale,
    pdfRotation: row.pdfRotation,
    pdfPanX: row.pdfPanX,
    pdfPanY: row.pdfPanY,
    pdfFileName: row.pdfFileName,
    folderPath: row.folderPath,
    pdfPageCount: row.pdfPageCount,
    hasSourceFile: Boolean(row.folderPath && row.pdfFileName),
  };
}

function toMapListItem(
  row: Pick<
    MapRecord,
    "id" | "name" | "description" | "locationQuery" | "updatedAt" | "thumbnailFileName"
  >,
): MapListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    locationQuery: row.locationQuery,
    updatedAt: row.updatedAt.toISOString(),
    hasThumbnail: Boolean(row.thumbnailFileName),
  };
}

async function persistMapThumbnail(
  mapId: number,
  sourceBuffer: Buffer,
  mimeType: string,
  fileName: string,
  thumbnailBase64?: string,
  thumbnailMimeType?: string,
): Promise<string | null> {
  if (thumbnailBase64) {
    return saveMapThumbnailFromBase64(mapId, thumbnailBase64, thumbnailMimeType ?? "image/webp");
  }

  return generateMapThumbnailFromSource(mapId, sourceBuffer, mimeType, fileName);
}

export async function listMaps(): Promise<MapListItem[]> {
  const db = getPgliteDb();
  const rows = await db
    .select({
      id: mapTable.id,
      name: mapTable.name,
      description: mapTable.description,
      locationQuery: mapTable.locationQuery,
      updatedAt: mapTable.updatedAt,
      thumbnailFileName: mapTable.thumbnailFileName,
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
      description: mapTable.description,
      locationQuery: mapTable.locationQuery,
      updatedAt: mapTable.updatedAt,
      thumbnailFileName: mapTable.thumbnailFileName,
    });

  if (!row) {
    throw new Error("Failed to create map");
  }

  return toMapListItem(row);
}

export async function getMapWorkspace(mapId: number): Promise<MapWorkspaceState | null> {
  const db = getPgliteDb();
  const [row] = await db.select().from(mapTable).where(eq(mapTable.id, mapId)).limit(1);
  return row ? toMapWorkspaceState(row) : null;
}

export async function createMapProject(input: CreateMapProjectInput): Promise<MapWorkspaceState> {
  const db = getPgliteDb();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Map name is required");
  }

  const [created] = await db
    .insert(mapTable)
    .values({
      name,
      description: input.description?.trim() || null,
      locationQuery: input.locationQuery?.trim() || null,
      mapCenterLat: input.mapCenterLat ?? null,
      mapCenterLng: input.mapCenterLng ?? null,
      mapZoom: input.mapCenterLat != null && input.mapCenterLng != null ? 13 : null,
      baseMapStyle: input.baseMapStyle ?? "satellite",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create map project");
  }

  const buffer = Buffer.from(input.fileBase64, "base64");
  const folderPath = await saveMapSourceFile(created.id, input.fileName, buffer);
  const thumbnailFileName = await persistMapThumbnail(
    created.id,
    buffer,
    input.mimeType,
    input.fileName,
    input.thumbnailBase64,
    input.thumbnailMimeType,
  );

  const [updated] = await db
    .update(mapTable)
    .set({
      folderPath,
      pdfFileName: input.fileName,
      thumbnailFileName,
    })
    .where(eq(mapTable.id, created.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to finalize map project");
  }

  return toMapWorkspaceState(updated);
}

export async function readMapSourcePayload(mapId: number): Promise<MapSourceFilePayload | null> {
  const workspace = await getMapWorkspace(mapId);
  if (!workspace?.folderPath || !workspace.pdfFileName) {
    return null;
  }

  const buffer = await readMapSourceFile(workspace.folderPath, workspace.pdfFileName);
  const lower = workspace.pdfFileName.toLowerCase();
  const mimeType = lower.endsWith(".pdf")
    ? "application/pdf"
    : lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";

  return {
    fileName: workspace.pdfFileName,
    mimeType,
    fileBase64: buffer.toString("base64"),
  };
}

export async function readMapThumbnail(mapId: number): Promise<MapThumbnailPayload | null> {
  const db = getPgliteDb();
  const [row] = await db
    .select({
      folderPath: mapTable.folderPath,
      thumbnailFileName: mapTable.thumbnailFileName,
    })
    .from(mapTable)
    .where(eq(mapTable.id, mapId))
    .limit(1);

  if (!row?.folderPath || !row.thumbnailFileName) {
    return null;
  }

  return readMapThumbnailPayload(row.folderPath, row.thumbnailFileName);
}

export async function updateMapWorkspace(
  input: UpdateMapWorkspaceInput,
): Promise<MapWorkspaceState> {
  const db = getPgliteDb();
  const patch: Partial<MapRecord> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Map name is required");
    }
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.locationQuery !== undefined) {
    patch.locationQuery = input.locationQuery.trim() || null;
  }
  if (input.mapCenterLat !== undefined) {
    patch.mapCenterLat = input.mapCenterLat;
  }
  if (input.mapCenterLng !== undefined) {
    patch.mapCenterLng = input.mapCenterLng;
  }
  if (input.mapZoom !== undefined) {
    patch.mapZoom = input.mapZoom;
  }
  if (input.baseMapStyle !== undefined) {
    patch.baseMapStyle = input.baseMapStyle;
  }
  if (input.pdfScale !== undefined) {
    patch.pdfScale = input.pdfScale;
  }
  if (input.pdfRotation !== undefined) {
    patch.pdfRotation = input.pdfRotation;
  }
  if (input.pdfPanX !== undefined) {
    patch.pdfPanX = input.pdfPanX;
  }
  if (input.pdfPanY !== undefined) {
    patch.pdfPanY = input.pdfPanY;
  }

  const [updated] = await db
    .update(mapTable)
    .set(patch)
    .where(eq(mapTable.id, input.mapId))
    .returning();

  if (!updated) {
    throw new Error("Map not found");
  }

  return toMapWorkspaceState(updated);
}

export async function replaceMapSource(
  input: ReplaceMapSourceInput,
): Promise<MapSourceFilePayload> {
  const workspace = await getMapWorkspace(input.mapId);
  if (!workspace) {
    throw new Error("Map not found");
  }

  const buffer = Buffer.from(input.fileBase64, "base64");
  const folderPath = await saveMapSourceFile(input.mapId, input.fileName, buffer);
  const thumbnailFileName = await persistMapThumbnail(
    input.mapId,
    buffer,
    input.mimeType,
    input.fileName,
    input.thumbnailBase64,
    input.thumbnailMimeType,
  );

  const db = getPgliteDb();
  const [updated] = await db
    .update(mapTable)
    .set({
      folderPath,
      pdfFileName: input.fileName,
      thumbnailFileName,
      updatedAt: new Date(),
    })
    .where(eq(mapTable.id, input.mapId))
    .returning({ pdfFileName: mapTable.pdfFileName, folderPath: mapTable.folderPath });

  if (!updated?.pdfFileName || !updated.folderPath) {
    throw new Error("Failed to replace map source");
  }

  return {
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileBase64: input.fileBase64,
  };
}

export async function deleteMap(mapId: number): Promise<void> {
  const db = getPgliteDb();
  const [row] = await db
    .select({ id: mapTable.id })
    .from(mapTable)
    .where(eq(mapTable.id, mapId))
    .limit(1);

  if (!row) {
    throw new Error("Map not found");
  }

  await db.delete(mapTable).where(eq(mapTable.id, mapId));

  await deleteMapAssets(mapId);
  await rm(getMapCacheRoot(getTileCacheBaseDir(), mapId), { recursive: true, force: true });
}
