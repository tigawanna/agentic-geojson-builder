import { queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "../query-keys";
import { computeGeoreferenceFn, getGeoreferenceFn } from "./georeference.functions";

export type {
  GeoreferencePointError,
  GeoreferenceReadyViewModel,
  GeoreferenceNotReadyViewModel,
  GeoreferenceViewModel,
} from "./georeference.types";

export const getGeoreferenceQueryOptions = (mapId: number, controlPointSignature: string | null) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.georeference, mapId, controlPointSignature],
    queryFn: () => {
      if (controlPointSignature === null) {
        return getGeoreferenceFn({ data: { mapId } });
      }
      return computeGeoreferenceFn({ data: { mapId } });
    },
    enabled: mapId > 0,
  });
