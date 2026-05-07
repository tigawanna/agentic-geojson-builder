import {
  mapProject,
  sourceAsset,
  geoFeature,
  controlPoint,
  georeference,
} from "@/lib/drizzle/scheam/geojson-builder-schema";
import { db } from "@/lib/drizzle/client";
import type {
  ControlPoint,
  GeoFeatureProperties,
  MapProject,
  SourceAsset,
} from "@repo/isomorphic/geojson-builder";
import type {
  GeoFeatureListItem,
  GeoreferenceListItem,
  MapProjectListItem,
  MapProjectWorkspace,
  WorkspaceFeatureCounts,
} from "./map-projects.types";
import { and, countDistinct, desc, eq } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";

export type CreateMapProjectValues = {
  name: string;
  description?: string;
  locationHint?: string;
  defaultBaseMap: MapProject["defaultBaseMap"];
};

export type UpdateMapProjectValues = CreateMapProjectValues;

export type CreateSourceAssetValues = {
  type: SourceAsset["type"];
  fileName: string;
  storageKey: string;
  pageCount?: number;
  width?: number;
  height?: number;
};

export type UpdateSourceAssetValues = {
  fileName: string;
  pageCount?: number;
  width?: number;
  height?: number;
};

export type CreateControlPointValues = {
  sourceAssetId: string;
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  residualErrorMeters?: number;
};

export type UpdateControlPointValues = {
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
  residualErrorMeters?: number;
};

export type CreateManualPointFeatureValues = {
  sourceAssetId?: string;
  name?: string;
  pathKind: GeoFeatureProperties["pathKind"];
  longitude: number;
  latitude: number;
  notes?: string;
};

export type EstimateAffineGeoreferenceValues = {
  sourceAssetId: string;
};

function toOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toMapProject(row: typeof mapProject.$inferSelect): MapProject {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description ?? undefined,
    locationHint: row.locationHint ?? undefined,
    defaultBaseMap: row.defaultBaseMap,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSourceAsset(row: typeof sourceAsset.$inferSelect): SourceAsset {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    fileName: row.fileName,
    storageKey: row.storageKey,
    pageCount: row.pageCount ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toControlPoint(row: typeof controlPoint.$inferSelect): ControlPoint {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceAssetId: row.sourceAssetId,
    imageX: row.imageX,
    imageY: row.imageY,
    longitude: row.longitude,
    latitude: row.latitude,
    residualErrorMeters: row.residualErrorMeters ?? undefined,
  };
}

function toGeoFeatureListItem(row: typeof geoFeature.$inferSelect): GeoFeatureListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceAssetId: row.sourceAssetId ?? undefined,
    agentRunId: row.agentRunId ?? undefined,
    geometry: row.geometry ?? null,
    properties: {
      id: row.properties.id,
      name: row.properties.name,
      pathKind: row.properties.pathKind,
      notes: row.properties.notes,
      confidence: row.properties.confidence,
    },
    status: row.status,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toGeoreferenceListItem(row: typeof georeference.$inferSelect): GeoreferenceListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceAssetId: row.sourceAssetId,
    method: row.method,
    transform: row.transform ?? undefined,
    residualErrorMeters: row.residualErrorMeters ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getEmptyFeatureCounts(): WorkspaceFeatureCounts {
  return {
    draft: 0,
    "needs-review": 0,
    accepted: 0,
    rejected: 0,
  };
}

export async function listMapProjectsForUser(ownerId: string): Promise<MapProjectListItem[]> {
  const rows = await db
    .select({
      project: mapProject,
      sourceAssetCount: countDistinct(sourceAsset.id),
      featureCount: countDistinct(geoFeature.id),
    })
    .from(mapProject)
    .leftJoin(sourceAsset, eq(sourceAsset.projectId, mapProject.id))
    .leftJoin(geoFeature, eq(geoFeature.projectId, mapProject.id))
    .where(eq(mapProject.ownerId, ownerId))
    .groupBy(mapProject.id)
    .orderBy(desc(mapProject.updatedAt));

  return rows.map((row) => ({
    ...toMapProject(row.project),
    sourceAssetCount: row.sourceAssetCount,
    featureCount: row.featureCount,
  }));
}

export async function createMapProjectForUser(
  ownerId: string,
  values: CreateMapProjectValues,
): Promise<MapProject> {
  const id = crypto.randomUUID();
  const inserted = await db
    .insert(mapProject)
    .values({
      id,
      ownerId,
      name: values.name.trim(),
      description: toOptionalText(values.description),
      locationHint: toOptionalText(values.locationHint),
      defaultBaseMap: values.defaultBaseMap,
    })
    .returning();

  const project = inserted[0];
  if (!project) {
    throw new Error("Failed to create map project");
  }

  return toMapProject(project);
}

export async function updateMapProjectForUser(
  ownerId: string,
  projectId: string,
  values: UpdateMapProjectValues,
): Promise<MapProject> {
  const updated = await db
    .update(mapProject)
    .set({
      name: values.name.trim(),
      description: toOptionalText(values.description),
      locationHint: toOptionalText(values.locationHint),
      defaultBaseMap: values.defaultBaseMap,
      updatedAt: new Date(),
    })
    .where(and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)))
    .returning();

  const project = updated[0];
  if (!project) {
    throw new Error("Map project not found");
  }

  return toMapProject(project);
}

