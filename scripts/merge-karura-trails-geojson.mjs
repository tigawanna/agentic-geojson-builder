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
const defaultClipToleranceMeters = 25;
const EARTH_RADIUS_METERS = 6_371_000;

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
  --clip-overlap         Trim only overlapping segments, keep unique parts (default: on)
  --no-clip-overlap      Do not trim shared segments
  --clip-tolerance <m>   Distance to treat as same path in meters (default: ${defaultClipToleranceMeters})
  --drop-duplicate-trails
                         Drop entire trails that mostly overlap another (off by default)
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
    clipOverlap: true,
    clipToleranceMeters: defaultClipToleranceMeters,
    dropDuplicateTrails: false,
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
      case "--clip-overlap":
        options.clipOverlap = true;
        break;
      case "--no-clip-overlap":
        options.clipOverlap = false;
        break;
      case "--clip-tolerance":
        options.clipToleranceMeters = Number(argv[++index] ?? defaultClipToleranceMeters);
        break;
      case "--drop-duplicate-trails":
        options.dropDuplicateTrails = true;
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

function haversineDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const latitudeDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const longitudeDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latitudeARadians = (latitudeA * Math.PI) / 180;
  const latitudeBRadians = (latitudeB * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) * Math.cos(latitudeBRadians) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

function projectPointOntoSegment(pointLat, pointLng, startLat, startLng, endLat, endLng) {
  const deltaLat = endLat - startLat;
  const deltaLng = endLng - startLng;
  const lengthSquared = deltaLat * deltaLat + deltaLng * deltaLng;
  if (lengthSquared < 1e-18) {
    return { latitude: startLat, longitude: startLng };
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointLat - startLat) * deltaLat + (pointLng - startLng) * deltaLng) / lengthSquared,
    ),
  );
  return {
    latitude: startLat + t * deltaLat,
    longitude: startLng + t * deltaLng,
  };
}

function minDistanceToLineMeters(latitude, longitude, coordinates) {
  let best = Infinity;
  for (const coordinate of coordinates) {
    if (!coordinate) {
      continue;
    }
    const distance = haversineDistanceMeters(latitude, longitude, coordinate[1], coordinate[0]);
    best = Math.min(best, distance);
  }
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    if (!start || !end) {
      continue;
    }
    const projected = projectPointOntoSegment(
      latitude,
      longitude,
      start[1],
      start[0],
      end[1],
      end[0],
    );
    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      projected.latitude,
      projected.longitude,
    );
    best = Math.min(best, distance);
  }
  return best;
}

function sampleCoordinates(coordinates, maxSamples = 100) {
  if (coordinates.length <= maxSamples) {
    return coordinates;
  }
  const sampled = [];
  for (let index = 0; index < maxSamples; index += 1) {
    const coordinate = coordinates[Math.floor((index * coordinates.length) / maxSamples)];
    if (coordinate) {
      sampled.push(coordinate);
    }
  }
  return sampled;
}

function isPointCoveredByReferences(latitude, longitude, referenceLines, toleranceMeters) {
  for (const referenceLine of referenceLines) {
    if (minDistanceToLineMeters(latitude, longitude, referenceLine) <= toleranceMeters) {
      return true;
    }
  }
  return false;
}

function splitUncoveredSegments(coordinates, referenceLines, toleranceMeters) {
  const segments = [];
  let current = [];

  for (const coordinate of coordinates) {
    if (!coordinate) {
      continue;
    }

    const covered = isPointCoveredByReferences(
      coordinate[1],
      coordinate[0],
      referenceLines,
      toleranceMeters,
    );

    if (covered) {
      if (current.length >= 2) {
        segments.push(current);
      }
      current = [];
      continue;
    }

    current.push(coordinate);
  }

  if (current.length >= 2) {
    segments.push(current);
  }

  return segments;
}

function lineCoverageOnReference(lineCoordinates, referenceCoordinates, toleranceMeters) {
  const samples = sampleCoordinates(lineCoordinates);
  if (samples.length === 0) {
    return 0;
  }
  let matched = 0;
  for (const coordinate of samples) {
    const distance = minDistanceToLineMeters(coordinate[1], coordinate[0], referenceCoordinates);
    if (distance <= toleranceMeters) {
      matched += 1;
    }
  }
  return matched / samples.length;
}

