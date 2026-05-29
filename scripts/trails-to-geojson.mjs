import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const defaultTrailforkDir = join(projectRoot, "map-data", "trailfork");
const defaultAlltrailsDir = join(projectRoot, "map-data", "alltrails");
const defaultOutputDir = join(projectRoot, "map-data", "geojson");
const defaultTrailforkOutName = "trailfork";
const defaultAlltrailsOutName = "alltrails";
const defaultCombinedName = "trails.geojson";
const defaultStashName = "pglite-stash.json";

function relativeToProject(absolutePath) {
  const relative = absolutePath.startsWith(`${projectRoot}/`)
    ? absolutePath.slice(projectRoot.length + 1)
    : absolutePath;
  return relative;
}

function formatGroupSources(group) {
  const parts = [];
  if (group.gpxPath) {
    parts.push("gpx");
  }
  if (group.kmlPath) {
    parts.push("kml");
  }
  if (group.osmPath) {
    parts.push("osm");
  }
  return parts.join("+") || "none";
}

function countInputFormats(groups) {
  let gpx = 0;
  let kml = 0;
  let osm = 0;

  for (const group of groups) {
    if (group.gpxPath) {
      gpx += 1;
    }
    if (group.kmlPath) {
      kml += 1;
    }
    if (group.osmPath) {
      osm += 1;
    }
  }

  return { gpx, kml, osm };
}

function printRunConfig(options, trailforkGroups, alltrailsFiles) {
  const counts = countInputFormats(trailforkGroups);

  console.log("");
  console.log("Configuration");
  console.log(`  Output:  ${relativeToProject(options.outputDir)}`);
  console.log(`  Combine: ${options.combine ? options.combinedName : "off"}`);
  console.log(`  Stash:   ${options.pgliteStash ? options.stashName : "off"}`);

  if (options.trailfork) {
    console.log("");
    console.log(`Trailfork input: ${relativeToProject(options.trailforkDir)}`);
    console.log(`  → ${relativeToProject(options.trailforkOutDir)}/`);
    console.log(
      `  ${trailforkGroups.length} trail group(s) (${counts.gpx} gpx, ${counts.kml} kml, ${counts.osm} osm)`,
    );

    for (const group of trailforkGroups) {
      console.log(`    ${group.slug} [${formatGroupSources(group)}]`);
    }
  }

  if (options.alltrails) {
    console.log("");
    console.log(`AllTrails input: ${relativeToProject(options.alltrailsDir)}`);
    console.log(`  → ${relativeToProject(options.alltrailsOutDir)}/`);
    console.log(`  ${alltrailsFiles.length} GeoJSON file(s)`);

    for (const entry of alltrailsFiles) {
      console.log(`    ${basename(entry.filePath)}`);
    }
  }
}

function printSummary(options, converted, skipped, convertedByProvider) {
  console.log("");
  console.log(
    `Converted ${converted.length} trail(s) (${convertedByProvider.trailfork} trailfork, ${convertedByProvider.alltrails} alltrails)`,
  );

  for (const entry of converted) {
    console.log(
      `  [${entry.provider}] ${entry.slug} (${entry.name}): ${entry.vertexCount} vertices, geometry=${entry.geometrySource}, sources=[${entry.sources}]`,
    );
    console.log(`    → ${relativeToProject(entry.outputPath)}`);
  }

  console.log("");
  console.log(`Output directory: ${relativeToProject(options.outputDir)}`);

  if (options.trailfork && convertedByProvider.trailfork > 0) {
    console.log(
      `  ${relativeToProject(options.trailforkOutDir)}/ (${convertedByProvider.trailfork} file(s))`,
    );
  }

  if (options.alltrails && convertedByProvider.alltrails > 0) {
    console.log(
      `  ${relativeToProject(options.alltrailsOutDir)}/ (${convertedByProvider.alltrails} file(s))`,
    );
  }

  if (options.combine) {
    const combinedPath = join(options.outputDir, options.combinedName);
    console.log(`  ${relativeToProject(combinedPath)} (${converted.length} feature(s))`);
  }

  if (options.pgliteStash) {
    const stashPath = join(options.outputDir, options.stashName);
    console.log(`  ${relativeToProject(stashPath)} (${converted.length} trail row(s))`);
  }

  if (skipped.length > 0) {
    console.warn("");
    console.warn(`Skipped ${skipped.length} input(s) with no usable geometry:`);

    for (const entry of skipped) {
      console.warn(`  [${entry.provider}] ${entry.slug} [${entry.sources}]: ${entry.reason}`);
    }
  }
}

