import { useEffect, useState } from "react";
import { ipcInvoke } from "@renderer/hooks/useIpc";
import type { VirtualPathPreview } from "@renderer/features/maps/lib/virtual-graph-preview.types";

export function useVirtualGraphPreview(
  mapId: number,
  pathSlugs: string[],
  enabled: boolean,
): {
  previews: Map<string, VirtualPathPreview>;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [previews, setPreviews] = useState<Map<string, VirtualPathPreview>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const pathSlugsKey = pathSlugs.join("\0");

  useEffect(() => {
    if (!enabled || pathSlugs.length === 0) {
      setPreviews(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all(
      pathSlugs.map(async (pathSlug) => {
        const preview = await ipcInvoke("segments:previewBuildFromPath", {
          mapId,
          pathSlug,
          maxProjectionDistanceMeters: 40,
        });
        return {
          pathSlug,
          preview: {
            ...preview,
            edgeCount: preview.proposed.length,
          } satisfies VirtualPathPreview,
        };
      }),
    )
      .then((results) => {
        if (cancelled) {
          return;
        }
        const next = new Map<string, VirtualPathPreview>();
        for (const result of results) {
          next.set(result.pathSlug, result.preview);
        }
        setPreviews(next);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setPreviews(new Map());
        setLoading(false);
        setError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, mapId, pathSlugsKey, reloadToken]);

  return {
    previews,
    loading,
    error,
    reload: () => setReloadToken((token) => token + 1),
  };
}