function symmetricOverlapRatio(lineA, lineB, toleranceMeters) {
  const aOnB = lineCoverageOnReference(lineA, lineB, toleranceMeters);
  const bOnA = lineCoverageOnReference(lineB, lineA, toleranceMeters);
  return (aOnB + bOnA) / 2;
}

function sourcePriority(source) {
  if (source === "trailfork") {
    return 2;
  }
  if (source === "alltrails") {
    return 1;
  }
  return 0;
}

function pickOverlapKeeper(left, right) {
  const leftPriority = sourcePriority(left.feature.properties.source);
  const rightPriority = sourcePriority(right.feature.properties.source);
  if (leftPriority !== rightPriority) {
    return leftPriority > rightPriority ? left : right;
  }
  const leftVertices = left.feature.geometry.coordinates.length;
  const rightVertices = right.feature.geometry.coordinates.length;
  return leftVertices >= rightVertices ? left : right;
}

function recordOverlapMerge(keeper, dropped, overlapRatio) {
  const mergedFrom = keeper.feature.properties.overlapMergedFrom ?? [];
  mergedFrom.push({
    slug: dropped.feature.properties.slug,
    name: dropped.feature.properties.name,
    source: dropped.feature.properties.source,
    overlapRatio: Number(overlapRatio.toFixed(3)),
  });
  keeper.feature.properties.overlapMergedFrom = mergedFrom;
  keeper.pgliteRow.properties = keeper.feature.properties;
}

function dedupeOverlappingTrails(entries, toleranceMeters, overlapThreshold) {
  const removed = new Set();
  const merges = [];

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    if (removed.has(leftIndex)) {
      continue;
    }
    const left = entries[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      if (removed.has(rightIndex)) {
        continue;
      }
      const right = entries[rightIndex];
      const overlapRatio = symmetricOverlapRatio(
        left.feature.geometry.coordinates,
        right.feature.geometry.coordinates,
        toleranceMeters,
      );
      if (overlapRatio < overlapThreshold) {
        continue;
      }
      const keeper = pickOverlapKeeper(left, right);
      const dropped = keeper === left ? right : left;
      recordOverlapMerge(keeper, dropped, overlapRatio);
      removed.add(dropped === left ? leftIndex : rightIndex);
      merges.push({
        keptSlug: keeper.feature.properties.slug,
        droppedSlug: dropped.feature.properties.slug,
        overlapRatio,
      });
    }
  }

  const kept = entries.filter((_, index) => !removed.has(index));
  return { kept, merges };
}

function cloneEntryWithGeometry(entry, slug, segmentCoordinates, partIndex, segmentCount) {
  const geometry = {
    type: "LineString",
    coordinates: segmentCoordinates,
  };
  const properties = {
    ...entry.feature.properties,
    slug,
    overlapClipped: true,
    overlapClipPartIndex: partIndex,
    overlapClipPartCount: segmentCount,
    overlapClipParentSlug:
      segmentCount > 1
        ? entry.feature.properties.slug
        : entry.feature.properties.overlapClipParentSlug,
    vertexCount: segmentCoordinates.length,
  };

  const feature = {
    type: "Feature",
    id: slug,
    properties,
    geometry,
  };

  return {
    feature,
    pgliteRow: {
      ...entry.pgliteRow,
      slug,
      name: properties.name,
      properties,
      geometry,
    },
  };
}