function printUsage() {
  console.log(`Convert Trailfork GPX/KML/OSM and AllTrails GeoJSON into unified per-trail GeoJSON.

Usage:
  node scripts/trails-to-geojson.mjs [options]

Output layout (default):
  map-data/geojson/trailfork/<slug>.geojson   Trailfork per-trail FeatureCollection
  map-data/geojson/alltrails/<slug>.geojson   AllTrails per-trail FeatureCollection
  map-data/geojson/trails.geojson             combined FeatureCollection
  map-data/geojson/pglite-stash.json          import-ready stash for desktop app

Options:
  --trailfork <path>     Trailfork GPX/KML/OSM directory (default: map-data/trailfork)
  --alltrails <path>     AllTrails GeoJSON directory (default: map-data/alltrails)
  --input <path>         Alias for --trailfork
  --no-trailfork         Skip Trailfork input
  --no-alltrails         Skip AllTrails input
  --output <path>        Output root directory (default: map-data/geojson)
  --combine              Write merged FeatureCollection (default: on)
  --no-combine           Skip merged FeatureCollection
  --combined-name <n>    Merged file name (default: trails.geojson)
  --pglite-stash         Write pglite-stash.json for desktop import (default: on)
  --no-pglite-stash      Skip pglite stash output
  --stash-name <n>       Stash file name (default: pglite-stash.json)
  -h, --help             Show this help
`);
}

