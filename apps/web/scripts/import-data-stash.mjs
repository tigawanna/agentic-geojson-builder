import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultStashPath = join(scriptDir, "data", "karura-pglite-stash.json");

function printUsage() {
  console.log(`Import PGLite stash (map workspace + control points) into Postgres.

Usage:
  pnpm --filter web db:import-stash -- --owner-id <user-id> [options]

Required:
  --owner-id <id>     Better Auth user id that should own the map

Options:
  --stash <path>      JSON stash file (default: scripts/data/karura-pglite-stash.json)
  --map-id <n>        Preserve map id (default: sourceMapId from stash, usually 1)
  --pdf <path>        Optional PDF file to store in map.pdf_data
  --replace           Delete existing map with the target id before import
  --dry-run           Print actions without writing
  --list-users        Print user ids/emails and exit

Environment:
  DATABASE_URL        Postgres connection string (loaded from apps/web/.env via dotenv)
`);
}

function parseArgs(argv) {
  const options = {
    ownerId: process.env.OWNER_ID ?? null,
    stashPath: defaultStashPath,
    mapId: null,
    pdfPath: null,
    replace: false,
    dryRun: false,
    listUsers: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--owner-id":
        options.ownerId = argv[++index] ?? null;
        break;
      case "--stash":
        options.stashPath = resolve(argv[++index] ?? "");
        break;
      case "--map-id":
        options.mapId = Number(argv[++index]);
        break;
      case "--pdf":
        options.pdfPath = resolve(argv[++index] ?? "");
        break;
      case "--replace":
        options.replace = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--list-users":
        options.listUsers = true;
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

async function listUsers(client) {
  const result = await client.query(`SELECT id, email, name FROM "user" ORDER BY created_at ASC`);
  if (result.rows.length === 0) {
    console.log("No users found. Sign in once so Better Auth creates your user row.");
    return;
  }

  console.log("Users:");
  for (const row of result.rows) {
    console.log(`  ${row.id}  ${row.email}  (${row.name})`);
  }
}

async function assertOwnerExists(client, ownerId) {
  const result = await client.query(`SELECT id, email FROM "user" WHERE id = $1 LIMIT 1`, [
    ownerId,
  ]);
  if (result.rows.length === 0) {
    throw new Error(
      `Owner id "${ownerId}" not found in "user" table. Run with --list-users after signing in once.`,
    );
  }
  return result.rows[0];
}

async function importStash(client, options, stash) {
  const targetMapId = options.mapId ?? stash.sourceMapId ?? 1;
  const owner = await assertOwnerExists(client, options.ownerId);
  const sortedPoints = [...stash.controlPoints].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  let pdfBuffer = null;
  if (options.pdfPath) {
    if (!existsSync(options.pdfPath)) {
      throw new Error(`PDF not found: ${options.pdfPath}`);
    }
    pdfBuffer = readFileSync(options.pdfPath);
  }

  console.log(`Owner: ${owner.email} (${owner.id})`);
  console.log(`Target map id: ${targetMapId}`);
  console.log(`Control points: ${sortedPoints.length}`);
  console.log(
    `PDF file: ${options.pdfPath ? options.pdfPath : "(metadata only — re-upload in UI if needed)"}`,
  );

  if (options.dryRun) {
    console.log("Dry run — no database writes.");
    return;
  }

  await client.query("BEGIN");

  try {
    if (options.replace) {
      await client.query(`DELETE FROM map WHERE id = $1`, [targetMapId]);
    }

    const existingMap = await client.query(`SELECT id FROM map WHERE id = $1 LIMIT 1`, [
      targetMapId,
    ]);
    if (existingMap.rows.length > 0) {
      throw new Error(
        `Map id ${targetMapId} already exists. Pass --replace to delete it first, or omit --map-id to allocate a new id.`,
      );
    }

    const map = stash.map;
    const mapInsert = await client.query(
      `
        INSERT INTO map (
          id,
          owner_id,
          name,
          location_query,
          map_center_lat,
          map_center_lng,
          map_zoom,
          base_map_style,
          pdf_scale,
          pdf_rotation,
          pdf_pan_x,
          pdf_pan_y,
          pdf_file_name,
          pdf_data,
          pdf_page_count,
          updated_at
        )
        OVERRIDING SYSTEM VALUE
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
        )
        RETURNING id
      `,
      [
        targetMapId,
        options.ownerId,
        map.name,
        map.locationQuery || null,
        map.mapCenterLat,
        map.mapCenterLng,
        map.mapZoom,
        map.baseMapStyle,
        map.pdfScale,
        map.pdfRotation,
        map.pdfPanX,
        map.pdfPanY,
        map.pdfFileName,
        pdfBuffer,
        map.pdfPageCount,
      ],
    );

    const mapId = mapInsert.rows[0].id;

    for (const point of sortedPoints) {
      await client.query(
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
        [mapId, point.imageX, point.imageY, point.longitude, point.latitude, point.createdAt],
      );
    }

    await client.query(
      `SELECT setval(pg_get_serial_sequence('map', 'id'), GREATEST((SELECT MAX(id) FROM map), 1))`,
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('control_point', 'id'), GREATEST((SELECT MAX(id) FROM control_point), 1))`,
    );

    await client.query("COMMIT");

    console.log(`Imported map ${mapId} with ${sortedPoints.length} control points.`);
    console.log(`Open: /maps/${mapId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (set it in apps/web/.env).");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    if (options.listUsers) {
      await listUsers(client);
      return;
    }

    if (!options.ownerId) {
      printUsage();
      throw new Error(
        "--owner-id is required (or set OWNER_ID). Use --list-users to find your id.",
      );
    }

    const stash = loadStash(options.stashPath);
    await importStash(client, options, stash);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
