import { app } from "electron";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type PlaygroundLayerManifestEntry = {
  id: string;
  name: string;
  fileName: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
};

type PlaygroundLayerManifest = {
  layers: PlaygroundLayerManifestEntry[];
};

export type PlaygroundLayerFile = PlaygroundLayerManifestEntry & {
  text: string;
};

function getPlaygroundLayersRootDir() {
  return join(app.getPath("userData"), "playground-layers");
}

function getManifestPath() {
  return join(getPlaygroundLayersRootDir(), "manifest.json");
}

function getLayerFilePath(fileName: string) {
  return join(getPlaygroundLayersRootDir(), fileName);
}

async function readManifest(): Promise<PlaygroundLayerManifest> {
  try {
    const raw = await readFile(getManifestPath(), "utf8");
    const parsed = JSON.parse(raw) as PlaygroundLayerManifest;
    if (!Array.isArray(parsed.layers)) {
      return { layers: [] };
    }
    return parsed;
  } catch {
    return { layers: [] };
  }
}

async function writeManifest(manifest: PlaygroundLayerManifest) {
  const rootDir = getPlaygroundLayersRootDir();
  await mkdir(rootDir, { recursive: true });
  await writeFile(getManifestPath(), JSON.stringify(manifest, null, 2), "utf8");
}

export async function listPlaygroundLayerFiles(): Promise<PlaygroundLayerFile[]> {
  const manifest = await readManifest();
  const layers: PlaygroundLayerFile[] = [];

  for (const entry of manifest.layers) {
    try {
      const text = await readFile(getLayerFilePath(entry.fileName), "utf8");
      layers.push({ ...entry, text });
    } catch {
      continue;
    }
  }

  return layers;
}

export async function savePlaygroundLayerFile(input: {
  id: string;
  name: string;
  text: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
}): Promise<PlaygroundLayerManifestEntry> {
  const rootDir = getPlaygroundLayersRootDir();
  await mkdir(rootDir, { recursive: true });

  const fileName = `${input.id}.geojson`;
  await writeFile(getLayerFilePath(fileName), input.text, "utf8");

  const manifest = await readManifest();
  const nextEntry: PlaygroundLayerManifestEntry = {
    id: input.id,
    name: input.name,
    fileName,
    visible: input.visible,
    hiddenFeatureKeys: input.hiddenFeatureKeys,
  };

  const existingIndex = manifest.layers.findIndex((entry) => entry.id === input.id);
  if (existingIndex >= 0) {
    manifest.layers[existingIndex] = nextEntry;
  } else {
    manifest.layers.push(nextEntry);
  }

  await writeManifest(manifest);
  return nextEntry;
}

export async function updatePlaygroundLayerFile(input: {
  id: string;
  visible: boolean;
  hiddenFeatureKeys: string[];
}): Promise<PlaygroundLayerManifestEntry | null> {
  const manifest = await readManifest();
  const entry = manifest.layers.find((layer) => layer.id === input.id);
  if (!entry) {
    return null;
  }

  entry.visible = input.visible;
  entry.hiddenFeatureKeys = input.hiddenFeatureKeys;
  await writeManifest(manifest);
  return entry;
}

export async function deletePlaygroundLayerFile(id: string): Promise<boolean> {
  const manifest = await readManifest();
  const entry = manifest.layers.find((layer) => layer.id === id);
  if (!entry) {
    return false;
  }

  manifest.layers = manifest.layers.filter((layer) => layer.id !== id);
  await writeManifest(manifest);
  await rm(getLayerFilePath(entry.fileName), { force: true });
  return true;
}
