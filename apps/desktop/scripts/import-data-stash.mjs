import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultStashPath = join(
  scriptDir,
  "..",
  "..",
  "web",
  "scripts",
  "data",
  "karura-pglite-stash.json",
);

function defaultDataDir() {
  return process.env.DESKTOP_PGLITE_DIR ?? join(homedir(), ".config", "desktop", "pglite");
}

function printUsage() {
  console.log(`Import map workspace + control points from a PGLite stash into desktop PGlite.

Usage:
  pnpm --filter desktop db:import-stash [options]

Options:
  --stash <path>                 JSON stash file
                                 (default: apps/web/scripts/data/karura-pglite-stash.json)
  --target-map-id <n>            Desktop map row to update (alias: --map-id)
  --map-id <n>                   Same as --target-map-id
                                 (default: stash sourceMapId, usually 1 — pass your desktop map id)
  --data-dir <path>              Desktop PGlite directory
                                 (default: ~/.config/desktop/pglite)
  --replace-control-points       Delete existing control points for the map before import
  --update-map                   Apply map viewport + PDF transform fields from stash
  --dry-run                      Print actions without writing
  --help                         Show this help
`);
}

function parseArgs(argv) {
  const options = {
    stashPath: defaultStashPath,
    mapId: null,
    dataDir: defaultDataDir(),
    replaceControlPoints: false,
    updateMap: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--stash":
        options.stashPath = resolve(argv[++index] ?? "");
        break;
      case "--target-map-id":
      case "--map-id": {
        const raw = argv[++index];
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1) {
          throw new Error(`Invalid target map id: ${raw ?? "(missing)"}`);
        }
        options.mapId = value;
        break;
      }
      case "--data-dir":
        options.dataDir = resolve(argv[++index] ?? "");
        break;
      case "--replace-control-points":
        options.replaceControlPoints = true;
        break;
      case "--update-map":
        options.updateMap = true;
        break;
      case "--dry-run":
        options.dryRun = true;
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

function loadStash(stashPath) {
  const raw = readFileSync(stashPath, "utf8");
  const stash = JSON.parse(raw);

  if (!stash.map || !Array.isArray(stash.controlPoints)) {
    throw new Error("Stash must include `map` and `controlPoints`.");
  }

  return stash;
}

async function formatAvailableMapsHint(pg) {
  const maps = await pg.query(`SELECT id, name FROM map ORDER BY id`);
  if (maps.rows.length === 0) {
    return "No maps in desktop PGlite. Create/open a map in the app first.";
  }
  const lines = maps.rows.map((row) => `  id ${row.id}: ${row.name}`);
  return `Maps in desktop PGlite:\n${lines.join("\n")}\nUse --target-map-id <id> to import stash data into that row.`;
}

async function importStash(options, stash) {
  const stashSourceMapId = stash.sourceMapId ?? 1;
  const targetMapId = options.mapId ?? stashSourceMapId;
  const sortedPoints = [...stash.controlPoints].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  const pg = new PGlite({
    dataDir: options.dataDir,
    extensions: { postgis },
  });
  await pg.waitReady;

  try {
    const existingMap = await pg.query(`SELECT id, name FROM map WHERE id = $1 LIMIT 1`, [
      targetMapId,
    ]);
    if (existingMap.rows.length === 0) {
      const hint = await formatAvailableMapsHint(pg);
      throw new Error(`Map id ${targetMapId} not found in desktop PGlite.\n${hint}`);
    }

    const existingCount = await pg.query(
      `SELECT count(*)::int AS count FROM control_point WHERE map_id = $1`,
      [targetMapId],
    );

    console.log(`Data dir: ${options.dataDir}`);
    console.log(`Stash sourceMapId: ${stashSourceMapId} → desktop map id: ${targetMapId}`);
    console.log(`Target map: ${existingMap.rows[0].id} — ${existingMap.rows[0].name}`);
    console.log(`Existing control points: ${existingCount.rows[0].count}`);
    console.log(`Importing control points: ${sortedPoints.length}`);
    console.log(`Update map fields: ${options.updateMap ? "yes" : "no"}`);

    if (options.dryRun) {
      console.log("Dry run — no database writes.");
      return;
    }

    await pg.query("BEGIN");

    try {
      if (options.replaceControlPoints) {
        await pg.query(`DELETE FROM control_point WHERE map_id = $1`, [targetMapId]);
      } else if (Number(existingCount.rows[0].count) > 0) {
        throw new Error(
          `Map ${targetMapId} already has ${existingCount.rows[0].count} control points. Pass --replace-control-points to replace them.`,
        );
      }

      if (options.updateMap) {
        const map = stash.map;
        await pg.query(
          `
            UPDATE map
            SET
              location_query = $2,
              map_center_lat = $3,
              map_center_lng = $4,
              map_zoom = $5,
              base_map_style = $6,
              pdf_scale = $7,
              pdf_rotation = $8,
              pdf_pan_x = $9,
              pdf_pan_y = $10,
              pdf_file_name = COALESCE($11, pdf_file_name),
              pdf_page_count = COALESCE($12, pdf_page_count),
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            targetMapId,
            map.locationQuery || null,
            map.mapCenterLat,
            map.mapCenterLng,
            map.mapZoom,
            map.baseMapStyle,
            map.pdfScale,
            map.pdfRotation,
            map.pdfPanX,
            map.pdfPanY,
            map.pdfFileName ?? null,
            map.pdfPageCount ?? null,
          ],
        );
      }

      for (const point of sortedPoints) {
        await pg.query(
          `
            INSERT INTO control_point (
              map_id,
              label,
              image_x,
              image_y,
              location,
              created_at
            )
            VALUES (
              $1,
              NULL,
              $2,
              $3,
              ST_SetSRID(ST_MakePoint($4, $5), 4326),
              $6
            )
          `,
          [
            targetMapId,
            point.imageX,
            point.imageY,
            point.longitude,
            point.latitude,
            point.createdAt ?? new Date().toISOString(),
          ],
        );
      }

      await pg.query("COMMIT");
      console.log(`Imported ${sortedPoints.length} control points into map ${targetMapId}.`);
      console.log(`Open the desktop app workspace for map ${targetMapId} to review markers.`);
    } catch (error) {
      await pg.query("ROLLBACK");
      throw error;
    }
  } finally {
    await pg.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const stash = loadStash(options.stashPath);
  await importStash(options, stash);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
