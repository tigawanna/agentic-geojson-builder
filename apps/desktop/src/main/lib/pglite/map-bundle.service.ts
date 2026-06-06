import { eq } from "drizzle-orm";
import type { GeoSegmentStatus } from "@shared/geo-segments.types.js";
import type {
  BuildBundleInput,
  BuildBundleResult,
  BundleLineStringFeature,
  BundlePointFeature,
  BundleValidationIssue,
  CombinedGeoJson,
  RoutingBundle,
} from "@shared/map-bundle.types.js";
import type { MapPointRecord } from "@shared/map-points.types.js";
import { ROUTING_POINT_CATEGORIES } from "@shared/map-points.types.js";
import { projectPointFractionOnLine } from "@main/lib/geojson/line-fraction.js";
import { getPgliteDb } from "@main/lib/pglite/client.js";
import { exportGeoJson } from "@main/lib/pglite/geo-segments.service.js";
import { listMapLinks } from "@main/lib/pglite/map-links.service.js";
import { listMapPoints } from "@main/lib/pglite/map-points.service.js";
import { mapTable } from "@main/lib/pglite/schema/map.schema.js";

const POINT_TO_PATH_WARNING_METERS = 25;

async function getMapName(mapId: number): Promise<string | null> {
  const db = getPgliteDb();
  const [row] = await db
    .select({ name: mapTable.name })
    .from(mapTable)
    .where(eq(mapTable.id, mapId))
    .limit(1);
  return row?.name ?? null;
}

function pointToFeature(point: MapPointRecord): BundlePointFeature {
  const coordinates =
    point.elevation !== null
      ? [point.longitude, point.latitude, point.elevation]
      : [point.longitude, point.latitude];

  const properties: BundlePointFeature["properties"] = {
    ref: point.ref,
    name: point.name,
    category: point.category,
  };
  if (point.elevation !== null) {
    properties.elevation = point.elevation;
  }
  if (point.elevationSource) {
    properties.elevationSource = point.elevationSource;
  }
  if (point.parentRef) {
    properties.parentRef = point.parentRef;
  }

  return { type: "Feature", geometry: { type: "Point", coordinates }, properties };
}

function buildPathFeatures(geojson: {
  features: Array<{ geometry: { coordinates: number[][] }; properties: Record<string, unknown> }>;
}): BundleLineStringFeature[] {
  return geojson.features.map((feature) => {
    const segmentGroupId = feature.properties.segmentGroupId;
    const featureId = feature.properties.id;
    const slug =
      typeof segmentGroupId === "string" || typeof segmentGroupId === "number"
        ? String(segmentGroupId)
        : typeof featureId === "string" || typeof featureId === "number"
          ? String(featureId)
          : "path";
    const pathKindValue = feature.properties.pathKind;
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: feature.geometry.coordinates },
      properties: {
        ...feature.properties,
        slug,
        name: (feature.properties.name as string | null) ?? null,
        pathKind: (pathKindValue as BundleLineStringFeature["properties"]["pathKind"]) ?? "unknown",
      },
    };
  });
}

function computeBbox(
  pathFeatures: BundleLineStringFeature[],
  pointFeatures: BundlePointFeature[],
): [number, number, number, number] | undefined {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let hasCoordinate = false;

  const visit = (lng: number, lat: number) => {
    hasCoordinate = true;
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  };

  for (const feature of pathFeatures) {
    for (const coordinate of feature.geometry.coordinates) {
      if (coordinate.length >= 2) {
        visit(coordinate[0] as number, coordinate[1] as number);
      }
    }
  }
  for (const feature of pointFeatures) {
    const coordinate = feature.geometry.coordinates;
    if (coordinate.length >= 2) {
      visit(coordinate[0] as number, coordinate[1] as number);
    }
  }

  return hasCoordinate ? [west, south, east, north] : undefined;
}

