import { ipcInvoke } from "@renderer/hooks/useIpc";
import {
  parsePlaygroundGeoJsonCollection,
  parsePlaygroundGeoJsonText,
  readPlaygroundGeoJsonFile,
} from "@renderer/features/map-playground/lib/parse-playground-geojson";
import type {
  PlaygroundBaseMapStyle,
  PlaygroundFeature,
  PlaygroundLayer,
  PlaygroundSelectedFeature,
} from "@renderer/types/map-playground.types";
import { useEffect, useRef, useState } from "react";

const DEMO_GEOJSON_URL = "/demo/karura-trailfork-trails.geojson";
const DEFAULT_VIEWPORT = {
  latitude: -1.2402853,
  longitude: 36.82703,
  zoom: 15,
};

function createLayerId(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findFeature(
  layers: PlaygroundLayer[],
  selection: PlaygroundSelectedFeature | null,
): PlaygroundFeature | null {
  if (!selection) {
    return null;
  }

  const layer = layers.find((entry) => entry.id === selection.layerId);
  if (!layer) {
    return null;
  }

  return (
    layer.features.find((feature) => {
      const key = feature.properties.playgroundFeatureKey;
      return typeof key === "string" && key === selection.featureKey;
    }) ?? null
  );
}

function isGeoJsonFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".geojson") || lowerName.endsWith(".json");
}

export function useMapPlayground() {
  const [layers, setLayers] = useState<PlaygroundLayer[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<PlaygroundSelectedFeature | null>(null);
  const [baseMapStyle, setBaseMapStyle] = useState<PlaygroundBaseMapStyle>("satellite");
  const [isDragOver, setIsDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const demoAttemptedRef = useRef(false);
  const noticeTimerRef = useRef<number | undefined>(undefined);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimerRef.current !== undefined) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = undefined;
    }, 3200);
  }

  function showError(message: string) {
    setErrorNotice(message);
    window.setTimeout(() => setErrorNotice(null), 4200);
  }

  function addLayer(name: string, features: PlaygroundFeature[]) {
    const layer: PlaygroundLayer = {
      id: createLayerId(name),
      name,
      features,
      visible: true,
      hiddenFeatureKeys: [],
    };
    setLayers((current) => [...current, layer]);
    return layer;
  }

  function importCollection(
    name: string,
    collection: ReturnType<typeof parsePlaygroundGeoJsonCollection>,
  ) {
    addLayer(name, collection.features);
    return collection.features.length;
  }

  async function importNamedText(name: string, text: string) {
    const collection = parsePlaygroundGeoJsonText(text, text.length, name);
    return importCollection(name, collection);
  }

  async function importFile(file: File) {
    const collection = await readPlaygroundGeoJsonFile(file);
    return importCollection(
      file.name.replace(/\.(geojson|json)$/i, "") || "Imported layer",
      collection,
    );
  }

  async function importManyFiles(files: File[]) {
    const geoJsonFiles = files.filter(isGeoJsonFile);
    if (geoJsonFiles.length === 0) {
      throw new Error("Drop one or more .geojson or .json files.");
    }

    let trailCount = 0;
    const failures: string[] = [];

    for (const file of geoJsonFiles) {
      try {
        trailCount += await importFile(file);
      } catch (error) {
        failures.push(
          `${file.name}: ${error instanceof Error ? error.message : "Failed to import GeoJSON."}`,
        );
      }
    }

    if (trailCount === 0) {
      throw new Error(failures.join("\n") || "No GeoJSON trails were loaded.");
    }

    showNotice(
      `Loaded ${trailCount} trail(s) from ${geoJsonFiles.length - failures.length} file(s)`,
    );
    if (failures.length > 0) {
      showError(failures.join("\n"));
    }
  }

  async function importManyNamedTexts(entries: Array<{ name: string; text: string }>) {
    if (entries.length === 0) {
      return;
    }

    let trailCount = 0;
    const failures: string[] = [];

    for (const entry of entries) {
      try {
        trailCount += await importNamedText(entry.name, entry.text);
      } catch (error) {
        failures.push(
          `${entry.name}: ${error instanceof Error ? error.message : "Failed to import GeoJSON."}`,
        );
      }
    }

    if (trailCount === 0) {
      throw new Error(failures.join("\n") || "No GeoJSON trails were loaded.");
    }

    showNotice(`Loaded ${trailCount} trail(s) from ${entries.length - failures.length} file(s)`);
    if (failures.length > 0) {
      showError(failures.join("\n"));
    }
  }

  async function openFilePicker() {
    try {
      const result = await ipcInvoke("playground:pickGeoJsonFiles", undefined);
      if (result.canceled) {
        return;
      }

      await importManyNamedTexts(result.files);

      if (result.failed.length > 0) {
        showError(result.failed.map((entry) => `${entry.name}: ${entry.error}`).join("\n"));
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Failed to import GeoJSON.");
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    const files = [...event.dataTransfer.files];
    if (files.length === 0) {
      return;
    }
    void importManyFiles(files).catch((error: unknown) => {
      showError(error instanceof Error ? error.message : "Failed to import GeoJSON.");
    });
  }

  function setFeatureVisible(layerId: string, featureKey: string, visible: boolean) {
    setLayers((current) =>
      current.map((layer) => {
        if (layer.id !== layerId) {
          return layer;
        }

        const hiddenFeatureKeys = new Set(layer.hiddenFeatureKeys);
        if (visible) {
          hiddenFeatureKeys.delete(featureKey);
        } else {
          hiddenFeatureKeys.add(featureKey);
        }

        return {
          ...layer,
          hiddenFeatureKeys: [...hiddenFeatureKeys],
        };
      }),
    );

    if (
      !visible &&
      selectedFeature?.layerId === layerId &&
      selectedFeature.featureKey === featureKey
    ) {
      setSelectedFeature(null);
    }
  }

  function removeLayer(layerId: string) {
    setLayers((current) => current.filter((layer) => layer.id !== layerId));
    setSelectedFeature((current) => (current?.layerId === layerId ? null : current));
  }

  function selectFeature(layerId: string, featureKey: string) {
    setSelectedFeature({ layerId, featureKey });
  }

  function clearSelection() {
    setSelectedFeature(null);
  }

  useEffect(() => {
    if (demoAttemptedRef.current) {
      return;
    }
    demoAttemptedRef.current = true;

    let cancelled = false;

    async function loadDemo() {
      try {
        const response = await fetch(DEMO_GEOJSON_URL);
        if (!response.ok) {
          return;
        }
        const text = await response.text();
        if (cancelled) {
          return;
        }
        const trailCount = await importNamedText("Karura Trailfork trails", text);
        showNotice(`Loaded ${trailCount} demo trail(s)`);
      } catch {
        return;
      }
    }

    void loadDemo();

    return () => {
      cancelled = true;
      if (noticeTimerRef.current !== undefined) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const activeFeature = findFeature(layers, selectedFeature);

  return {
    layers,
    activeFeature,
    selectedFeature,
    baseMapStyle,
    setBaseMapStyle,
    isDragOver,
    notice,
    errorNotice,
    defaultViewport: DEFAULT_VIEWPORT,
    openFilePicker,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setFeatureVisible,
    removeLayer,
    selectFeature,
    clearSelection,
  };
}