export async function deleteMapProjectForUser(
  ownerId: string,
  projectId: string,
): Promise<{ id: string }> {
  const project = await db.query.mapProject.findFirst({
    where: and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)),
    columns: { id: true },
  });

  if (!project) {
    throw new Error("Map project not found");
  }

  const assets = await db
    .select({ storageKey: sourceAsset.storageKey })
    .from(sourceAsset)
    .where(eq(sourceAsset.projectId, projectId));

  await db
    .delete(mapProject)
    .where(and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)));
  await Promise.all(assets.map((asset) => removeLocalSourceAssetFile(asset.storageKey)));

  return { id: projectId };
}

export async function getMapProjectWorkspaceForUser(
  ownerId: string,
  projectId: string,
): Promise<MapProjectWorkspace | null> {
  const project = await db.query.mapProject.findFirst({
    where: and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)),
  });

  if (!project) return null;

  const [sourceAssets, controlPoints, georeferences, features] = await Promise.all([
    db
      .select()
      .from(sourceAsset)
      .where(eq(sourceAsset.projectId, projectId))
      .orderBy(desc(sourceAsset.createdAt)),
    db
      .select()
      .from(controlPoint)
      .where(eq(controlPoint.projectId, projectId))
      .orderBy(desc(controlPoint.createdAt)),
    db
      .select()
      .from(georeference)
      .where(eq(georeference.projectId, projectId))
      .orderBy(desc(georeference.updatedAt)),
    db
      .select()
      .from(geoFeature)
      .where(eq(geoFeature.projectId, projectId))
      .orderBy(desc(geoFeature.updatedAt)),
  ]);

  const featureCounts = getEmptyFeatureCounts();
  for (const feature of features) {
    featureCounts[feature.status] += 1;
  }

  return {
    project: toMapProject(project),
    sourceAssets: sourceAssets.map(toSourceAsset),
    controlPoints: controlPoints.map(toControlPoint),
    georeferences: georeferences.map(toGeoreferenceListItem),
    features: features.map(toGeoFeatureListItem),
    featureCount: features.length,
    controlPointCount: controlPoints.length,
    featureCounts,
  };
}

export async function getSourceAssetForUser(
  ownerId: string,
  projectId: string,
  sourceAssetId: string,
): Promise<SourceAsset | null> {
  const row = await db
    .select({ asset: sourceAsset })
    .from(sourceAsset)
    .innerJoin(mapProject, eq(mapProject.id, sourceAsset.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(sourceAsset.id, sourceAssetId),
      ),
    )
    .limit(1);

  const asset = row[0]?.asset;
  return asset ? toSourceAsset(asset) : null;
}

export async function createSourceAssetForUser(
  ownerId: string,
  projectId: string,
  values: CreateSourceAssetValues,
): Promise<SourceAsset> {
  const project = await db.query.mapProject.findFirst({
    where: and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)),
    columns: { id: true },
  });

  if (!project) {
    throw new Error("Map project not found");
  }

  const inserted = await db
    .insert(sourceAsset)
    .values({
      id: crypto.randomUUID(),
      projectId,
      type: values.type,
      fileName: values.fileName.trim(),
      storageKey: values.storageKey,
      pageCount: values.pageCount,
      width: values.width,
      height: values.height,
    })
    .returning();

  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const asset = inserted[0];
  if (!asset) {
    throw new Error("Failed to attach source asset");
  }

  return toSourceAsset(asset);
}

