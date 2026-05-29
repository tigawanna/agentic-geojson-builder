import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const defaultInputDir = join(projectRoot, "map-data", "trailfork");
const defaultOutputDir = join(projectRoot, "map-data", "geojson");
const defaultPartsDirName = "parts";
const defaultCombinedName = "trails.geojson";
const defaultStashName = "pglite-stash.json";

function printUsage() {
  console.log(`Convert GPX/KML/OSM trail files into unified GeoJSON.

Usage:
  node scripts/trails-to-geojson.mjs [options]

Output layout (default):
  map-data/geojson/trails.geojson          combined FeatureCollection
  map-data/geojson/pglite-stash.json       import-ready stash for desktop app
  map-data/geojson/parts/<slug>.geojson    one file per trail

Options:
  --input <path>         Input directory with GPX/KML/OSM files (default: map-data/trailfork)
  --output <path>        Output root directory (default: map-data/geojson)
  --parts <path>         Per-trail output directory (default: <output>/parts)
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
    inputPath: defaultInputDir,
    outputDir: defaultOutputDir,
    partsDir: join(defaultOutputDir, defaultPartsDirName),
    combine: true,
    combinedName: defaultCombinedName,
    pgliteStash: true,
    stashName: defaultStashName,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--input":
        options.inputPath = resolve(argv[++index] ?? "");
        break;
      case "--output":
        options.outputDir = resolve(argv[++index] ?? "");
        options.partsDir = join(options.outputDir, defaultPartsDirName);
        break;
      case "--parts":
        options.partsDir = resolve(argv[++index] ?? "");
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
      name,
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
  const groups = discoverTrailGroups(options.inputPath);

  if (groups.length === 0) {
    throw new Error(`No GPX/KML/OSM files found at ${options.inputPath}`);
  }

  mkdirSync(options.outputDir, { recursive: true });
  mkdirSync(options.partsDir, { recursive: true });

  const combinedFeatures = [];
  const pgliteRows = [];
  const skipped = [];

  for (const group of groups) {
    const result = buildUnifiedTrail(group);

    if (result.skipped) {
      skipped.push({ slug: result.slug, reason: result.reason });
      console.warn(`Skipped ${result.slug}: ${result.reason}`);
      continue;
    }

    const outputPath = join(options.partsDir, `${result.slug}.geojson`);
    writeJson(outputPath, {
      type: "FeatureCollection",
      features: [result.feature],
    });

    combinedFeatures.push(result.feature);
    pgliteRows.push(result.pgliteRow);

    console.log(
      `Wrote ${outputPath} (${result.feature.geometry.coordinates.length} vertices, geometry=${result.feature.properties.geometrySource})`,
    );
  }

  if (options.combine) {
    const combinedPath = join(options.outputDir, options.combinedName);
    writeJson(combinedPath, {
      type: "FeatureCollection",
      features: combinedFeatures,
    });
    console.log(`Wrote ${combinedPath} (${combinedFeatures.length} feature(s))`);
  }

  if (options.pgliteStash) {
    const stashPath = join(options.outputDir, options.stashName);
    writeJson(stashPath, {
      generatedAt: new Date().toISOString(),
      trailCount: pgliteRows.length,
      trails: pgliteRows,
    });
    console.log(`Wrote ${stashPath} (${pgliteRows.length} trail row(s))`);
  }

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} trail group(s) with no geometry.`);
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