function parseArgs(argv) {
  const options = {
    trailfork: true,
    alltrails: true,
    trailforkDir: defaultTrailforkDir,
    alltrailsDir: defaultAlltrailsDir,
    outputDir: defaultOutputDir,
    trailforkOutDir: join(defaultOutputDir, defaultTrailforkOutName),
    alltrailsOutDir: join(defaultOutputDir, defaultAlltrailsOutName),
    combine: true,
    combinedName: defaultCombinedName,
    pgliteStash: true,
    stashName: defaultStashName,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--trailfork":
      case "--input":
        options.trailforkDir = resolve(argv[++index] ?? "");
        options.trailfork = true;
        break;
      case "--alltrails":
        options.alltrailsDir = resolve(argv[++index] ?? "");
        options.alltrails = true;
        break;
      case "--no-trailfork":
        options.trailfork = false;
        break;
      case "--no-alltrails":
        options.alltrails = false;
        break;
      case "--output":
        options.outputDir = resolve(argv[++index] ?? "");
        options.trailforkOutDir = join(options.outputDir, defaultTrailforkOutName);
        options.alltrailsOutDir = join(options.outputDir, defaultAlltrailsOutName);
        break;
      case "--combine":
        options.combine = true;
        break;
      case "--no-combine":
        options.combine = false;
        break;
      case "--combined-name":
        options.combinedName = argv[++index] ?? defaultCombinedName;
        break;
      case "--pglite-stash":
        options.pgliteStash = true;
        break;
      case "--no-pglite-stash":
        options.pgliteStash = false;
        break;
      case "--stash-name":
        options.stashName = argv[++index] ?? defaultStashName;
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

function decodeXmlText(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function firstTagText(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlText(match[1]) : null;
}

function firstTagAttribute(block, tagName, attributeName) {
  const tagMatch = block.match(new RegExp(`<${tagName}\\b([^>]*)>`, "i"));
  if (!tagMatch) {
    return null;
  }

  const attributeMatch = tagMatch[1].match(new RegExp(`${attributeName}\\s*=\\s*"(.*?)"`, "i"));
  return attributeMatch ? decodeXmlText(attributeMatch[1]) : null;
}

function readCoordinateAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, "i"));
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function toLineCoordinates(points) {
  return points.map((point) => {
    if (Number.isFinite(point.elevation)) {
      return [point.longitude, point.latitude, point.elevation];
    }
    return [point.longitude, point.latitude];
  });
}

function parseGpxTrack(xml, sourceFile) {
  const trackBlocks = [...xml.matchAll(/<trk\b[\s\S]*?<\/trk>/gi)].map((entry) => entry[0]);
  if (trackBlocks.length === 0) {
    return null;
  }

  const trackBlock = trackBlocks[0];
  const points = [];
  const pointPattern = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
  let match = pointPattern.exec(trackBlock);

  while (match) {
    const attributes = match[1];
    const body = match[2];
    const latitude = readCoordinateAttribute(attributes, "lat");
    const longitude = readCoordinateAttribute(attributes, "lon");
    const eleMatch = body.match(/<ele>([\s\S]*?)<\/ele>/i);
    const elevation = eleMatch ? Number(eleMatch[1].trim()) : null;

    if (latitude !== null && longitude !== null) {
      points.push({
        latitude,
        longitude,
        elevation: Number.isFinite(elevation) ? elevation : null,
      });
    }

    match = pointPattern.exec(trackBlock);
  }

  if (points.length < 2) {
    return null;
  }

  return {
    file: basename(sourceFile),
    name: firstTagText(trackBlock, "name"),
    vertexCount: points.length,
    coordinates: toLineCoordinates(points),
  };
}

function parseKmlCoordinates(rawValue) {
  const points = rawValue
    .trim()
    .split(/\s+/)
    .map((entry) => entry.split(",").map((part) => Number(part.trim())))
    .filter((parts) => parts.length >= 2 && parts.every((value) => Number.isFinite(value)));

  if (points.length < 2) {
    return null;
  }

  return {
    vertexCount: points.length,
    coordinates: points.map((parts) => {
      if (parts.length >= 3 && Number.isFinite(parts[2])) {
        return [parts[0], parts[1], parts[2]];
      }
      return [parts[0], parts[1]];
    }),
  };
}

function parseKmlTrail(xml, sourceFile) {
  const placemarkBlock = xml.match(/<Placemark\b[\s\S]*?<\/Placemark>/i)?.[0];
  if (!placemarkBlock) {
    return null;
  }

  const coordinatesBlock = placemarkBlock.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1];
  if (!coordinatesBlock) {
    return null;
  }

  const geometry = parseKmlCoordinates(coordinatesBlock);
  if (!geometry) {
    return null;
  }

  return {
    file: basename(sourceFile),
    name: firstTagText(placemarkBlock, "name"),
    vertexCount: geometry.vertexCount,
    coordinates: geometry.coordinates,
  };
}

function parseOsmTrail(xml, sourceFile) {
  const nodePattern = /<node\b([^>]*)\/?>/gi;
  const nodes = new Map();
  let nodeMatch = nodePattern.exec(xml);

  while (nodeMatch) {
    const attributes = nodeMatch[1];
    const idMatch = attributes.match(/\bid\s*=\s*"([^"]+)"/i);
    const latitude = readCoordinateAttribute(attributes, "lat");
    const longitude = readCoordinateAttribute(attributes, "lon");

    if (idMatch && latitude !== null && longitude !== null) {
      nodes.set(idMatch[1], { latitude, longitude });
    }

    nodeMatch = nodePattern.exec(xml);
  }

  const wayBlock = xml.match(/<way\b[\s\S]*?<\/way>/i)?.[0];
  if (!wayBlock) {
    return null;
  }

  const tags = {};
  const tagPattern = /<tag\b([^>]*)\/?>/gi;
  let tagMatch = tagPattern.exec(wayBlock);

  while (tagMatch) {
    const key = firstTagAttribute(tagMatch[0], "tag", "k");
    const value = firstTagAttribute(tagMatch[0], "tag", "v");
    if (key) {
      tags[key] = value ?? "";
    }
    tagMatch = tagPattern.exec(wayBlock);
  }

  const points = [];
  const nodeRefPattern = /<nd\b[^>]*ref\s*=\s*"([^"]+)"[^>]*\/?>/gi;
  let nodeRefMatch = nodeRefPattern.exec(wayBlock);

  while (nodeRefMatch) {
    const node = nodes.get(nodeRefMatch[1]);
    if (node) {
      points.push(node);
    }
    nodeRefMatch = nodeRefPattern.exec(wayBlock);
  }

  if (points.length < 2) {
    return null;
  }

  return {
    file: basename(sourceFile),
    name: tags.name ?? null,
    vertexCount: points.length,
    coordinates: toLineCoordinates(points),
  };
}