export async function updateSourceAssetForUser(
  ownerId: string,
  projectId: string,
  sourceAssetId: string,
  values: UpdateSourceAssetValues,
): Promise<SourceAsset> {
  const sourceAssetRow = await db
    .select({ asset: sourceAsset })
    .from(sourceAsset)
    .innerJoin(mapProject, eq(mapProject.id, sourceAsset.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(sourceAsset.id, sourceAssetId),
      ),
    )
    .limit(1);

  if (!sourceAssetRow[0]?.asset) {
    throw new Error("Source asset not found");
  }

  const updated = await db
    .update(sourceAsset)
    .set({
      fileName: values.fileName.trim(),
      pageCount: values.pageCount ?? null,
      width: values.width ?? null,
      height: values.height ?? null,
    })
    .where(and(eq(sourceAsset.id, sourceAssetId), eq(sourceAsset.projectId, projectId)))
    .returning();

  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const asset = updated[0];
  if (!asset) {
    throw new Error("Failed to update source asset");
  }

  return toSourceAsset(asset);
}

export async function createControlPointForUser(
  ownerId: string,
  projectId: string,
  values: CreateControlPointValues,
): Promise<ControlPoint> {
  const sourceAssetRow = await db
    .select({ asset: sourceAsset })
    .from(sourceAsset)
    .innerJoin(mapProject, eq(mapProject.id, sourceAsset.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(sourceAsset.id, values.sourceAssetId),
      ),
    )
    .limit(1);

  if (!sourceAssetRow[0]?.asset) {
    throw new Error("Source asset not found");
  }

  const inserted = await db
    .insert(controlPoint)
    .values({
      id: crypto.randomUUID(),
      projectId,
      sourceAssetId: values.sourceAssetId,
      imageX: values.imageX,
      imageY: values.imageY,
      longitude: values.longitude,
      latitude: values.latitude,
      residualErrorMeters: values.residualErrorMeters ?? null,
    })
    .returning();

  await db
    .delete(georeference)
    .where(
      and(
        eq(georeference.projectId, projectId),
        eq(georeference.sourceAssetId, values.sourceAssetId),
      ),
    );
  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const point = inserted[0];
  if (!point) {
    throw new Error("Failed to add control point");
  }

  return toControlPoint(point);
}

export async function updateControlPointForUser(
  ownerId: string,
  projectId: string,
  controlPointId: string,
  values: UpdateControlPointValues,
): Promise<ControlPoint> {
  const controlPointRow = await db
    .select({ point: controlPoint })
    .from(controlPoint)
    .innerJoin(mapProject, eq(mapProject.id, controlPoint.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(controlPoint.id, controlPointId),
      ),
    )
    .limit(1);

  const point = controlPointRow[0]?.point;
  if (!point) {
    throw new Error("Control point not found");
  }

  const updated = await db
    .update(controlPoint)
    .set({
      imageX: values.imageX,
      imageY: values.imageY,
      longitude: values.longitude,
      latitude: values.latitude,
      residualErrorMeters: values.residualErrorMeters,
    })
    .where(and(eq(controlPoint.id, controlPointId), eq(controlPoint.projectId, projectId)))
    .returning();

  await db
    .delete(georeference)
    .where(
      and(
        eq(georeference.projectId, projectId),
        eq(georeference.sourceAssetId, point.sourceAssetId),
      ),
    );
  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const updatedPoint = updated[0];
  if (!updatedPoint) {
    throw new Error("Failed to update control point");
  }

  return toControlPoint(updatedPoint);
}

