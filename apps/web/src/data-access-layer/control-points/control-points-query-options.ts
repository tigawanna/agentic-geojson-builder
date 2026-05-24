import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import {
  createControlPointFn,
  deleteControlPointFn,
  listControlPointsFn,
  updateControlPointFn,
} from "./control-points.functions";
import type {
  CreateControlPointInput,
  ControlPointViewModel,
  UpdateControlPointInput,
} from "./control-points.types";

export type {
  ControlPointViewModel,
  CreateControlPointInput,
  UpdateControlPointInput,
} from "./control-points.types";

export const listControlPointsQueryOptions = (mapId: number | null) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.controlPoints, mapId],
    queryFn: () => {
      if (mapId === null) {
        return Promise.resolve([]);
      }
      return listControlPointsFn({ data: { mapId } });
    },
    enabled: mapId !== null,
  });

export const createControlPointMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: CreateControlPointInput) => createControlPointFn({ data: input }),
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

export const deleteControlPointMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: { mapId: number; controlPointId: number }) =>
      deleteControlPointFn({ data: input }),
    onSuccess: (_, variables, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.controlPoints, variables.mapId],
      });
      toast.success("Reference point removed");
    },
    onError: (err: unknown) => {
      toast.error("Failed to remove reference point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const updateControlPointMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: UpdateControlPointInput) => updateControlPointFn({ data: input }),
    onSuccess: (point, variables, __, ctx) => {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.controlPoints, point.mapId],
      });
      if (!variables.silent) {
        toast.success("Reference point updated");
      }
    },
    onError: (err: unknown) => {
      toast.error("Failed to update reference point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });
