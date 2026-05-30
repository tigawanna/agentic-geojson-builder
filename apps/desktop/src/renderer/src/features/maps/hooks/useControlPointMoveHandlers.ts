import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIpcMutation } from "@renderer/hooks/useIpc";
import { useControlPointsQuery } from "@renderer/features/maps/hooks/useControlPointsQuery";
import { useUndoHistory } from "@renderer/features/maps/hooks/useUndoHistory";
import { useMapWorkspaceState } from "@renderer/features/maps/store/MapWorkspaceProvider";
import type { UpdateControlPointInput } from "@shared/control-points.types";

function buildMovePayload(
  workspaceId: number,
  controlPointId: number,
  point: {
    imageX: number;
    imageY: number;
    latitude: number;
    longitude: number;
  },
  patch: Partial<Pick<UpdateControlPointInput, "imageX" | "imageY" | "latitude" | "longitude">>,
): UpdateControlPointInput {
  return {
    mapId: workspaceId,
    controlPointId,
    imageX: patch.imageX ?? point.imageX,
    imageY: patch.imageY ?? point.imageY,
    latitude: patch.latitude ?? point.latitude,
    longitude: patch.longitude ?? point.longitude,
  };
}

export function useControlPointMoveHandlers(mapId: number | null) {
  const queryClient = useQueryClient();
  const workspaceId = useMapWorkspaceState((state) => state.workspace?.id ?? null);
  const controlPointsQuery = useControlPointsQuery(mapId);
  const controlPoints = controlPointsQuery.data?.controlPoints ?? [];
  const controlPointsRef = useRef(controlPoints);
  controlPointsRef.current = controlPoints;

  const updateControlPoint = useIpcMutation("controlPoints:update", {
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["controlPoints:list", { mapId: variables.mapId }],
      });
    },
  });

  const undoHistory = useUndoHistory<UpdateControlPointInput>((entry) => {
    void updateControlPoint.mutateAsync(entry);
  });

  function commitMove(
    redoPayload: UpdateControlPointInput,
    undoPayload: UpdateControlPointInput,
    label: string,
  ) {
    undoHistory.push({ label, undo: undoPayload, redo: redoPayload });
    void updateControlPoint.mutateAsync(redoPayload);
  }

  function handleControlPointPdfMove(controlPointId: number, imageX: number, imageY: number) {
    if (workspaceId == null) {
      return;
    }

    const point = controlPointsRef.current.find((entry) => entry.id === controlPointId);
    if (!point) {
      return;
    }

    const redoPayload = buildMovePayload(workspaceId, controlPointId, point, { imageX, imageY });
    const undoPayload = buildMovePayload(workspaceId, controlPointId, point, {});

    commitMove(redoPayload, undoPayload, `Move PDF point ${controlPointId}`);
  }

  function handleControlPointMapMove(controlPointId: number, latitude: number, longitude: number) {
    if (workspaceId == null) {
      return;
    }

    const point = controlPointsRef.current.find((entry) => entry.id === controlPointId);
    if (!point) {
      return;
    }

    const redoPayload = buildMovePayload(workspaceId, controlPointId, point, {
      latitude,
      longitude,
    });
    const undoPayload = buildMovePayload(workspaceId, controlPointId, point, {});

    commitMove(redoPayload, undoPayload, `Move point ${controlPointId}`);
  }

  return { handleControlPointPdfMove, handleControlPointMapMove };
}
