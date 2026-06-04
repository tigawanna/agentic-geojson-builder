import { useCallback } from "react";
import { getElevationAtLatLng, type GeoCoordinate } from "@repo/isomorphic/elevation-at-point";
import type { ControlPointRecord } from "@shared/control-points.types";
import { ipcInvoke, useIpcMutation } from "@renderer/hooks/useIpc";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useGeoSegmentsQuery } from "@renderer/features/maps/hooks/useGeoSegmentsQuery";
import { useReferenceGeoJsonQuery } from "@renderer/features/maps/hooks/useReferenceGeoJsonQuery";

type ReferenceGuide = {
  id: string;
  name: string;
  coordinates: GeoCoordinate[];
};

export function useInheritControlPointAltitude(mapId: number) {
  const updateControlPoint = useIpcMutation("controlPoints:update");
  const controlPointsQuery = useControlPointsQuery(mapId);
  const geoSegmentsQuery = useGeoSegmentsQuery(mapId);
  const referenceGeoJsonQuery = useReferenceGeoJsonQuery(mapId);

  const inherit = useCallback(
    async (point: ControlPointRecord): Promise<ControlPointRecord> => {
      const geoSegments = geoSegmentsQuery.data?.segments ?? [];
      const layers = referenceGeoJsonQuery.data?.layers ?? [];

      const guides: ReferenceGuide[] = [];

      for (const segment of geoSegments) {
        if ((segment.geometry?.coordinates?.length ?? 0) < 2) {
          continue;
        }
        guides.push({
          id: String(segment.id),
          name: segment.name ?? segment.segmentGroupId,
          coordinates: segment.geometry.coordinates as GeoCoordinate[],
        });
      }

      for (const layer of layers) {
        if (!layer.visible || !layer.collection?.features) {
          continue;
        }
        for (const feature of layer.collection.features) {
          if ((feature.geometry?.coordinates?.length ?? 0) < 2) {
            continue;
          }
          guides.push({
            id: `ref-${layer.id}-${String(feature.properties?.name ?? "")}`,
            name: (feature.properties?.name as string) ?? layer.name,
            coordinates: feature.geometry.coordinates as GeoCoordinate[],
          });
        }
      }

      if (guides.length === 0) {
        throw new Error("No trails available to inherit altitude from.");
      }

      const result = await ipcInvoke("referenceSnap:snapPoint", {
        latitude: point.latitude,
        longitude: point.longitude,
        guides,
        toleranceMeters: 100,
      });

      if (!result.snapped) {
        throw new Error("No trail within 100 m of this point.");
      }

      const matchedGuide = guides.find((guide) => guide.id === result.snappedTo.lineId);
      const matchedSegment = geoSegments.find(
        (segment) => String(segment.id) === result.snappedTo.lineId,
      );
      const inheritedAltitudeM = matchedGuide
        ? getElevationAtLatLng(matchedGuide.coordinates, result.latitude, result.longitude)
        : null;

      const snapshot = {
        capturedAt: new Date().toISOString(),
        distanceMeters: result.distanceMeters,
        source: {
          type: (result.snappedTo.lineId.startsWith("ref-")
            ? "reference_geojson"
            : "geo_segment") as "geo_segment" | "reference_geojson",
          id: matchedSegment ? matchedSegment.id : result.snappedTo.lineId,
          name: result.snappedTo.lineName,
          pathKind: matchedSegment?.pathKind ?? null,
        },
        position: {
          latitude: result.latitude,
          longitude: result.longitude,
          altitudeM: inheritedAltitudeM,
        },
        properties: matchedSegment
          ? { pathKind: matchedSegment.pathKind, segmentGroupId: matchedSegment.segmentGroupId }
          : {},
      };

      const { controlPoint: updated } = await updateControlPoint.mutateAsync({
        mapId,
        controlPointId: point.id,
        imageX: point.imageX,
        imageY: point.imageY,
        latitude: point.latitude,
        longitude: point.longitude,
        altitudeM: inheritedAltitudeM ?? point.altitudeM,
        contextSnapshot: snapshot,
        sourceSegmentId: matchedSegment?.id ?? null,
      });

      void controlPointsQuery.refetch();
      return updated;
    },
    [
      controlPointsQuery,
      geoSegmentsQuery.data?.segments,
      mapId,
      referenceGeoJsonQuery.data?.layers,
      updateControlPoint,
    ],
  );

  return {
    inherit,
    isPending: updateControlPoint.isPending,
  };
}