export async function createManualPointFeatureForUser(
  ownerId: string,
  projectId: string,
  values: CreateManualPointFeatureValues,
): Promise<GeoFeatureListItem> {
  const project = await db.query.mapProject.findFirst({
    where: and(eq(mapProject.id, projectId), eq(mapProject.ownerId, ownerId)),
    columns: { id: true },
  });

  if (!project) {
    throw new Error("Map project not found");
  }

  if (values.sourceAssetId) {
    const asset = await db.query.sourceAsset.findFirst({
      where: and(eq(sourceAsset.id, values.sourceAssetId), eq(sourceAsset.projectId, projectId)),
      columns: { id: true },
    });

    if (!asset) {
      throw new Error("Source asset not found");
    }
  }

  const id = crypto.randomUUID();
  const properties: GeoFeatureProperties = {
    id,
    name: toOptionalText(values.name),
    pathKind: values.pathKind,
    source: "manual-trace",
    status: "draft",
    notes: toOptionalText(values.notes),
    sourceAssetId: values.sourceAssetId,
  };

  const inserted = await db
    .insert(geoFeature)
    .values({
      id,
      projectId,
      sourceAssetId: values.sourceAssetId,
      geometry: {
        type: "Point",
        coordinates: [values.longitude, values.latitude],
      },
      properties,
      status: "draft",
      source: "manual-trace",
    })
    .returning();

  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const feature = inserted[0];
  if (!feature) {
    throw new Error("Failed to create manual feature draft");
  }

  return toGeoFeatureListItem(feature);
}

export async function deleteSourceAssetForUser(
  ownerId: string,
  projectId: string,
  sourceAssetId: string,
): Promise<{ id: string }> {
  const sourceAssetRow = await db
    .select({ asset: sourceAsset })
    .from(sourceAsset)
    .innerJoin(mapProject, eq(mapProject.id, sourceAsset.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(sourceAsset.id, sourceAssetId),
      ),
    )
    .limit(1);

  const asset = sourceAssetRow[0]?.asset;
  if (!asset) {
    throw new Error("Source asset not found");
  }

  await db
    .delete(controlPoint)
    .where(
      and(eq(controlPoint.projectId, projectId), eq(controlPoint.sourceAssetId, sourceAssetId)),
    );
  await db
    .delete(georeference)
    .where(
      and(eq(georeference.projectId, projectId), eq(georeference.sourceAssetId, sourceAssetId)),
    );
  await db
    .update(geoFeature)
    .set({ sourceAssetId: null })
    .where(and(eq(geoFeature.projectId, projectId), eq(geoFeature.sourceAssetId, sourceAssetId)));
  await db
    .delete(sourceAsset)
    .where(and(eq(sourceAsset.id, sourceAssetId), eq(sourceAsset.projectId, projectId)));
  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));
  await removeLocalSourceAssetFile(asset.storageKey);

  return { id: sourceAssetId };
}

export async function deleteControlPointForUser(
  ownerId: string,
  projectId: string,
  controlPointId: string,
): Promise<{ id: string }> {
  const controlPointRow = await db
    .select({ point: controlPoint })
    .from(controlPoint)
    .innerJoin(mapProject, eq(mapProject.id, controlPoint.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(controlPoint.id, controlPointId),
      ),
    )
    .limit(1);

  const point = controlPointRow[0]?.point;
  if (!point) {
    throw new Error("Control point not found");
  }

  await db
    .delete(controlPoint)
    .where(and(eq(controlPoint.id, controlPointId), eq(controlPoint.projectId, projectId)));
  await db
    .delete(georeference)
    .where(
      and(
        eq(georeference.projectId, projectId),
        eq(georeference.sourceAssetId, point.sourceAssetId),
      ),
    );
  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  return { id: controlPointId };
}

export async function estimateAffineGeoreferenceForUser(
  ownerId: string,
  projectId: string,
  values: EstimateAffineGeoreferenceValues,
): Promise<GeoreferenceListItem> {
  const sourceAssetRow = await db
    .select({ asset: sourceAsset })
    .from(sourceAsset)
    .innerJoin(mapProject, eq(mapProject.id, sourceAsset.projectId))
    .where(
      and(
        eq(mapProject.ownerId, ownerId),
        eq(mapProject.id, projectId),
        eq(sourceAsset.id, values.sourceAssetId),
      ),
    )
    .limit(1);

  if (!sourceAssetRow[0]?.asset) {
    throw new Error("Source asset not found");
  }

  const points = await db
    .select()
    .from(controlPoint)
    .where(
      and(
        eq(controlPoint.projectId, projectId),
        eq(controlPoint.sourceAssetId, values.sourceAssetId),
      ),
    )
    .orderBy(desc(controlPoint.createdAt));

  if (points.length < 3) {
    throw new Error("At least three control points are required for an affine transform");
  }

  const transform = estimateAffineTransform(points.map(toControlPoint));
  const residualErrorMeters = estimateRmsResidualMeters(points.map(toControlPoint), transform);

  await db
    .delete(georeference)
    .where(
      and(
        eq(georeference.projectId, projectId),
        eq(georeference.sourceAssetId, values.sourceAssetId),
      ),
    );

  const inserted = await db
    .insert(georeference)
    .values({
      id: crypto.randomUUID(),
      projectId,
      sourceAssetId: values.sourceAssetId,
      method: "affine",
      transform,
      residualErrorMeters,
    })
    .returning();

  await db.update(mapProject).set({ updatedAt: new Date() }).where(eq(mapProject.id, projectId));

  const estimated = inserted[0];
  if (!estimated) {
    throw new Error("Failed to store affine georeference");
  }

  return toGeoreferenceListItem(estimated);
}

