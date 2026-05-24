import "@tanstack/react-start/server-only";

import {
  createControlPointForUser,
  deleteControlPointForUser,
  listControlPointsForUser,
  updateControlPointForUser,
} from "@/data-access-layer/control-points/control-points.server";
import type { ControlPointViewModel } from "@/data-access-layer/control-points/control-points.types";
import {
  computeGeoreferenceForUser,
  getGeoreferenceForUser,
  lonLatToPdfPixelForUser,
  pdfPixelToLonLatForUser,
} from "@/data-access-layer/georeference/georeference.server";
import type { GeoreferenceViewModel } from "@/data-access-layer/georeference/georeference.types";
import {
  createMapForUser,
  deleteMapForUser,
  getMapWorkspaceForUser,
  listMapsForUserPaginated,
  loadMapPdfForUser,
  saveMapPdfForUser,
  updateMapWorkspaceForUser,
} from "@/data-access-layer/maps/maps.server";
import type { MapWorkspaceState } from "@/data-access-layer/maps/maps.types";
import type {
  CreateControlPointToolInput,
  CreateMapToolInput,
  DeleteControlPointToolInput,
  ListMapsToolInput,
  LonLatToolInput,
  PdfPixelToolInput,
  SaveMapPdfToolInput,
  UpdateControlPointToolInput,
  UpdateMapWorkspaceToolInput,
} from "./geojson-tool-schemas";

type ToolContext = {
  userId: string;
};

function serializeMap(map: MapWorkspaceState) {
  return map;
}

function serializeControlPoint(point: ControlPointViewModel) {
  return {
    id: point.id,
    mapId: point.mapId,
    label: point.label,
    imageX: point.imageX,
    imageY: point.imageY,
    longitude: point.longitude,
    latitude: point.latitude,
    createdAt: point.createdAt.toISOString(),
  };
}

function serializeGeoreference(georeference: GeoreferenceViewModel) {
  return georeference;
}

export async function listMapsTool(context: ToolContext, input: ListMapsToolInput) {
  const result = await listMapsForUserPaginated(context.userId, input);

  return {
    items: result.items.map((item) => ({
      id: item.id,
      name: item.name,
      pdfFileName: item.pdfFileName,
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor: result.nextCursor,
    previousCursor: result.previousCursor,
  };
}

export async function getMapWorkspaceTool(context: ToolContext, mapId: number) {
  const map = await getMapWorkspaceForUser(context.userId, mapId);
  if (!map) {
    throw new Error("Map not found.");
  }

  return { map: serializeMap(map) };
}

export async function createMapTool(context: ToolContext, input: CreateMapToolInput) {
  const map = await createMapForUser(context.userId, input.name ?? "Untitled map");
  return { map: serializeMap(map) };
}

export async function updateMapWorkspaceTool(
  context: ToolContext,
  input: UpdateMapWorkspaceToolInput,
) {
  const map = await updateMapWorkspaceForUser(context.userId, input);
  return { map: serializeMap(map) };
}

export async function deleteMapTool(context: ToolContext, mapId: number) {
  await deleteMapForUser(context.userId, mapId);
  return { mapId, deleted: true as const };
}

export async function saveMapPdfTool(context: ToolContext, input: SaveMapPdfToolInput) {
  const map = await saveMapPdfForUser(context.userId, input);
  return { map: serializeMap(map) };
}

export async function loadMapPdfTool(context: ToolContext, mapId: number) {
  const pdf = await loadMapPdfForUser(context.userId, mapId);
  if (!pdf) {
    throw new Error("Map PDF not found.");
  }

  return pdf;
}

export async function listControlPointsTool(context: ToolContext, mapId: number) {
  const controlPoints = await listControlPointsForUser(context.userId, mapId);
  return {
    controlPoints: controlPoints.map(serializeControlPoint),
  };
}

export async function createControlPointTool(
  context: ToolContext,
  input: CreateControlPointToolInput,
) {
  const controlPoint = await createControlPointForUser(context.userId, input);
  return { controlPoint: serializeControlPoint(controlPoint) };
}

export async function updateControlPointTool(
  context: ToolContext,
  input: UpdateControlPointToolInput,
) {
  const controlPoint = await updateControlPointForUser(context.userId, input);
  return { controlPoint: serializeControlPoint(controlPoint) };
}

export async function deleteControlPointTool(
  context: ToolContext,
  input: DeleteControlPointToolInput,
) {
  await deleteControlPointForUser(context.userId, input);
  return {
    mapId: input.mapId,
    controlPointId: input.controlPointId,
    deleted: true as const,
  };
}

export async function getGeoreferenceTool(context: ToolContext, mapId: number) {
  const georeference = await getGeoreferenceForUser(context.userId, mapId);
  return { georeference: serializeGeoreference(georeference) };
}

export async function computeGeoreferenceTool(context: ToolContext, mapId: number) {
  const georeference = await computeGeoreferenceForUser(context.userId, mapId);
  return { georeference: serializeGeoreference(georeference) };
}

export async function pdfPixelToLonLatTool(context: ToolContext, input: PdfPixelToolInput) {
  const coordinates = await pdfPixelToLonLatForUser(context.userId, input);
  return coordinates;
}

export async function lonLatToPdfPixelTool(context: ToolContext, input: LonLatToolInput) {
  const pixel = await lonLatToPdfPixelForUser(context.userId, input);
  return pixel;
}

export async function getProjectContextTool(context: ToolContext, mapId: number) {
  const map = await getMapWorkspaceForUser(context.userId, mapId);
  if (!map) {
    throw new Error("Map not found.");
  }

  const controlPoints = await listControlPointsForUser(context.userId, mapId);
  const georeference = await getGeoreferenceForUser(context.userId, mapId);

  return {
    map: serializeMap(map),
    controlPoints: controlPoints.map(serializeControlPoint),
    georeference: serializeGeoreference(georeference),
  };
}