function discoverTrailGroups(inputPath) {
  const groups = new Map();

  for (const entry of readdirSync(inputPath)) {
    const extension = extname(entry).toLowerCase();
    if (![".gpx", ".kml", ".osm"].includes(extension)) {
      continue;
    }

    const slug = basename(entry, extension);
    const current = groups.get(slug) ?? { slug, gpxPath: null, kmlPath: null, osmPath: null };
    const fullPath = join(inputPath, entry);

    if (extension === ".gpx") {
      current.gpxPath = fullPath;
    } else if (extension === ".kml") {
      current.kmlPath = fullPath;
    } else {
      current.osmPath = fullPath;
    }

    groups.set(slug, current);
  }

  return [...groups.values()].sort((left, right) => left.slug.localeCompare(right.slug));
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

function discoverAlltrailsFiles(inputPath) {
  if (!existsSync(inputPath)) {
    return [];
  }

  return readdirSync(inputPath)
    .filter((entry) => extname(entry).toLowerCase() === ".geojson")
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => ({
      filePath: join(inputPath, entry),
    }));
}

function loadAlltrailsFeatures(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));

  if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error(`${filePath} must be a FeatureCollection`);
  }

  for (const [featureIndex, feature] of parsed.features.entries()) {
    if (feature?.type !== "Feature") {
      throw new Error(`${filePath} feature ${featureIndex} is not a Feature`);
    }
  }

  return parsed.features;
}