function estimateAffineTransform(points: ControlPoint[]) {
  const normalMatrix = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0));
  const normalVector = Array.from({ length: 6 }, () => 0);

  for (const point of points) {
    addNormalEquation(normalMatrix, normalVector, [point.imageX, point.imageY, 1, 0, 0, 0], point.longitude);
    addNormalEquation(normalMatrix, normalVector, [0, 0, 0, point.imageX, point.imageY, 1], point.latitude);
  }

  const coefficients = solveLinearSystem(normalMatrix, normalVector);
  return {
    pixelToLonLat: {
      longitude: [coefficients[0], coefficients[1], coefficients[2]],
      latitude: [coefficients[3], coefficients[4], coefficients[5]],
    },
    pointCount: points.length,
  } satisfies GeoreferenceListItem["transform"];
}

function addNormalEquation(
  matrix: number[][],
  vector: number[],
  row: number[],
  value: number,
) {
  for (let r = 0; r < row.length; r += 1) {
    vector[r] += row[r] * value;
    for (let c = 0; c < row.length; c += 1) {
      matrix[r][c] += row[r] * row[c];
    }
  }
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;
    for (let row = pivotIndex + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-12) {
      throw new Error("Control points are degenerate; choose points that span the source image");
    }

    [augmented[pivotIndex], augmented[maxRow]] = [augmented[maxRow], augmented[pivotIndex]];

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let column = pivotIndex; column <= size; column += 1) {
      augmented[pivotIndex][column] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotIndex) continue;
      const factor = augmented[row][pivotIndex];
      for (let column = pivotIndex; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivotIndex][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function estimateRmsResidualMeters(
  points: ControlPoint[],
  transform: NonNullable<GeoreferenceListItem["transform"]>,
) {
  const squaredErrors = points.map((point) => {
    const predicted = applyAffineTransform(point.imageX, point.imageY, transform);
    const meters = approximateDistanceMeters(point.latitude, point.longitude, predicted.latitude, predicted.longitude);
    return meters * meters;
  });
  return Math.sqrt(squaredErrors.reduce((sum, error) => sum + error, 0) / squaredErrors.length);
}

function applyAffineTransform(
  imageX: number,
  imageY: number,
  transform: NonNullable<GeoreferenceListItem["transform"]>,
) {
  const [lonX, lonY, lonOffset] = transform.pixelToLonLat.longitude;
  const [latX, latY, latOffset] = transform.pixelToLonLat.latitude;
  return {
    longitude: lonX * imageX + lonY * imageY + lonOffset,
    latitude: latX * imageX + latY * imageY + latOffset,
  };
}

function approximateDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const metersPerDegreeLatitude = 111_320;
  const meanLatitudeRadians = (((latitudeA + latitudeB) / 2) * Math.PI) / 180;
  const metersPerDegreeLongitude = metersPerDegreeLatitude * Math.cos(meanLatitudeRadians);
  const deltaX = (longitudeB - longitudeA) * metersPerDegreeLongitude;
  const deltaY = (latitudeB - latitudeA) * metersPerDegreeLatitude;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

async function removeLocalSourceAssetFile(storageKey: string) {
  const storageRoot = resolve(process.cwd(), "uploads/source-assets");
  const filePath = resolve(process.cwd(), storageKey);

  if (!filePath.startsWith(`${storageRoot}${sep}`)) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (err: unknown) {
    if (!isMissingFileError(err)) {
      throw err;
    }
  }
}

function isMissingFileError(err: unknown) {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}
