import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const defaultTrailforkDir = join(projectRoot, "map-data", "geojson", "trailfork");
const defaultAlltrailsDir = join(projectRoot, "map-data", "geojson", "alltrails");
const defaultOutputDir = join(projectRoot, "map-data", "karura-trails", "geojson");
const defaultCombinedName = "karura-trails.geojson";
const defaultStashName = "karura-trails-pglite-stash.json";

function printUsage() {
  console.log(`Merge Trailfork and AllTrails GeoJSON into one Karura trails bundle.

Usage:
  node scripts/merge-karura-trails-geojson.mjs [options]

Output layout (default):
  map-data/karura-trails/geojson/karura-trails.geojson
  map-data/karura-trails/geojson/karura-trails-pglite-stash.json

Options:
  --trailfork <path>     Trailfork per-trail GeoJSON directory
                         (default: map-data/geojson/trailfork)
  --alltrails <path>     AllTrails per-trail GeoJSON directory
                         (default: map-data/geojson/alltrails)
  --output <path>        Output directory (default: map-data/karura-trails/geojson)
  --combined-name <n>    Merged FeatureCollection file name
  --stash-name <n>       PGlite stash file name
  --no-stash             Skip pglite stash output
  -h, --help             Show this help
`);
}

function parseArgs(argv) {
  const options = {
    trailforkDir: defaultTrailforkDir,
    alltrailsDir: defaultAlltrailsDir,
    outputDir: defaultOutputDir,
    combinedName: defaultCombinedName,
    stashName: defaultStashName,
    writeStash: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--trailfork":
        options.trailforkDir = resolve(argv[++index] ?? "");
        break;
      case "--alltrails":
        options.alltrailsDir = resolve(argv[++index] ?? "");
        break;
      case "--output":
        options.outputDir = resolve(argv[++index] ?? "");
        break;
      case "--combined-name":
        options.combinedName = argv[++index] ?? defaultCombinedName;
        break;
      case "--stash-name":
        options.stashName = argv[++index] ?? defaultStashName;
        break;
      case "--no-stash":
        options.writeStash = false;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relativeToProject(absolutePath) {
  const relative = absolutePath.startsWith(`${projectRoot}/`)
    ? absolutePath.slice(projectRoot.length + 1)
    : absolutePath;
  return relative;
}

function slugFromFilename(filePath) {
  const stem = basename(filePath, extname(filePath));
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeLineGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.length >= 2 ? geometry : null;
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    const coordinates = geometry.coordinates.flat();
    if (coordinates.length < 2) {
      return null;
    }
    return { type: "LineString", coordinates };
  }

  return null;
}

function loadGeoJsonFiles(directoryPath, sourceLabel) {
  const entries = readdirSync(directoryPath)
    .filter((entry) => extname(entry).toLowerCase() === ".geojson")
    .sort((left, right) => left.localeCompare(right));

  if (entries.length === 0) {
    throw new Error(`No .geojson files found at ${directoryPath}`);
  }

  const loaded = [];

  for (const entry of entries) {
    const filePath = join(directoryPath, entry);
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));

    if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
      throw new Error(`${filePath} must be a FeatureCollection`);
    }

    for (const [featureIndex, feature] of parsed.features.entries()) {
      if (feature?.type !== "Feature") {
        throw new Error(`${filePath} feature ${featureIndex} is not a Feature`);
      }
    }

    loaded.push({ filePath, sourceLabel, features: parsed.features });
  }

  return loaded;
}

function pickLineGeometryFromFeatures(features) {
  let best = null;

  for (const [featureIndex, feature] of features.entries()) {
    const geometry = normalizeLineGeometry(feature.geometry);
    if (!geometry) {
      continue;
    }

    const vertexCount = geometry.coordinates.length;
    if (!best || vertexCount > best.vertexCount) {
      best = {
        featureIndex,
        geometry,
        vertexCount,
        properties: feature.properties ?? {},
      };
    }
  }

  return best;
}

function normalizeTrailforkFile(filePath, features) {
  const picked = pickLineGeometryFromFeatures(features);
  if (!picked) {
    return {
      skipped: true,
      slug: slugFromFilename(filePath),
      reason: "No usable LineString geometry in file",
    };
  }

  const feature = features[picked.featureIndex];
  const properties = picked.properties;
  const geometry = picked.geometry;
  const slug = readString(properties.slug) ?? readString(feature.id) ?? slugFromFilename(filePath);

  const normalizedProperties = {
    ...properties,
    slug,
    name: readString(properties.name) ?? slug,
    source: "trailfork",
    geometrySource: readString(properties.geometrySource) ?? "gpx",
  };

  const normalizedFeature = {
    type: "Feature",
    id: slug,
    properties: normalizedProperties,
    geometry,
  };

  return {
    skipped: false,
    slug,
    feature: normalizedFeature,
    pgliteRow: {
      slug,
      trailforkId: typeof properties.trailforkId === "number" ? properties.trailforkId : null,
      name: normalizedProperties.name,
      source: "trailfork",
      geometrySource: normalizedProperties.geometrySource,
      properties: normalizedProperties,
      geometry,
    },
  };
}

