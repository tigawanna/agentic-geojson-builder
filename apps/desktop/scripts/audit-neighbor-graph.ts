import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import {
  auditNeighborGraph,
  formatNeighborGraphAuditReport,
} from "../src/shared/neighbor-graph-audit.js";
import type { MapPointRecord } from "../src/shared/map-points.types.js";
import type { MarkerNeighborRecord } from "../src/shared/marker-neighbors.types.js";

function defaultDataDir() {
  return (
    process.env.DESKTOP_PGLITE_DIR ??
    join(homedir(), ".config", "agentic-geojson-builder", "pglite")
  );
}

function printUsage() {
  console.log(`Audit marker neighbor graph for broken links and dead ends.

Usage:
  pnpm --filter desktop db:audit-neighbor-graph -- [options]

Options:
  --map-id <n>                 Map id (required)
  --data-dir <path>            Desktop PGlite directory
                               (default: ~/.config/agentic-geojson-builder/pglite)
  --long-jump-m <n>            Long jump threshold in meters (default: 150)
  --from-ref <ref>             Optional path trace start ref
  --to-ref <ref>               Optional path trace end ref
  --json                       Output JSON instead of text report
  --help                       Show this help

Examples:
  pnpm --filter desktop db:audit-neighbor-graph -- --map-id 4
  pnpm --filter desktop db:audit-neighbor-graph -- --map-id 4 --from-ref 40a --to-ref 23
`);
}

function parseArgs(argv: string[]) {
  const options = {
    mapId: null as number | null,
    dataDir: defaultDataDir(),
    longJumpThresholdMeters: 150,
    fromRef: undefined as string | undefined,
    toRef: undefined as string | undefined,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--map-id": {
        const value = Number(argv[++index]);
        if (!Number.isInteger(value) || value < 1) {
          throw new Error(`Invalid map id: ${argv[index] ?? "(missing)"}`);
        }
        options.mapId = value;
        break;
      }
      case "--data-dir":
        options.dataDir = resolve(argv[++index] ?? "");
        break;
      case "--long-jump-m": {
        const value = Number(argv[++index]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`Invalid long jump threshold: ${argv[index] ?? "(missing)"}`);
        }
        options.longJumpThresholdMeters = value;
        break;
      }
      case "--from-ref":
        options.fromRef = argv[++index]?.trim();
        break;
      case "--to-ref":
        options.toRef = argv[++index]?.trim();
        break;
      case "--json":
        options.json = true;
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

  const mapId = options.mapId;
  if (mapId === null) {
    throw new Error("Missing required --map-id");
  }

  return { ...options, mapId };
}

function toMapPointRecord(row: {
  id: number;
  map_id: number;
  ref: string | null;
  name: string | null;
  category: string;
  node_role: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  elevation_source: string | null;
  description: string | null;
  parent_ref: string | null;
  sort_order: number;
  image_x: number | null;
  image_y: number | null;
  metadata: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}): MapPointRecord {
  return {
    id: row.id,
    mapId: row.map_id,
    ref: row.ref,
    name: row.name,
    category: row.category as MapPointRecord["category"],
    nodeRole: row.node_role as MapPointRecord["nodeRole"],
    latitude: row.latitude,
    longitude: row.longitude,
    elevation: row.elevation,
    elevationSource: row.elevation_source as MapPointRecord["elevationSource"],
    description: row.description,
    parentRef: row.parent_ref,
    sortOrder: row.sort_order,
    imageX: row.image_x,
    imageY: row.image_y,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNeighborRecord(row: {
  id: number;
  map_id: number;
  from_marker_id: number;
  to_marker_id: number;
  created_at: string;
  updated_at: string;
}): MarkerNeighborRecord {
  return {
    id: row.id,
    mapId: row.map_id,
    fromMarkerId: row.from_marker_id,
    toMarkerId: row.to_marker_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = new PGlite(options.dataDir, { extensions: { postgis } });
  await db.waitReady;

  const mapRows = await db.query<{ id: number }>("SELECT id FROM map WHERE id = $1 LIMIT 1", [
    options.mapId,
  ]);
  if (mapRows.rows.length === 0) {
    throw new Error(`Map ${options.mapId} not found in ${options.dataDir}`);
  }

  const pointRows = await db.query<{
    id: number;
    map_id: number;
    ref: string | null;
    name: string | null;
    category: string;
    node_role: string | null;
    longitude: number;
    latitude: number;
    elevation: number | null;
    elevation_source: string | null;
    description: string | null;
    parent_ref: string | null;
    sort_order: number;
    image_x: number | null;
    image_y: number | null;
    metadata: Record<string, string> | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, map_id, ref, name, category, node_role,
            ST_X(location::geometry) AS longitude,
            ST_Y(location::geometry) AS latitude,
            elevation, elevation_source, description, parent_ref,
            sort_order, image_x, image_y, metadata,
            created_at, updated_at
     FROM map_point
     WHERE map_id = $1
     ORDER BY id`,
    [options.mapId],
  );

  const neighborRows = await db.query<{
    id: number;
    map_id: number;
    from_marker_id: number;
    to_marker_id: number;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, map_id, from_marker_id, to_marker_id, created_at, updated_at
     FROM marker_neighbor
     WHERE map_id = $1
     ORDER BY from_marker_id, to_marker_id`,
    [options.mapId],
  );

  const mapPoints = pointRows.rows.map(toMapPointRecord);
  const neighbors = neighborRows.rows.map(toNeighborRecord);
  const result = auditNeighborGraph({
    mapId: options.mapId,
    mapPoints,
    neighbors,
    longJumpThresholdMeters: options.longJumpThresholdMeters,
    fromRef: options.fromRef,
    toRef: options.toRef,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatNeighborGraphAuditReport(result));
  if (
    result.isolated.length === 0 &&
    result.longJumps.length === 0 &&
    result.components.length <= 1
  ) {
    console.log("\nNo obvious broken links detected.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
