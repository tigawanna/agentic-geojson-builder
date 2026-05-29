import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import type { ReferenceLineInput } from "@shared/reference-snap.types.js";
import {
  computeAllIntersections,
  type NamedLineString,
} from "@main/lib/geojson/intersection-solver.js";
import { snapToGuides, snapTraceCoordinates } from "@main/lib/geojson/snap-engine.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function toNamedLineStrings(lines: ReferenceLineInput[]): NamedLineString[] {
  return lines.map((line) => ({
    id: line.id,
    name: line.name,
    coordinates: line.coordinates,
  }));
}

export const referenceSnapHandlers = {
  "referenceSnap:computeIntersections": ((req) => {
    const lines = toNamedLineStrings(req.lines);
    const intersections = computeAllIntersections(lines, {
      deduplicateToleranceMeters: req.deduplicateToleranceMeters,
    });

    return {
      intersectionCount: intersections.length,
      intersections: intersections.map((point) => ({
        longitude: point.longitude,
        latitude: point.latitude,
        lineA: point.lineA,
        lineB: point.lineB,
        label: point.label,
      })),
    };
  }) satisfies Handler<"referenceSnap:computeIntersections">,

  "referenceSnap:snapPoint": ((req) => {
    const guides = toNamedLineStrings(req.guides);
    const result = snapToGuides(req.latitude, req.longitude, guides, req.toleranceMeters);

    if (result.snapped) {
      return {
        snapped: true as const,
        latitude: result.target.latitude,
        longitude: result.target.longitude,
        distanceMeters: result.target.distanceMeters,
        snappedTo: result.target.snappedTo,
      };
    }

    return {
      snapped: false as const,
      latitude: req.latitude,
      longitude: req.longitude,
    };
  }) satisfies Handler<"referenceSnap:snapPoint">,

  "referenceSnap:snapTrace": ((req) => {
    const guides = toNamedLineStrings(req.guides);
    const result = snapTraceCoordinates(req.coordinates, guides, {
      snapToleranceMeters: req.toleranceMeters,
      endpointsOnly: req.endpointsOnly,
    });

    return {
      snapToleranceMeters: result.snapToleranceMeters,
      coordinates: result.coordinates,
      snappedCount: result.snappedCount,
      totalCount: req.coordinates.length,
      snapDetails: result.snapDetails.map((detail) => ({
        coordinateIndex: detail.coordinateIndex,
        longitude: detail.target.longitude,
        latitude: detail.target.latitude,
        distanceMeters: detail.target.distanceMeters,
        snappedTo: detail.target.snappedTo,
      })),
    };
  }) satisfies Handler<"referenceSnap:snapTrace">,
} satisfies Partial<{ [K in IpcChannel]: Handler<K> }>;