function validateBundle(
  points: MapPointRecord[],
  pathFeatures: BundleLineStringFeature[],
  links: Array<{ id: number; fromRef: string; toRef: string; pathSlug: string }>,
): BundleValidationIssue[] {
  const issues: BundleValidationIssue[] = [];

  const refCounts = new Map<string, number>();
  for (const point of points) {
    if (point.ref) {
      refCounts.set(point.ref, (refCounts.get(point.ref) ?? 0) + 1);
    }
  }
  for (const [ref, count] of refCounts) {
    if (count > 1) {
      issues.push({
        code: "duplicate_ref",
        severity: "error",
        message: `Ref "${ref}" is used by ${count} points. Each ref must be unique.`,
        ref,
      });
    }
  }

  for (const point of points) {
    if (ROUTING_POINT_CATEGORIES.includes(point.category) && !point.ref) {
      issues.push({
        code: "missing_ref_routing_point",
        severity: "error",
        message: `${point.category} point #${point.id} has no ref. Decision nodes must have a ref.`,
        pointId: point.id,
      });
    }
  }

  const pathSlugs = new Set(pathFeatures.map((feature) => feature.properties.slug));
  const knownRefs = new Set(
    points.filter((point) => point.ref).map((point) => point.ref as string),
  );

  const linkRefCounts = new Map<string, number>();
  for (const link of links) {
    linkRefCounts.set(link.fromRef, (linkRefCounts.get(link.fromRef) ?? 0) + 1);
    linkRefCounts.set(link.toRef, (linkRefCounts.get(link.toRef) ?? 0) + 1);

    for (const ref of [link.fromRef, link.toRef]) {
      if (!knownRefs.has(ref)) {
        issues.push({
          code: "dangling_link_ref",
          severity: "error",
          message: `Link references "${ref}" but no point with that ref exists.`,
          ref,
          linkId: link.id,
        });
      }
    }

    if (!pathSlugs.has(link.pathSlug)) {
      issues.push({
        code: "link_unknown_path",
        severity: "warning",
        message: `Link ${link.fromRef}→${link.toRef} points at path "${link.pathSlug}" which is not exported.`,
        linkId: link.id,
      });
    }
  }

  for (const point of points) {
    if (point.ref && ROUTING_POINT_CATEGORIES.includes(point.category)) {
      const count = linkRefCounts.get(point.ref) ?? 0;
      if (count < 2) {
        issues.push({
          code: "junction_single_link",
          severity: "warning",
          message: `${point.category} "${point.ref}" has ${count} link(s); decision nodes usually connect to two or more.`,
          ref: point.ref,
          pointId: point.id,
        });
      }
    }
  }

  if (pathFeatures.length > 0) {
    for (const point of points) {
      let nearest = Number.POSITIVE_INFINITY;
      for (const feature of pathFeatures) {
        const projection = projectPointFractionOnLine(
          point.longitude,
          point.latitude,
          feature.geometry.coordinates as [number, number][],
        );
        if (projection && projection.distanceMeters < nearest) {
          nearest = projection.distanceMeters;
        }
      }
      if (nearest > POINT_TO_PATH_WARNING_METERS && Number.isFinite(nearest)) {
        issues.push({
          code: "point_far_from_path",
          severity: "warning",
          message: `Point ${point.ref ?? `#${point.id}`} is ${Math.round(nearest)}m from the nearest path.`,
          ref: point.ref,
          pointId: point.id,
        });
      }
    }
  }

  return issues;
}

export async function buildBundle(input: BuildBundleInput): Promise<BuildBundleResult> {
  const includePaths = input.includePaths ?? true;
  const includePoints = input.includePoints ?? true;
  const includeLinks = input.includeLinks ?? true;
  const pathStatuses: GeoSegmentStatus[] = input.pathStatuses ?? [
    "draft",
    "needs-review",
    "accepted",
  ];

  const pathFeatures = includePaths
    ? buildPathFeatures(
        (
          await exportGeoJson({
            mapId: input.mapId,
            mergeGroups: input.mergePathGroups ?? true,
            statuses: pathStatuses,
          })
        ).geojson,
      )
    : [];

  const allPoints = await listMapPoints(input.mapId);
  const filteredPoints =
    includePoints && input.pointCategories
      ? allPoints.filter((point) => input.pointCategories?.includes(point.category))
      : includePoints
        ? allPoints
        : [];
  const pointFeatures = filteredPoints.map(pointToFeature);

  const links = includeLinks ? await listMapLinks(input.mapId) : [];
  const bundleLinks = links.map((link) => ({
    fromRef: link.fromRef,
    toRef: link.toRef,
    pathSlug: link.pathSlug,
    ...(link.startFraction !== null ? { startFraction: link.startFraction } : {}),
    ...(link.endFraction !== null ? { endFraction: link.endFraction } : {}),
    bidirectional: link.bidirectional,
  }));

  const fractionsProvided =
    bundleLinks.length > 0 &&
    links.every((link) => link.startFraction !== null && link.endFraction !== null);

  const bbox = computeBbox(pathFeatures, pointFeatures);

  const bundle: RoutingBundle = {
    version: 2,
    generatedAt: new Date().toISOString(),
    mapId: input.mapId,
    mapName: await getMapName(input.mapId),
    ...(bbox ? { bbox } : {}),
    fractionsProvided,
    paths: { type: "FeatureCollection", features: pathFeatures },
    points: { type: "FeatureCollection", features: pointFeatures },
    links: bundleLinks,
  };

  const combined: CombinedGeoJson = {
    type: "FeatureCollection",
    features: [...pathFeatures, ...pointFeatures],
  };

  const issues = validateBundle(
    filteredPoints,
    pathFeatures,
    links.map((link) => ({
      id: link.id,
      fromRef: link.fromRef,
      toRef: link.toRef,
      pathSlug: link.pathSlug,
    })),
  );

  return {
    bundle,
    combined,
    validation: {
      issues,
      errorCount: issues.filter((issue) => issue.severity === "error").length,
      warningCount: issues.filter((issue) => issue.severity === "warning").length,
    },
  };
}
