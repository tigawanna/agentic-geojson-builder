import { useCallback, useEffect, useRef } from "react";
import type { MapWorkspaceState, UpdateMapWorkspaceInput } from "@shared/maps.types";
import {
  useMapWorkspaceActions,
  useMapWorkspaceState,
} from "@renderer/features/maps/store/MapWorkspaceProvider";
import { useUpdateMapWorkspaceMutation } from "@renderer/features/maps/hooks/useUpdateMapWorkspaceMutation";

const SAVE_DELAY_MS = 800;

export function useWorkspacePersistence() {
  const mapId = useMapWorkspaceState((state) => state.mapId);
  const { patchWorkspace } = useMapWorkspaceActions();
  const updateMutation = useUpdateMapWorkspaceMutation();
  const pendingRef = useRef<UpdateMapWorkspaceInput | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    if (!pendingRef.current) {
      return;
    }

    const payload = pendingRef.current;
    pendingRef.current = null;
    await updateMutation.mutateAsync(payload);
  }, [updateMutation]);

  const queueSave = useCallback(
    (patch: Partial<MapWorkspaceState> & Partial<Omit<UpdateMapWorkspaceInput, "mapId">>) => {
      if (!mapId) {
        return;
      }

      patchWorkspace(patch);
      pendingRef.current = {
        ...(pendingRef.current ?? { mapId }),
        ...patch,
        mapId,
      };

      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flush();
      }, SAVE_DELAY_MS);
    },
    [flush, mapId, patchWorkspace],
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, []);

  return { queueSave, flush, isSaving: updateMutation.isPending };
}
