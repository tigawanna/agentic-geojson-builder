import { keepPreviousData, mutationOptions, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeyPrefixes } from "../query-keys";
import { unwrapUnknownError } from "@/utils/errors";
import {
  createMapFn,
  deleteMapFn,
  getMapWorkspaceFn,
  listMapsFn,
  loadMapPdfFn,
  saveMapPdfFn,
  updateMapWorkspaceFn,
} from "./maps.functions";
import type { ListMapsInput, MapViewport, UpdateMapWorkspaceInput } from "./maps.types";

export type {
  ListMapsInput,
  MapBaseMapStyle,
  MapListItem,
  MapViewport,
  MapWorkspaceState,
  UpdateMapWorkspaceInput,
} from "./maps.types";

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToFile(base64: string, fileName: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: "application/pdf" });
}

export async function loadMapPdfFile(mapId: number) {
  const result = await loadMapPdfFn({ data: { mapId } });
  if (!result) {
    return null;
  }
  return base64ToFile(result.pdfBase64, result.fileName);
}

export const getMapWorkspaceQueryOptions = (mapId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.maps, mapId],
    queryFn: () => getMapWorkspaceFn({ data: { mapId } }),
  });

export const listMapsQueryOptions = (opts?: ListMapsInput) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.maps, "list", opts?.keyword, opts?.cursor, opts?.direction],
    queryFn: () => listMapsFn({ data: opts ?? {} }),
    placeholderData: keepPreviousData,
  });

export const saveMapPdfMutationOptions = () =>
  mutationOptions({
    mutationFn: async (input: { mapId: number; file: File; pageCount?: number | null }) => {
      const pdfBase64 = await fileToBase64(input.file);
      return saveMapPdfFn({
        data: {
          mapId: input.mapId,
          fileName: input.file.name,
          pdfBase64,
          pageCount: input.pageCount,
        },
      });
    },
    onSuccess: (map, __, ___, ctx) => {
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, map.id] });
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, "list"] });
      toast.success("PDF saved");
    },
    onError: (err: unknown) => {
      toast.error("Failed to save PDF", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const updateMapWorkspaceMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: UpdateMapWorkspaceInput) => updateMapWorkspaceFn({ data: input }),
    onSuccess: (map, __, ___, ctx) => {
      void ctx.client.setQueryData([queryKeyPrefixes.maps, map.id], map);
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps, "list"] });
    },
    onError: (err: unknown) => {
      toast.error("Failed to save map preferences", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const deleteMapMutationOptions = () =>
  mutationOptions({
    mutationFn: (id: number) => deleteMapFn({ data: { mapId: id } }),
    onSuccess: (_, __, ___, ctx) => {
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps] });
      toast.success("Map deleted");
    },
    onError: (err: unknown) => {
      toast.error("Failed to delete map", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

export const createMap = async (name = "Untitled map") => {
  return createMapFn({ data: { name } });
};