function buildAlltrailsTrail(filePath, features) {
  const picked = pickLineGeometryFromFeatures(features);
  const baseSlug = slugFromFilename(filePath);
  const slug = `alltrails-${baseSlug}`;

  if (!picked) {
    return {
      slug,
      skipped: true,
      reason: "No usable LineString geometry in file",
    };
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
    vertexCount: geometry.coordinates.length,
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
    slug,
    skipped: false,
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

function pickPrimaryGeometry(sources) {
  if (sources.gpx?.coordinates?.length >= 2) {
    return { from: "gpx", coordinates: sources.gpx.coordinates };
  }
  if (sources.kml?.coordinates?.length >= 2) {
    return { from: "kml", coordinates: sources.kml.coordinates };
  }
  if (sources.osm?.coordinates?.length >= 2) {
    return { from: "osm", coordinates: sources.osm.coordinates };
  }
  return null;
}

function buildUnifiedTrail(group) {
  const sources = {};

  if (group.gpxPath) {
    sources.gpx = parseGpxTrack(readFileSync(group.gpxPath, "utf8"), group.gpxPath);
  }
  if (group.kmlPath) {
    sources.kml = parseKmlTrail(readFileSync(group.kmlPath, "utf8"), group.kmlPath);
  }
  if (group.osmPath) {
    sources.osm = parseOsmTrail(readFileSync(group.osmPath, "utf8"), group.osmPath);
  }

  const geometry = pickPrimaryGeometry(sources);
  if (!geometry) {
    return {
      slug: group.slug,
      skipped: true,
      reason: "No usable geometry in GPX/KML/OSM",
    };
  }

  const name =
    sources.kml?.name ??
    sources.gpx?.name ??
    sources.osm?.name ??
    group.slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const geometryJson = {
    type: "LineString",
    coordinates: geometry.coordinates,
  };

  const feature = {
    type: "Feature",
    id: group.slug,
    properties: {
      slug: group.slug,
      name,
      source: "trailfork",
      geometrySource: geometry.from,
      vertexCount: geometry.coordinates.length,
    },
    geometry: geometryJson,
  };

  return {
    slug: group.slug,
    skipped: false,
    feature,
    pgliteRow: {
      slug: group.slug,
      trailforkId: null,
      name,
      source: "trailfork",
      geometrySource: geometry.from,
      properties: feature.properties,
      geometry: geometryJson,
    },
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const trailforkGroups = options.trailfork ? discoverTrailGroups(options.trailforkDir) : [];
  const alltrailsFiles = options.alltrails ? discoverAlltrailsFiles(options.alltrailsDir) : [];

  if (trailforkGroups.length === 0 && alltrailsFiles.length === 0) {
    throw new Error("No Trailfork GPX/KML/OSM groups or AllTrails GeoJSON files found");
  }

  mkdirSync(options.outputDir, { recursive: true });

  if (options.trailfork) {
    mkdirSync(options.trailforkOutDir, { recursive: true });
  }

  if (options.alltrails) {
    mkdirSync(options.alltrailsOutDir, { recursive: true });
  }

  printRunConfig(options, trailforkGroups, alltrailsFiles);

  const combinedFeatures = [];
  const pgliteRows = [];
  const converted = [];
  const skipped = [];
  const convertedByProvider = { trailfork: 0, alltrails: 0 };
  const slugOwners = new Map();

  function registerSlug(slug, owner) {
    const existing = slugOwners.get(slug);
    if (existing) {
      throw new Error(`Duplicate slug "${slug}" from ${existing} and ${owner}`);
    }
    slugOwners.set(slug, owner);
  }

  for (const group of trailforkGroups) {
    const sources = formatGroupSources(group);
    const result = buildUnifiedTrail(group);

    if (result.skipped) {
      skipped.push({
        provider: "trailfork",
        slug: result.slug,
        sources,
        reason: result.reason,
      });
      continue;
    }

    registerSlug(result.slug, `trailfork:${group.slug}`);
    const outputPath = join(options.trailforkOutDir, `${result.slug}.geojson`);
    writeJson(outputPath, {
      type: "FeatureCollection",
      features: [result.feature],
    });

    combinedFeatures.push(result.feature);
    pgliteRows.push(result.pgliteRow);
    convertedByProvider.trailfork += 1;
    converted.push({
      provider: "trailfork",
      slug: result.slug,
      name: result.feature.properties.name,
      sources,
      geometrySource: result.feature.properties.geometrySource,
      vertexCount: result.feature.geometry.coordinates.length,
      outputPath,
    });
  }

  for (const entry of alltrailsFiles) {
    const features = loadAlltrailsFeatures(entry.filePath);
    const result = buildAlltrailsTrail(entry.filePath, features);
    const sources = "geojson";

    if (result.skipped) {
      skipped.push({
        provider: "alltrails",
        slug: result.slug,
        sources,
        reason: result.reason,
      });
      continue;
    }

    registerSlug(result.slug, entry.filePath);
    const outputPath = join(options.alltrailsOutDir, `${result.slug}.geojson`);
    writeJson(outputPath, {
      type: "FeatureCollection",
      features: [result.feature],
    });

    combinedFeatures.push(result.feature);
    pgliteRows.push(result.pgliteRow);
    convertedByProvider.alltrails += 1;
    converted.push({
      provider: "alltrails",
      slug: result.slug,
      name: result.feature.properties.name,
      sources,
      geometrySource: result.feature.properties.geometrySource,
      vertexCount: result.feature.geometry.coordinates.length,
      outputPath,
    });
  }

  if (options.combine) {
    const combinedPath = join(options.outputDir, options.combinedName);
    writeJson(combinedPath, {
      type: "FeatureCollection",
      features: combinedFeatures,
    });
  }

  if (options.pgliteStash) {
    const stashPath = join(options.outputDir, options.stashName);
    writeJson(stashPath, {
      generatedAt: new Date().toISOString(),
      trailCount: pgliteRows.length,
      trailforkCount: convertedByProvider.trailfork,
      alltrailsCount: convertedByProvider.alltrails,
      trails: pgliteRows,
    });
  }

  printSummary(options, converted, skipped, convertedByProvider);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  printUsage();
  process.exit(1);
}
