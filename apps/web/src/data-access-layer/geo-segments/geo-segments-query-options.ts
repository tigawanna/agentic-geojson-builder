import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import {
  createGeoSegmentFn,
  deleteGeoSegmentFn,
  listGeoSegmentsFn,
  updateGeoSegmentFn,
} from "./geo-segments.functions";
import type { CreateGeoSegmentInput, UpdateGeoSegmentInput } from "./geo-segments.types";

export type {
  GeoSegmentViewModel,
  GeoSegmentPathKind,
  GeoSegmentStatus,
} from "./geo-segments.types";

export const listGeoSegmentsQueryOptions = (mapId: number | null) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.geoSegments, mapId],
    queryFn: () => {
      if (mapId === null) {
        return Promise.resolve([]);
      }
      return listGeoSegmentsFn({ data: { mapId } });
    },
    enabled: mapId !== null,
  });

export const createGeoSegmentMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: CreateGeoSegmentInput) => createGeoSegmentFn({ data: input }),
    onSuccess: (segment, __, ___, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.geoSegments, segment.mapId],
      });
      toast.success("Trail segment saved");
    },
    onError: (err: unknown) => {
      toast.error("Failed to save trail segment", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const deleteGeoSegmentMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: { mapId: number; segmentId: number }) =>
      deleteGeoSegmentFn({ data: input }),
    onSuccess: (_, variables, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.geoSegments, variables.mapId],
      });
      toast.success("Trail segment removed");
    },
    onError: (err: unknown) => {
      toast.error("Failed to remove trail segment", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const updateGeoSegmentMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: UpdateGeoSegmentInput) => updateGeoSegmentFn({ data: input }),
    onSuccess: (segment, __, ___, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.geoSegments, segment.mapId],
      });
      toast.success("Trail segment updated");
    },
    onError: (err: unknown) => {
      toast.error("Failed to update trail segment", {
        description: unwrapUnknownError(err).message,
      });
    },
  });