function normalizeAlltrailsFile(filePath, features) {
  const picked = pickLineGeometryFromFeatures(features);
  const baseSlug = slugFromFilename(filePath);
  const slug = `alltrails-${baseSlug}`;

  if (!picked) {
    return { skipped: true, slug, reason: "No usable LineString geometry in file" };
  }

  const ignoredCount = features.length - 1;
  if (ignoredCount > 0) {
    console.log(
      `Using feature ${picked.featureIndex} from ${relativeToProject(filePath)} (${picked.vertexCount} vertices, ignored ${ignoredCount} non-line feature(s))`,
    );
  }

  const properties = picked.properties;
  const geometry = picked.geometry;
  const name =
    readString(properties.name) ??
    baseSlug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const normalizedProperties = {
    slug,
    name,
    source: "alltrails",
    geometrySource: "alltrails",
    alltrails: {
      desc: readString(properties.desc),
      sourceFile: basename(filePath),
    },
  };

  const normalizedFeature = {
    type: "Feature",
    id: slug,
    properties: normalizedProperties,
    geometry,
  };

  return {
    skipped: false,
    slug,
    feature: normalizedFeature,
    pgliteRow: {
      slug,
      trailforkId: null,
      name,
      source: "alltrails",
      geometrySource: "alltrails",
      properties: normalizedProperties,
      geometry,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const trailforkEntries = loadGeoJsonFiles(options.trailforkDir, "trailfork");
  const alltrailsEntries = loadGeoJsonFiles(options.alltrailsDir, "alltrails");

  mkdirSync(options.outputDir, { recursive: true });

  const combinedFeatures = [];
  const pgliteRows = [];
  const skipped = [];
  const mergedBySource = { trailfork: 0, alltrails: 0 };
  const slugOwners = new Map();

  function registerSlug(slug, owner) {
    const existing = slugOwners.get(slug);
    if (existing) {
      throw new Error(`Duplicate slug "${slug}" from ${existing} and ${owner}`);
    }
    slugOwners.set(slug, owner);
  }

  for (const entry of trailforkEntries) {
    const result = normalizeTrailforkFile(entry.filePath, entry.features);

    if (result.skipped) {
      skipped.push({ slug: result.slug, reason: result.reason, file: entry.filePath });
      console.warn(`Skipped ${relativeToProject(entry.filePath)}: ${result.reason}`);
      continue;
    }

    registerSlug(result.slug, entry.filePath);
    combinedFeatures.push(result.feature);
    pgliteRows.push(result.pgliteRow);
    mergedBySource.trailfork += 1;
  }

  for (const entry of alltrailsEntries) {
    const result = normalizeAlltrailsFile(entry.filePath, entry.features);

    if (result.skipped) {
      skipped.push({ slug: result.slug, reason: result.reason, file: entry.filePath });
      console.warn(`Skipped ${relativeToProject(entry.filePath)}: ${result.reason}`);
      continue;
    }

    registerSlug(result.slug, entry.filePath);
    combinedFeatures.push(result.feature);
    pgliteRows.push(result.pgliteRow);
    mergedBySource.alltrails += 1;
  }

  if (combinedFeatures.length === 0) {
    throw new Error("No features to merge");
  }

  const combinedPath = join(options.outputDir, options.combinedName);
  writeJson(combinedPath, {
    type: "FeatureCollection",
    features: combinedFeatures,
  });

  console.log("");
  console.log(
    `Merged ${combinedFeatures.length} trail(s) (${mergedBySource.trailfork} trailfork, ${mergedBySource.alltrails} alltrails)`,
  );
  console.log(`Output directory: ${relativeToProject(options.outputDir)}`);
  console.log(`  ${relativeToProject(combinedPath)}`);

  if (options.writeStash) {
    const stashPath = join(options.outputDir, options.stashName);
    writeJson(stashPath, {
      source: "karura-trails",
      generatedAt: new Date().toISOString(),
      trailCount: pgliteRows.length,
      trailforkCount: mergedBySource.trailfork,
      alltrailsCount: mergedBySource.alltrails,
      trails: pgliteRows,
    });
    console.log(`  ${relativeToProject(stashPath)}`);
  }

  if (skipped.length > 0) {
    console.warn("");
    console.warn(`Skipped ${skipped.length} file(s) with no line geometry:`);
    for (const entry of skipped) {
      console.warn(`  ${relativeToProject(entry.file)} (${entry.reason})`);
    }
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  printUsage();
  process.exit(1);
}
