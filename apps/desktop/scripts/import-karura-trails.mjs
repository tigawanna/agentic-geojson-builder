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
  "..",
  "map-data",
  "geojson",
  "karura-trailfork-pglite-stash.json",
);

function defaultDataDir() {
  return process.env.DESKTOP_PGLITE_DIR ?? join(homedir(), ".config", "desktop", "pglite");
}

function printUsage() {
  console.log(`Import unified Trailfork trails into desktop PGlite karura_trails table.

Usage:
  pnpm --filter desktop db:import-karura-trails [options]

Options:
  --stash <path>       pgLite stash JSON from trailfork-to-geojson.mjs
                       (default: map-data/geojson/karura-trailfork-pglite-stash.json)
  --data-dir <path>    Desktop PGlite directory (default: ~/.config/desktop/pglite)
  --replace            Delete existing karura_trails rows before import
  --dry-run            Print actions without writing
  --help               Show this help
`);
}

function parseArgs(argv) {
  const options = {
    stashPath: defaultStashPath,
    dataDir: defaultDataDir(),
    replace: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--stash":
        options.stashPath = resolve(argv[++index] ?? "");
        break;
      case "--data-dir":
        options.dataDir = resolve(argv[++index] ?? "");
        break;
      case "--replace":
        options.replace = true;
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

  if (!Array.isArray(stash.trails)) {
    throw new Error("Stash must include a `trails` array.");
  }

  return stash;
}

function assertLineString(geometry) {
  if (geometry?.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    throw new Error("Each trail must include a LineString geometry.");
  }

  if (geometry.coordinates.length < 2) {
    throw new Error("LineString geometry must include at least two coordinates.");
  }
}

async function importTrails(options, stash) {
  const pg = new PGlite({
    dataDir: options.dataDir,
    extensions: { postgis },
  });
  await pg.waitReady;

  try {
    const existingCount = await pg.query(`SELECT count(*)::int AS count FROM karura_trails`);

    console.log(`Data dir: ${options.dataDir}`);
    console.log(`Stash trails: ${stash.trails.length}`);
    console.log(`Existing karura_trails rows: ${existingCount.rows[0].count}`);
    console.log(`Replace existing rows: ${options.replace ? "yes" : "no"}`);

    if (options.dryRun) {
      console.log("Dry run — no database writes.");
      return;
    }

    await pg.query("BEGIN");

    try {
      if (options.replace) {
        await pg.query(`DELETE FROM karura_trails`);
      } else if (Number(existingCount.rows[0].count) > 0) {
        throw new Error(
          `karura_trails already has ${existingCount.rows[0].count} row(s). Pass --replace to replace them.`,
        );
      }

      for (const trail of stash.trails) {
        assertLineString(trail.geometry);

        await pg.query(
          `
            INSERT INTO karura_trails (
              slug,
              trailfork_id,
              name,
              source,
              geometry_source,
              properties,
              geometry_json,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), NOW())
          `,
          [
            trail.slug,
            trail.trailforkId ?? null,
            trail.name,
            trail.source ?? "trailfork",
            trail.geometrySource,
            JSON.stringify(trail.properties),
            JSON.stringify(trail.geometry),
          ],
        );
      }

      await pg.query("COMMIT");
      console.log(`Imported ${stash.trails.length} trail(s) into karura_trails.`);
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
  await importTrails(options, stash);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
