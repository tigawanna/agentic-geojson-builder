import { useCallback, useEffect, useState } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";

function storeKey(mapId: number) {
  return `maps.referenceLayerHiddenFeatures.${mapId}`;
}

export function useMapReferenceLayerHiddenFeatures(mapId: number | null) {
  const [hiddenFeaturesByLayerId, setHiddenFeaturesByLayerId] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    if (mapId === null) {
      setHiddenFeaturesByLayerId({});
      return;
    }

    let cancelled = false;
    void ipcInvoke("store:get", { key: storeKey(mapId) }).then((value) => {
      if (cancelled) {
        return;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        setHiddenFeaturesByLayerId(value as Record<string, string[]>);
        return;
      }
      setHiddenFeaturesByLayerId({});
    });

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  const persistHiddenFeatures = useCallback(
    (next: Record<string, string[]>) => {
      if (mapId === null) {
        return;
      }
      void ipcInvoke("store:set", { key: storeKey(mapId), value: next });
    },
    [mapId],
  );

  const setFeatureVisible = useCallback(
    (layerId: string, featureKey: string, visible: boolean) => {
      setHiddenFeaturesByLayerId((current) => {
        const hidden = new Set(current[layerId] ?? []);
        if (visible) {
          hidden.delete(featureKey);
        } else {
          hidden.add(featureKey);
        }
        const next = {
          ...current,
          [layerId]: [...hidden],
        };
        persistHiddenFeatures(next);
        return next;
      });
    },
    [persistHiddenFeatures],
  );

  const setLayerFeaturesVisible = useCallback(
    (layerId: string, featureKeys: string[], visible: boolean) => {
      setHiddenFeaturesByLayerId((current) => {
        const next = { ...current };
        if (visible) {
          next[layerId] = [];
        } else {
          next[layerId] = [...featureKeys];
        }
        persistHiddenFeatures(next);
        return next;
      });
    },
    [persistHiddenFeatures],
  );

  const clearAllHiddenFeatures = useCallback(() => {
    setHiddenFeaturesByLayerId((current) => {
      if (Object.keys(current).length === 0) {
        return current;
      }
      persistHiddenFeatures({});
      return {};
    });
  }, [persistHiddenFeatures]);

  return {
    hiddenFeaturesByLayerId,
    setFeatureVisible,
    setLayerFeaturesVisible,
    clearAllHiddenFeatures,
  };
}
