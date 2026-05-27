import { useTranslation } from "react-i18next";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { CreateMapProjectModal } from "../features/maps/components/CreateMapProjectModal";
import { DeleteMapConfirmModal } from "../features/maps/components/DeleteMapConfirmModal";
import { useDeleteMapMutation } from "../features/maps/hooks/useDeleteMapMutation";
import { useMapDeleteRequestStore } from "../features/maps/store/map-delete-request-store";
import { useAppMenuActions } from "../hooks/useAppMenuActions";

export function AppMenuBridge() {
  useAppMenuActions();

  const navigate = useNavigate();
  const activeMapId = useRouterState({
    select: (state) => {
      const match = state.location.pathname.match(/^\/maps\/(\d+)/);
      return match ? Number(match[1]) : null;
    },
  });
  const pending = useMapDeleteRequestStore((state) => state.pending);
  const clearPending = useMapDeleteRequestStore((state) => state.clear);
  const deleteMap = useDeleteMapMutation();

  async function confirmDelete() {
    if (!pending) {
      return;
    }

    const deletedMapId = pending.id;

    try {
      await deleteMap.mutateAsync({ mapId: deletedMapId });
      clearPending();
      if (activeMapId === deletedMapId) {
        void navigate({ to: "/maps" });
      }
    } catch {
      clearPending();
    }
  }

  return (
    <>
      <CreateMapProjectModal />
      <DeleteMapConfirmModal
        map={
          pending
            ? {
                id: pending.id,
                name: pending.name,
                description: null,
                locationQuery: null,
                updatedAt: "",
                hasThumbnail: false,
              }
            : null
        }
        isDeleting={deleteMap.isPending}
        onCancel={clearPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
