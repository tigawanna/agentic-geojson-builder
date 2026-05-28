import {
  mergeReferenceGeoJsonCollections,
  parseReferenceGeoJsonText,
  type ReferenceGeoJsonCollection,
} from "@repo/isomorphic/reference-geojson";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureMapDirs, getMapReferenceGeoJsonDir } from "@main/lib/pglite/map-files.service.js";
import type {
  ImportMapReferenceGeoJsonInput,
  MapReferenceGeoJsonLayer,
} from "@shared/reference-geojson.types.js";

const MANIFEST_FILE_NAME = "manifest.json";

type ManifestEntry = {
  id: string;
  name: string;
  fileName: string;
  storageFile: string;
  importedAt: string;
  visible: boolean;
  featureCount: number;
};

type ReferenceGeoJsonManifest = {
  layers: ManifestEntry[];
};

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function manifestPath(mapId: number): string {
  return join(getMapReferenceGeoJsonDir(mapId), MANIFEST_FILE_NAME);
}

async function readManifest(mapId: number): Promise<ReferenceGeoJsonManifest> {
  try {
    const raw = await readFile(manifestPath(mapId), "utf8");
    const parsed = JSON.parse(raw) as ReferenceGeoJsonManifest;
    if (!Array.isArray(parsed.layers)) {
      return { layers: [] };
    }
    return parsed;
  } catch {
    return { layers: [] };
  }
}

async function writeManifest(mapId: number, manifest: ReferenceGeoJsonManifest): Promise<void> {
  const dir = getMapReferenceGeoJsonDir(mapId);
  await mkdir(dir, { recursive: true });
  await writeFile(manifestPath(mapId), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function tagCollection(
  collection: ReferenceGeoJsonCollection,
  layerId: string,
  layerName: string,
): ReferenceGeoJsonCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        referenceLayerId: layerId,
        referenceLayerName: layerName,
      },
    })),
  };
}

async function readLayerCollection(
  mapId: number,
  entry: ManifestEntry,
): Promise<ReferenceGeoJsonCollection> {
  const raw = await readFile(join(getMapReferenceGeoJsonDir(mapId), entry.storageFile), "utf8");
  return JSON.parse(raw) as ReferenceGeoJsonCollection;
}

function toLayer(
  mapId: number,
  entry: ManifestEntry,
  collection: ReferenceGeoJsonCollection,
): MapReferenceGeoJsonLayer {
  return {
    id: entry.id,
    mapId,
    name: entry.name,
    fileName: entry.fileName,
    importedAt: entry.importedAt,
    visible: entry.visible,
    featureCount: entry.featureCount,
    collection,
  };
}

export async function listMapReferenceGeoJsonLayers(
  mapId: number,
): Promise<MapReferenceGeoJsonLayer[]> {
  const manifest = await readManifest(mapId);
  const layers: MapReferenceGeoJsonLayer[] = [];

  for (const entry of manifest.layers) {
    const collection = await readLayerCollection(mapId, entry);
    layers.push(toLayer(mapId, entry, collection));
  }

  return layers;
}

export async function importMapReferenceGeoJsonLayer(
  input: ImportMapReferenceGeoJsonInput,
): Promise<MapReferenceGeoJsonLayer> {
  await ensureMapDirs(input.mapId);
  const referenceDir = getMapReferenceGeoJsonDir(input.mapId);
  await mkdir(referenceDir, { recursive: true });

  const buffer = Buffer.from(input.fileBase64, "base64");
  if (buffer.byteLength > 12 * 1024 * 1024) {
    throw new Error("GeoJSON file must be 12 MB or smaller.");
  }

  const parsed = parseReferenceGeoJsonText(buffer.toString("utf8"), buffer.byteLength);
  const layerId = crypto.randomUUID();
  const layerName = sanitizeFileName(input.fileName).replace(/\.(geo)?json$/i, "");
  const taggedCollection = tagCollection(parsed, layerId, layerName);
  const storageFile = `${layerId}.geojson`;

  await writeFile(
    join(referenceDir, storageFile),
    `${JSON.stringify(taggedCollection, null, 2)}\n`,
    "utf8",
  );

  const entry: ManifestEntry = {
    id: layerId,
    name: layerName,
    fileName: input.fileName,
    storageFile,
    importedAt: new Date().toISOString(),
    visible: true,
    featureCount: taggedCollection.features.length,
  };

  const manifest = await readManifest(input.mapId);
  manifest.layers.unshift(entry);
  await writeManifest(input.mapId, manifest);

  return toLayer(input.mapId, entry, taggedCollection);
}

export async function deleteMapReferenceGeoJsonLayer(
  mapId: number,
  layerId: string,
): Promise<void> {
  const manifest = await readManifest(mapId);
  const entry = manifest.layers.find((layer) => layer.id === layerId);
  if (!entry) {
    return;
  }

  manifest.layers = manifest.layers.filter((layer) => layer.id !== layerId);
  await writeManifest(mapId, manifest);
  await rm(join(getMapReferenceGeoJsonDir(mapId), entry.storageFile), { force: true });
}

export async function setMapReferenceGeoJsonLayerVisibility(
  mapId: number,
  layerId: string,
  visible: boolean,
): Promise<MapReferenceGeoJsonLayer | null> {
  const manifest = await readManifest(mapId);
  const entry = manifest.layers.find((layer) => layer.id === layerId);
  if (!entry) {
    return null;
  }

  entry.visible = visible;
  await writeManifest(mapId, manifest);
  const collection = await readLayerCollection(mapId, entry);
  return toLayer(mapId, entry, collection);
}

export function mergeVisibleReferenceGeoJsonLayers(
  layers: MapReferenceGeoJsonLayer[],
): ReferenceGeoJsonCollection | null {
  const visibleCollections = layers
    .filter((layer) => layer.visible)
    .map((layer) => layer.collection);

  if (visibleCollections.length === 0) {
    return null;
  }

  return mergeReferenceGeoJsonCollections(visibleCollections);
}