function applySegmentOverlapClip(entries, toleranceMeters) {
  const referenceLines = [];
  const output = [];
  const clips = [];

  const sorted = [...entries].sort((left, right) => {
    const priorityDelta =
      sourcePriority(right.feature.properties.source) -
      sourcePriority(left.feature.properties.source);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return String(left.feature.properties.slug).localeCompare(
      String(right.feature.properties.slug),
    );
  });

  for (const entry of sorted) {
    const coordinates = entry.feature.geometry.coordinates;
    const slug = entry.feature.properties.slug;
    const isCanonical = entry.feature.properties.source === "trailfork";

    if (isCanonical || referenceLines.length === 0) {
      output.push(entry);
      referenceLines.push(coordinates);
      continue;
    }

    const segments = splitUncoveredSegments(coordinates, referenceLines, toleranceMeters);
    const keptVertices = segments.reduce((sum, segment) => sum + segment.length, 0);
    const removedVertices = coordinates.length - keptVertices;

    if (segments.length === 0) {
      clips.push({
        slug,
        removedVertices: coordinates.length,
        keptVertices: 0,
        segmentsKept: 0,
      });
      continue;
    }

    if (segments.length === 1 && segments[0].length === coordinates.length) {
      output.push(entry);
      referenceLines.push(segments[0]);
      continue;
    }

    for (let partIndex = 0; partIndex < segments.length; partIndex += 1) {
      const segment = segments[partIndex];
      const partSlug = segments.length === 1 ? slug : `${slug}-part-${partIndex + 1}`;
      output.push(cloneEntryWithGeometry(entry, partSlug, segment, partIndex + 1, segments.length));
      referenceLines.push(segment);
    }

    clips.push({
      slug,
      removedVertices,
      keptVertices,
      segmentsKept: segments.length,
    });
  }

  return { output, clips };
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

  let outputEntries = combinedFeatures.map((feature, index) => ({
    feature,
    pgliteRow: pgliteRows[index],
  }));
  let dedupeMerges = [];
  let segmentClips = [];

  if (options.clipOverlap && outputEntries.length > 0) {
    const clipped = applySegmentOverlapClip(outputEntries, options.clipToleranceMeters);
    outputEntries = clipped.output;
    segmentClips = clipped.clips;
  }

  if (options.dropDuplicateTrails && outputEntries.length > 1) {
    const deduped = dedupeOverlappingTrails(outputEntries, options.clipToleranceMeters, 0.85);
    outputEntries = deduped.kept;
    dedupeMerges = deduped.merges;
  }

  const outputFeatures = outputEntries.map((entry) => entry.feature);
  const outputRows = outputEntries.map((entry) => entry.pgliteRow);

  const combinedPath = join(options.outputDir, options.combinedName);
  writeJson(combinedPath, {
    type: "FeatureCollection",
    features: outputFeatures,
  });

  console.log("");
  console.log(
    `Merged ${outputFeatures.length} trail(s) from ${combinedFeatures.length} input (${mergedBySource.trailfork} trailfork, ${mergedBySource.alltrails} alltrails)`,
  );
  if (options.clipOverlap && segmentClips.length > 0) {
    console.log(
      `Overlap clip: trimmed shared segments on ${segmentClips.length} trail(s) (tolerance ${options.clipToleranceMeters}m, trailfork kept full)`,
    );
    for (const clip of segmentClips) {
      if (clip.segmentsKept === 0) {
        console.log(`  ${clip.slug}: fully covered, omitted`);
        continue;
      }
      console.log(
        `  ${clip.slug}: removed ${clip.removedVertices} vertex/vertices, kept ${clip.keptVertices} in ${clip.segmentsKept} segment(s)`,
      );
    }
  }
  if (options.dropDuplicateTrails && dedupeMerges.length > 0) {
    console.log(`Dropped ${dedupeMerges.length} mostly-duplicate trail(s):`);
    for (const merge of dedupeMerges) {
      console.log(`  kept ${merge.keptSlug}, dropped ${merge.droppedSlug}`);
    }
  }
  console.log(`Output directory: ${relativeToProject(options.outputDir)}`);
  console.log(`  ${relativeToProject(combinedPath)}`);

  if (options.writeStash) {
    const stashPath = join(options.outputDir, options.stashName);
    writeJson(stashPath, {
      source: "karura-trails",
      generatedAt: new Date().toISOString(),
      trailCount: outputRows.length,
      trailforkCount: mergedBySource.trailfork,
      alltrailsCount: mergedBySource.alltrails,
      overlapClipCount: segmentClips.length,
      duplicateTrailsDroppedCount: dedupeMerges.length,
      trails: outputRows,
    });
    console.log(`  ${relativeToProject(stashPath)} (${outputRows.length} trail row(s))`);
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
